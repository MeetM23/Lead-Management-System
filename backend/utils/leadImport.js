// Reading and checking spreadsheet files for the lead import. Pure functions: no database access here.
// Files are read from memory and never written to disk. Formulas are never evaluated (only the values saved in the file are read).
import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
import AppError from "./AppError.js";
import { normalizeEmail, normalizePhone, cleanPhone } from "./normalize.js";
import { EMAIL_PATTERN } from "../constants/index.js";

const MAX_COLUMNS = 100;
const MAX_HEADER_LENGTH = 100;
const MAX_CELL_LENGTH = 1000;
const SAMPLE_ROWS = 5;
const MAX_REPORTED = 200; // row errors / duplicates listed in a response; the counts are always complete

// Lead fields a column can be mapped to. Anything else (IDs, creator, assignee, role, dates) can never be imported.
const IMPORT_FIELDS = Object.freeze([
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "state", label: "State", required: false },
  { key: "source", label: "Source", required: false },
]);
const FIELD_KEYS = IMPORT_FIELDS.map((field) => field.key);
const CUSTOM_FIELD = "customField"; // keep the column's values in the lead's customFields
const IGNORE = "ignore"; // drop the column
const TARGETS = [...FIELD_KEYS, CUSTOM_FIELD, IGNORE];

/* =========================
   READING THE FILE
========================= */

const XLSX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK": an .xlsx file is a zip archive

const extensionOf = (fileName) => {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName ?? "");
  return match ? match[1].toLowerCase() : "";
};

// Cell value -> trimmed text. Numbers and dates become text; empty cells become "".
const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const iso = value.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).trim();
};

const readRows = async (file, maxRows) => {
  const extension = extensionOf(file.originalname);

  if (extension === "xls") {
    throw new AppError("Old .xls files are not supported. Open the file in Excel and save it as .xlsx or .csv, then upload it again.", 400);
  }

  if (extension === "xlsx") {
    if (!file.buffer.subarray(0, 4).equals(XLSX_SIGNATURE)) throw new AppError("This file is not a valid .xlsx workbook", 400);
    try {
      return await readSheet(file.buffer);
    } catch {
      throw new AppError("The Excel file could not be read. It may be damaged or password-protected.", 400);
    }
  }

  if (extension === "csv") {
    if (file.buffer.subarray(0, 8192).includes(0)) throw new AppError("This file is not a text CSV file", 400);
    try {
      // The delimiter is detected from the first line; ragged rows are allowed
      return parseCsv(file.buffer, {
        bom: true,
        delimiter: [",", ";", "\t"],
        relax_column_count: true,
        to: maxRows + 2, // header + rows + one extra, to detect a file that is over the limit
      });
    } catch {
      throw new AppError("The CSV file is malformed (check quotes and line breaks)", 400);
    }
  }

  throw new AppError("Unsupported file type. Upload a .xlsx or .csv file.", 400);
};

// Makes header names unique and non-empty: "", "Phone", "Phone" -> "Column 1", "Phone", "Phone (2)"
const cleanHeaders = (cells) => {
  const seen = new Map();
  return cells.map((cell, index) => {
    const base = (cellText(cell) || `Column ${index + 1}`).slice(0, MAX_HEADER_LENGTH);
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
};

// Returns { headers: string[], rows: [{ rowNumber, cells: string[] }] } for the first sheet of the file.
// rowNumber is the row's position in the file (the header is row 1). Empty rows are dropped.
export const parseSpreadsheet = async (file, { maxRows }) => {
  if (!file) throw new AppError("Please upload a file", 400);
  if (file.size === 0) throw new AppError("The file is empty", 400);

  const raw = await readRows(file, maxRows);
  const headerIndex = raw.findIndex((row) => row.some((cell) => cellText(cell) !== ""));
  if (headerIndex === -1) throw new AppError("The file is empty", 400);

  const width = raw[headerIndex].length;
  if (width > MAX_COLUMNS) throw new AppError(`The file has more than ${MAX_COLUMNS} columns`, 400);
  const headers = cleanHeaders(raw[headerIndex]);

  const rows = [];
  for (let index = headerIndex + 1; index < raw.length; index++) {
    const cells = headers.map((_, column) => cellText(raw[index][column]));
    if (cells.every((cell) => cell === "")) continue;
    rows.push({ rowNumber: index + 1, cells });
    if (rows.length > maxRows) throw new AppError(`The file has more than ${maxRows} rows. Split it into smaller files.`, 400);
  }
  if (rows.length === 0) throw new AppError("The file has a header row but no data rows", 400);

  return { headers, rows };
};

/* =========================
   COLUMN MAPPING
========================= */

// Header spellings (lowercase letters and digits only) that suggest a field
const SYNONYMS = {
  name: ["name", "fullname", "leadname", "customername", "clientname", "contactname", "applicantname", "person", "contactperson"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "mobileno", "phoneno", "contactnumber", "contactno", "cell", "cellphone", "telephone", "tel", "whatsapp", "whatsappnumber"],
  email: ["email", "emailaddress", "emailid", "mail", "mailid", "workemail"],
  state: ["state", "statename", "province"],
  source: ["source", "leadsource", "channel", "origin", "formname", "campaign", "platform"],
};

// { columnIndex: field } for columns whose header looks like a lead field. Each field is suggested once.
export const suggestMapping = (headers) => {
  const suggestion = {};
  const taken = new Set();
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    const field = FIELD_KEYS.find((key) => SYNONYMS[key].includes(normalized));
    if (field && !taken.has(field)) {
      suggestion[index] = field;
      taken.add(field);
    }
  });
  return suggestion;
};

// Checks the mapping sent by the client (a JSON string of { columnIndex: target }).
// Columns that are not listed keep their values in customFields. Returns an array with one target per column.
export const parseMapping = (raw, columnCount) => {
  let input;
  try {
    input = typeof raw === "string" ? JSON.parse(raw) : undefined;
  } catch {
    input = undefined;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("Invalid column mapping", 400);

  const targets = Array(columnCount).fill(CUSTOM_FIELD);
  const used = new Set();
  for (const [key, target] of Object.entries(input)) {
    const column = /^\d{1,3}$/.test(key) ? Number(key) : -1;
    if (column < 0 || column >= columnCount) throw new AppError(`Invalid column mapping: unknown column ${key}`, 400);
    if (typeof target !== "string" || !TARGETS.includes(target)) throw new AppError("Invalid column mapping: unknown destination field", 400);
    if (FIELD_KEYS.includes(target)) {
      if (used.has(target)) throw new AppError(`Invalid column mapping: more than one column is mapped to ${target}`, 400);
      used.add(target);
    }
    targets[column] = target;
  }

  const missing = IMPORT_FIELDS.filter((field) => field.required && !used.has(field.key));
  if (missing.length > 0) {
    throw new AppError(`Map a column to the required field: ${missing.map((field) => field.label).join(", ")}`, 400);
  }
  return targets;
};

/* =========================
   ROW CHECKS
========================= */

// Builds the lead fields, the customFields and the problems for one row.
// Only the whitelisted fields are copied; a column named "leadId" or "assignedTo" is just custom data.
const checkRow = ({ rowNumber, cells }, targets, headers) => {
  const fields = {};
  const customFields = {};
  const errors = [];

  cells.forEach((value, column) => {
    const target = targets[column];
    if (value === "" || target === IGNORE) return;
    if (target === CUSTOM_FIELD) {
      if (value.length > MAX_CELL_LENGTH) errors.push(`"${headers[column]}" is longer than ${MAX_CELL_LENGTH} characters`);
      else Object.defineProperty(customFields, headers[column], { value, enumerable: true, writable: true, configurable: true });
    } else {
      fields[target] = value;
    }
  });

  if (!fields.name) errors.push("Name is required");
  else if (fields.name.length > 255) errors.push("Name is longer than 255 characters");

  if (fields.email && (fields.email.length > 255 || !EMAIL_PATTERN.test(fields.email))) errors.push(`Invalid email: ${fields.email.slice(0, 60)}`);
  if (fields.phone) fields.phone = cleanPhone(fields.phone); // "p:+9175..." -> "+9175..."
  if (fields.phone && fields.phone.length > 50) errors.push("Phone is longer than 50 characters");
  if (fields.state && fields.state.length > 100) errors.push("State is longer than 100 characters");
  if (fields.source && fields.source.length > 100) errors.push("Source is longer than 100 characters");

  return { rowNumber, fields, customFields, errors, duplicateReasons: [] };
};

export const buildImportRows = ({ headers, rows }, targets) => rows.map((row) => checkRow(row, targets, headers));

// The emails and phone keys of the valid rows, for looking up existing leads
export const collectLookupKeys = (items) => {
  const emails = new Set();
  const phones = new Set();
  for (const item of items) {
    if (item.errors.length > 0) continue;
    if (item.fields.email) emails.add(normalizeEmail(item.fields.email));
    if (normalizePhone(item.fields.phone)) phones.add(normalizePhone(item.fields.phone));
  }
  return { emails: [...emails], phones: [...phones] };
};

// Fills `duplicateReasons` on rows that repeat an earlier row of the file or match an existing lead.
// `existing` is [{ leadId, email, phoneKey, visible }]; `visible` is false for leads the user may not see (no ID is shown).
// The name alone never makes a row a duplicate.
export const markDuplicates = (items, existing) => {
  const byEmail = new Map();
  const byPhone = new Map();
  for (const lead of existing) {
    if (lead.email) byEmail.set(lead.email, [...(byEmail.get(lead.email) ?? []), lead]);
    if (lead.phoneKey) byPhone.set(lead.phoneKey, [...(byPhone.get(lead.phoneKey) ?? []), lead]);
  }
  const describe = (lead) => (lead.visible ? `existing lead ${lead.leadId}` : "an existing lead");

  const firstEmail = new Map();
  const firstPhone = new Map();
  for (const item of items) {
    if (item.errors.length > 0) continue;
    const email = normalizeEmail(item.fields.email);
    const phone = normalizePhone(item.fields.phone);

    if (email) {
      if (firstEmail.has(email)) item.duplicateReasons.push(`Same email as row ${firstEmail.get(email)} in this file`);
      else firstEmail.set(email, item.rowNumber);
      for (const lead of byEmail.get(email) ?? []) item.duplicateReasons.push(`Same email as ${describe(lead)}`);
    }
    if (phone) {
      if (firstPhone.has(phone)) item.duplicateReasons.push(`Same phone as row ${firstPhone.get(phone)} in this file`);
      else firstPhone.set(phone, item.rowNumber);
      for (const lead of byPhone.get(phone) ?? []) item.duplicateReasons.push(`Same phone as ${describe(lead)}`);
    }
  }
};

/* =========================
   RESPONSE SHAPES
========================= */

export const describePreview = ({ headers, rows }, fileName) => ({
  fileName,
  headers: headers.map((name, index) => ({ index, name })),
  sampleRows: rows.slice(0, SAMPLE_ROWS).map((row) => row.cells),
  totalRows: rows.length,
  suggestedMapping: suggestMapping(headers),
  fields: IMPORT_FIELDS,
});

export const summarize = (items) => {
  const invalid = items.filter((item) => item.errors.length > 0);
  const duplicates = items.filter((item) => item.errors.length === 0 && item.duplicateReasons.length > 0);
  return {
    totalRows: items.length,
    validRows: items.length - invalid.length,
    invalidRows: invalid.length,
    duplicateRows: duplicates.length,
    errors: invalid.slice(0, MAX_REPORTED).map((item) => ({ row: item.rowNumber, messages: item.errors })),
    duplicates: duplicates.slice(0, MAX_REPORTED).map((item) => ({ row: item.rowNumber, name: item.fields.name, reasons: item.duplicateReasons })),
    listsTruncated: invalid.length > MAX_REPORTED || duplicates.length > MAX_REPORTED,
  };
};
