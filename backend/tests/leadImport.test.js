import { describe, test, mock, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import Lead from "../models/Lead.js";
import leadRoutes from "../routes/leadRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { parseSpreadsheet, suggestMapping, parseMapping, buildImportRows, markDuplicates, collectLookupKeys, summarize } from "../utils/leadImport.js";
import { getImportLimits, getImportLimitsProblem } from "../config/env.js";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";
import { makeXlsx } from "./helpers/makeXlsx.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in (users, a lead ID counter, and a
// leads list with a rollback-capable transaction). The SQL itself (phone matching, bulk insert) is checked
// against real MariaDB only by the separate script described in the final report, not by this file.

const LIMITS = { maxRows: 100 };
const csvFile = (text, name = "leads.csv") => ({ originalname: name, buffer: Buffer.from(text), size: Buffer.byteLength(text) });
const xlsxFile = (rows, name = "leads.xlsx") => {
  const buffer = makeXlsx(rows);
  return { originalname: name, buffer, size: buffer.length };
};
const assertRejects = (promise, pattern) => assert.rejects(promise, (error) => error.statusCode === 400 && pattern.test(error.message));

/* =========================
   FILE PARSING
========================= */

describe("reading files", () => {
  test(".xlsx: headers, rows, numbers as text, and row numbers", async () => {
    const sheet = await parseSpreadsheet(xlsxFile([["full_name", "phone"], ["Asha", 9876543210], [], ["Ravi", "98765 00000"]]), LIMITS);
    assert.deepEqual(sheet.headers, ["full_name", "phone"]);
    assert.deepEqual(sheet.rows, [{ rowNumber: 2, cells: ["Asha", "9876543210"] }, { rowNumber: 4, cells: ["Ravi", "98765 00000"] }]);
  });

  test(".xlsx formulas are not evaluated: only the saved value is read", async () => {
    const sheet = await parseSpreadsheet(xlsxFile([["name"], [{ formula: "HYPERLINK(\"http://evil\",\"x\")", value: "Saved Name" }]]), LIMITS);
    assert.equal(sheet.rows[0].cells[0], "Saved Name");
  });

  test(".csv: comma, semicolon and tab delimiters, quotes, BOM and ragged rows", async () => {
    const comma = await parseSpreadsheet(csvFile('﻿name,notes\n"Doe, Jane","said ""hi"""\nRavi\n'), LIMITS);
    assert.deepEqual(comma.headers, ["name", "notes"]);
    assert.deepEqual(comma.rows.map((row) => row.cells), [["Doe, Jane", 'said "hi"'], ["Ravi", ""]]);

    assert.deepEqual((await parseSpreadsheet(csvFile("name;phone\nAsha;123"), LIMITS)).rows[0].cells, ["Asha", "123"]);
    assert.deepEqual((await parseSpreadsheet(csvFile("name\tphone\nAsha\t123"), LIMITS)).rows[0].cells, ["Asha", "123"]);
  });

  test("blank and repeated header names are made unique", async () => {
    const sheet = await parseSpreadsheet(csvFile("name,,name\nA,b,c"), LIMITS);
    assert.deepEqual(sheet.headers, ["name", "Column 2", "name (2)"]);
  });

  test(".xls is refused with a clear message, and other types are unsupported", async () => {
    await assertRejects(parseSpreadsheet({ originalname: "old.xls", buffer: Buffer.from("x"), size: 1 }, LIMITS), /\.xls files are not supported.*\.xlsx or \.csv/);
    await assertRejects(parseSpreadsheet({ originalname: "a.exe", buffer: Buffer.from("x"), size: 1 }, LIMITS), /Unsupported file type/);
    await assertRejects(parseSpreadsheet({ originalname: "noextension", buffer: Buffer.from("x"), size: 1 }, LIMITS), /Unsupported file type/);
  });

  test("malformed, fake and empty files are rejected", async () => {
    await assertRejects(parseSpreadsheet({ originalname: "fake.xlsx", buffer: Buffer.from("name,phone\nA,1"), size: 14 }, LIMITS), /not a valid \.xlsx/);
    const damaged = makeXlsx([["a"], ["b"]]).subarray(0, 40);
    await assertRejects(parseSpreadsheet({ originalname: "cut.xlsx", buffer: damaged, size: damaged.length }, LIMITS), /could not be read/);
    await assertRejects(parseSpreadsheet({ originalname: "bin.csv", buffer: Buffer.from([0x4d, 0x5a, 0, 0, 1, 2]), size: 6 }, LIMITS), /not a text CSV/);
    await assertRejects(parseSpreadsheet(csvFile('name\n"unclosed'), LIMITS), /malformed/);
    await assertRejects(parseSpreadsheet(csvFile(""), LIMITS), /empty/);
    await assertRejects(parseSpreadsheet(csvFile("name,phone\n"), LIMITS), /no data rows/);
    await assertRejects(parseSpreadsheet(undefined, LIMITS), /upload a file/);
  });

  test("a file over the row limit is rejected; one at the limit is accepted", async () => {
    const body = (count) => "name\n" + Array.from({ length: count }, (_, i) => `Lead ${i}`).join("\n");
    assert.equal((await parseSpreadsheet(csvFile(body(100)), LIMITS)).rows.length, 100);
    await assertRejects(parseSpreadsheet(csvFile(body(101)), LIMITS), /more than 100 rows/);
    await assertRejects(parseSpreadsheet(xlsxFile([["name"], ...Array.from({ length: 101 }, (_, i) => [`L${i}`])]), LIMITS), /more than 100 rows/);
  });

  test("a file with too many columns is rejected", async () => {
    await assertRejects(parseSpreadsheet(csvFile(Array(101).fill("c").join(",") + "\n" + Array(101).fill("v").join(",")), LIMITS), /more than 100 columns/);
  });
});

describe("import limits", () => {
  test("defaults, overrides and invalid values", () => {
    assert.deepEqual(getImportLimits({}), { maxFileBytes: 5 * 1024 * 1024, maxRows: 5000 });
    assert.deepEqual(getImportLimits({ IMPORT_MAX_FILE_MB: "2", IMPORT_MAX_ROWS: "10" }), { maxFileBytes: 2 * 1024 * 1024, maxRows: 10 });
    assert.equal(getImportLimitsProblem({}), null);
    for (const bad of [{ IMPORT_MAX_ROWS: "0" }, { IMPORT_MAX_ROWS: "abc" }, { IMPORT_MAX_FILE_MB: "-1" }, { IMPORT_MAX_FILE_MB: "9999" }, { IMPORT_MAX_ROWS: "1e9" }]) {
      assert.match(getImportLimitsProblem(bad), /must be a whole number/);
    }
  });
});

/* =========================
   MAPPING
========================= */

describe("column mapping", () => {
  test("suggests fields for common header spellings, each field once", () => {
    assert.deepEqual(suggestMapping(["Full Name", "Mobile No.", "E-mail", "Lead Source", "Stage", "Priority"]), { 0: "name", 1: "phone", 2: "email", 3: "source", 5: "priority" });
    assert.deepEqual(suggestMapping(["form_name", "loan_requirement", "full_name", "phone", "email", "address"]), { 0: "source", 2: "name", 3: "phone", 4: "email" });
    assert.deepEqual(suggestMapping(["name", "Name "]), { 0: "name" }); // a second "name" is not suggested again
    assert.deepEqual(suggestMapping(["foo", "bar"]), {});
  });

  test("accepts a valid mapping; unlisted columns default to custom fields", () => {
    assert.deepEqual(parseMapping('{"0":"name","2":"phone","3":"ignore"}', 5), ["name", "customField", "phone", "ignore", "customField"]);
  });

  test("a missing required field is explained", () => {
    assert.throws(() => parseMapping('{"1":"phone"}', 3), (error) => error.statusCode === 400 && /required field: Name/.test(error.message));
    assert.throws(() => parseMapping('{"0":"customField"}', 3), /required field: Name/);
  });

  test("invalid mappings are rejected: protected fields, unknown columns, duplicates, bad JSON", () => {
    const bad = [
      '{"0":"name","1":"leadId"}',
      '{"0":"name","1":"assignedTo"}',
      '{"0":"name","1":"createdBy"}',
      '{"0":"name","1":"role"}',
      '{"0":"name","1":"employeeId"}',
      '{"0":"name","1":"_id"}',
      '{"0":"name","1":"createdAt"}',
      '{"0":"name","9":"phone"}',
      '{"0":"name","-1":"phone"}',
      '{"0":"name","x":"phone"}',
      '{"0":"name","1":"phone","2":"phone"}',
      '{"0":"name","1":5}',
      '{"0":"name","1":["phone"]}',
      '[]',
      'null',
      'not json',
      "",
    ];
    for (const raw of bad) assert.throws(() => parseMapping(raw, 3), (error) => error.statusCode === 400, raw);
    assert.throws(() => parseMapping(undefined, 3), (error) => error.statusCode === 400);
  });
});

/* =========================
   ROW CHECKS AND CUSTOM FIELDS
========================= */

const rowsFor = async (text, mapping) => {
  const sheet = await parseSpreadsheet(csvFile(text), LIMITS);
  return buildImportRows(sheet, parseMapping(JSON.stringify(mapping), sheet.headers.length));
};

describe("row checks", () => {
  test("mapped columns become lead fields; the rest are kept in customFields under their original headers", async () => {
    const [item] = await rowsFor("full_name,phone,form_name,loan_requirement,address\nAsha,98765 43210,Spring Offer,500000,\"12 Main St, Pune\"", { 0: "name", 1: "phone" });
    assert.deepEqual(item.fields, { name: "Asha", phone: "98765 43210" });
    assert.deepEqual(item.customFields, { form_name: "Spring Offer", loan_requirement: "500000", address: "12 Main St, Pune" });
    assert.deepEqual(item.errors, []);
  });

  test("blank cells are left out; ignored columns are dropped", async () => {
    const [item] = await rowsFor("name,email,note,secret\nAsha,,,hidden", { 0: "name", 1: "email", 3: "ignore" });
    assert.deepEqual(item.fields, { name: "Asha" });
    assert.deepEqual(item.customFields, {});
  });

  test("priority matches regardless of letter case; blank means default; a status column is just custom data", async () => {
    const [a, b] = await rowsFor("name,priority,status\nA,HIGH,Converted\nB,,", { 0: "name", 1: "priority" });
    assert.deepEqual(a.fields, { name: "A", priority: "High" });
    assert.deepEqual(a.customFields, { status: "Converted" });
    assert.deepEqual(b.fields, { name: "B" });
  });

  test("row problems are reported per row", async () => {
    const long = "x".repeat(256);
    const items = await rowsFor(`name,email,phone,priority,source\n,a@b.com,1,Low,Web\nBad Email,nope,1,Low,Web\nBad Prio,a@b.com,1,Urgent,Web\n${long},a@b.com,1,Low,Web\nPhone,a@b.com,${"9".repeat(51)},Low,Web\nOK,ok@b.com,12345,Low,Web`, { 0: "name", 1: "email", 2: "phone", 3: "priority", 4: "source" });
    const messages = items.map((item) => item.errors.join("; "));
    assert.match(messages[0], /Name is required/);
    assert.match(messages[1], /Invalid email/);
    assert.match(messages[2], /Invalid priority "Urgent"/);
    assert.match(messages[3], /Name is longer than 255/);
    assert.match(messages[4], /Phone is longer than 50/);
    assert.equal(messages[5], "");
  });

  test("a custom value that is too long is an error, never silently cut", async () => {
    const [item] = await rowsFor(`name,notes\nA,${"y".repeat(1001)}`, { 0: "name" });
    assert.match(item.errors[0], /"notes" is longer than 1000/);
  });

  test("columns named like protected fields only ever become custom data", async () => {
    const [item] = await rowsFor("name,leadId,assignedTo,createdBy,role,employeeId,__proto__\nAsha,LD-9999,1,1,admin,USR-1,polluted", { 0: "name" });
    assert.deepEqual(Object.keys(item.fields), ["name"]);
    assert.equal(item.customFields.leadId, "LD-9999");
    assert.equal(item.customFields.role, "admin");
    assert.equal(({}).polluted, undefined);
    assert.equal(Object.getPrototypeOf(item.customFields), Object.prototype);
    assert.equal(JSON.parse(JSON.stringify(item.customFields)).__proto__, "polluted");
  });
});

/* =========================
   DUPLICATES
========================= */

const check = async (text, existing = []) => {
  const items = await rowsFor(text, { 0: "name", 1: "phone", 2: "email" });
  markDuplicates(items, existing);
  return items;
};

describe("duplicate detection", () => {
  test("repeats inside the file are found by email and by normalized phone, with the reason", async () => {
    const items = await check("name,phone,email\nAsha,+91 98765 43210,A@Example.com\nAsha K,098765-43210,\nRavi,5550001111,a@example.COM\nMeena,,");
    assert.deepEqual(items[0].duplicateReasons, []);
    assert.deepEqual(items[1].duplicateReasons, ["Same phone as row 2 in this file"]);
    assert.deepEqual(items[2].duplicateReasons, ["Same email as row 2 in this file"]);
    assert.deepEqual(items[3].duplicateReasons, []);
  });

  test("a matching name alone is never a duplicate", async () => {
    const items = await check("name,phone,email\nAsha,1111111111,a@x.com\nAsha,2222222222,b@x.com");
    assert.deepEqual(items.map((item) => item.duplicateReasons), [[], []]);
  });

  test("short numbers are not compared", async () => {
    const items = await check("name,phone,email\nA,123,\nB,123,");
    assert.deepEqual(items.map((item) => item.duplicateReasons), [[], []]);
  });

  test("matches against existing leads name the lead only when the user may see it", async () => {
    const existing = [
      { leadId: "LD-0001", email: "a@x.com", phoneKey: "", visible: true },
      { leadId: "LD-0002", email: "", phoneKey: "9876543210", visible: false },
    ];
    const items = await check("name,phone,email\nA,,a@x.com\nB,98765 43210,", existing);
    assert.deepEqual(items[0].duplicateReasons, ["Same email as existing lead LD-0001"]);
    assert.deepEqual(items[1].duplicateReasons, ["Same phone as an existing lead"]);
    assert.equal(JSON.stringify(items).includes("LD-0002"), false);
  });

  test("invalid rows are not checked, and the summary counts are consistent", async () => {
    const items = await check("name,phone,email\nOK,1111111111,a@x.com\nBroken,1111111111,not-an-email\nAgain,1111111111,");
    assert.deepEqual(items[1].duplicateReasons, []);
    const summary = summarize(items);
    assert.deepEqual([summary.totalRows, summary.validRows, summary.invalidRows, summary.duplicateRows], [3, 2, 1, 1]);
    assert.deepEqual(summary.errors, [{ row: 3, messages: items[1].errors }]);
    assert.equal(summary.duplicates[0].row, 4);
    assert.deepEqual(collectLookupKeys(items), { emails: ["a@x.com"], phones: ["1111111111"] });
  });
});

/* =========================
   HTTP: AUTHORIZATION, ASSIGNMENT, IDS, TRANSACTIONS
========================= */

let db;
let users;
let leads; // created lead rows
let counter;
let existingLeads; // rows returned by the duplicate lookups
let failCreateManyAt; // 1-based createMany call number that should fail

const installStore = () => {
  db = installFakePrisma();
  users = [
    userRow({ id: 1, role: "admin", email: "s@example.com", employeeId: "ADM-2" }),
    userRow({ id: 2, role: "admin", email: "a@example.com", employeeId: "ADM-1" }),
    userRow({ id: 3, role: "sales", email: "emp@example.com", employeeId: "EMP-3" }),
  ];
  leads = [];
  counter = { seq: 0 };
  existingLeads = [];
  failCreateManyAt = 0;
  let createManyCalls = 0;

  db.user.findUnique = mock.fn(async ({ where }) => users.find((row) => row.id === where.id) ?? null);
  db.counter.findUnique = mock.fn(async () => ({ name: "leadId", seq: BigInt(counter.seq) }));
  db.counter.update = mock.fn(async ({ data }) => {
    counter.seq += data.seq.increment;
    return { name: "leadId", seq: BigInt(counter.seq) };
  });
  db.lead.findMany = mock.fn(async ({ where }) => existingLeads.filter((row) => where.email.in.includes(row.email.toLowerCase())));
  db.$queryRaw = mock.fn(async () => existingLeads.filter((row) => row.phone));
  db.lead.createMany = mock.fn(async ({ data }) => {
    createManyCalls++;
    if (createManyCalls === failCreateManyAt) throw Object.assign(new Error("Lock wait timeout secret-table"), { name: "PrismaClientKnownRequestError", code: "P2003" });
    leads.push(...data);
    return { count: data.length };
  });
  // A transaction that undoes its writes when the work fails, like the real one
  db.$transaction = mock.fn(async (work) => {
    const snapshot = { leads: [...leads], seq: counter.seq };
    try {
      return await work(db);
    } catch (error) {
      leads = snapshot.leads;
      counter.seq = snapshot.seq;
      throw error;
    }
  });
};

describe("import over HTTP", () => {
  let server;
  let baseUrl;
  const originalEnv = { rows: process.env.IMPORT_MAX_ROWS, mb: process.env.IMPORT_MAX_FILE_MB };

  before(async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
    const app = express();
    app.use(express.json());
    app.use("/api/leads", leadRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    installStore();
    mock.method(console, "error", () => {});
  });
  afterEach(() => {
    mock.restoreAll();
    for (const [key, value] of [["IMPORT_MAX_ROWS", originalEnv.rows], ["IMPORT_MAX_FILE_MB", originalEnv.mb]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const tokenFor = (id) => jwt.sign({ id: String(id) }, process.env.JWT_SECRET);
  const SALES = () => tokenFor(1); // an admin: only admins can import
  const ADMIN = () => tokenFor(2);
  const EMPLOYEE = () => tokenFor(3);
  const MAPPING = JSON.stringify({ 0: "name", 1: "phone", 2: "email" });
  const CSV = "name,phone,email,city\nAsha,98765 43210,asha@x.com,Pune\nRavi,98765 00000,ravi@x.com,Delhi\n";

  const send = async (path, { token, file = ["leads.csv", CSV], fields = {} } = {}) => {
    const form = new FormData();
    if (file) form.append("file", new Blob([file[1]]), file[0]);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const response = await fetch(`${baseUrl}/api/leads${path}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  test("an employee (sales role) cannot preview, validate or import: every step is refused and nothing is written", async () => {
    for (const path of ["/import/preview", "/import/validate", "/import"]) {
      const { status, body } = await send(path, { token: EMPLOYEE(), fields: { mapping: MAPPING } });
      assert.equal(status, 403, path);
      assert.equal(body.success, false);
    }
    assert.equal(leads.length, 0);
    assert.equal(db.lead.createMany.mock.calls.length, 0);
    assert.equal(db.counter.update.mock.calls.length, 0);
  });

  test("the model itself refuses an import by a sales user", async () => {
    await assert.rejects(Lead.createManyForUser([{ fields: { name: "A" }, customFields: {} }], { _id: "3", role: "sales" }), (error) => error.statusCode === 403);
    assert.equal(db.lead.createMany.mock.calls.length, 0);
  });

  test("preview, validate and import all require a logged-in user", async () => {
    for (const path of ["/import/preview", "/import/validate", "/import"]) {
      assert.equal((await send(path, { fields: { mapping: MAPPING } })).status, 401, path);
    }
    assert.equal(leads.length, 0);
    assert.equal(db.lead.createMany.mock.calls.length, 0);
  });

  test("preview returns headers, sample rows, row count and suggested mapping", async () => {
    const { status, body } = await send("/import/preview", { token: SALES() });
    assert.equal(status, 200);
    assert.deepEqual(body.data.headers.map((header) => header.name), ["name", "phone", "email", "city"]);
    assert.equal(body.data.totalRows, 2);
    assert.deepEqual(body.data.sampleRows[0], ["Asha", "98765 43210", "asha@x.com", "Pune"]);
    assert.deepEqual(body.data.suggestedMapping, { 0: "name", 1: "phone", 2: "email" });
    assert.equal(db.lead.createMany.mock.calls.length, 0); // nothing is written by a preview
  });

  test("preview and validate work with an .xlsx upload", async () => {
    const file = ["leads.xlsx", makeXlsx([["Full Name", "Mobile", "Email"], ["Asha", 9876543210, "asha@x.com"]])];
    const preview = await send("/import/preview", { token: SALES(), file });
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.body.data.suggestedMapping, { 0: "name", 1: "phone", 2: "email" });

    const validated = await send("/import/validate", { token: SALES(), file, fields: { mapping: JSON.stringify(preview.body.data.suggestedMapping) } });
    assert.equal(validated.body.data.validRows, 1);
  });

  test("validate reports counts, row errors and duplicates, and writes nothing", async () => {
    existingLeads = [{ leadId: "LD-0005", email: "asha@x.com", phone: null, assignedToId: 1 }];
    const csv = "name,phone,email\nAsha,98765 43210,asha@x.com\nBad,1,not-an-email\nRavi,98765 00000,\nRavi 2,98765 00000,\n";
    const { status, body } = await send("/import/validate", { token: SALES(), file: ["l.csv", csv], fields: { mapping: MAPPING } });
    assert.equal(status, 200);
    assert.deepEqual([body.data.totalRows, body.data.validRows, body.data.invalidRows, body.data.duplicateRows], [4, 3, 1, 2]);
    assert.equal(body.data.errors[0].row, 3);
    assert.deepEqual(body.data.duplicates.map((row) => [row.row, row.reasons[0]]), [[2, "Same email as existing lead LD-0005"], [5, "Same phone as row 4 in this file"]]);
    assert.equal(leads.length, 0);
  });

  test("importing assigns every lead to the importing admin, with consecutive IDs and custom fields", async () => {
    const { status, body } = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.equal(status, 201);
    assert.deepEqual([body.data.imported, body.data.firstLeadId, body.data.lastLeadId, body.data.failedRows], [2, "LD-0001", "LD-0002", 0]);
    assert.deepEqual(leads.map((lead) => lead.leadId), ["LD-0001", "LD-0002"]);
    assert.ok(leads.every((lead) => lead.createdById === 1 && lead.assignedToId === 1));
    assert.deepEqual(leads[0].customFields, { city: "Pune" });
    assert.equal(leads[0].name, "Asha");
  });

  test("an admin's import is assigned to the admin, and IDs continue from the counter", async () => {
    counter.seq = 41;
    const { body } = await send("/import", { token: ADMIN(), fields: { mapping: MAPPING } });
    assert.deepEqual([body.data.firstLeadId, body.data.lastLeadId], ["LD-0042", "LD-0043"]);
    assert.ok(leads.every((lead) => lead.createdById === 2 && lead.assignedToId === 2));
  });

  test("creator, assignee, role and ID values in the request or the file are ignored", async () => {
    const csv = "name,phone,email,createdBy,assignedTo,role,leadId,employeeId\nAsha,98765 43210,asha@x.com,2,2,admin,LD-9999,ADM-1\n";
    const { status } = await send("/import", {
      token: SALES(),
      file: ["l.csv", csv],
      fields: { mapping: MAPPING, createdBy: "2", assignedTo: "2", createdById: "2", role: "admin" },
    });
    assert.equal(status, 201);
    const [lead] = leads;
    assert.equal(lead.createdById, 1);
    assert.equal(lead.assignedToId, 1);
    assert.equal(lead.leadId, "LD-0001");
    assert.equal(lead.role, undefined);
    assert.deepEqual(lead.customFields, { createdBy: "2", assignedTo: "2", role: "admin", leadId: "LD-9999", employeeId: "ADM-1" });
  });

  test("a mapping to a protected field is refused and nothing is written", async () => {
    const { status, body } = await send("/import", { token: SALES(), fields: { mapping: JSON.stringify({ 0: "name", 1: "assignedTo" }) } });
    assert.equal(status, 400);
    assert.match(body.message, /Invalid column mapping/);
    assert.equal(leads.length, 0);
  });

  test("missing required mapping, a missing file and a bad duplicates option are 400s", async () => {
    const noName = await send("/import", { token: SALES(), fields: { mapping: JSON.stringify({ 1: "phone" }) } });
    assert.equal(noName.status, 400);
    assert.match(noName.body.message, /required field: Name/);
    assert.equal((await send("/import", { token: SALES(), file: null, fields: { mapping: MAPPING } })).status, 400);
    const badOption = await send("/import", { token: SALES(), fields: { mapping: MAPPING, duplicates: "overwrite" } });
    assert.equal(badOption.status, 400);
    assert.equal(leads.length, 0);
  });

  test("duplicates are skipped by default and imported only when asked", async () => {
    existingLeads = [{ leadId: "LD-0005", email: "asha@x.com", phone: null, assignedToId: 1 }];

    const skipped = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.deepEqual([skipped.body.data.imported, skipped.body.data.skippedDuplicates], [1, 1]);
    assert.deepEqual(leads.map((lead) => lead.name), ["Ravi"]);

    leads = [];
    counter.seq = 0;
    const forced = await send("/import", { token: SALES(), fields: { mapping: MAPPING, duplicates: "import" } });
    assert.deepEqual([forced.body.data.imported, forced.body.data.importedDuplicates, forced.body.data.skippedDuplicates], [2, 1, 0]);
  });

  test("duplicates are checked again at import time, so a lead added after the preview is caught", async () => {
    const preview = await send("/import/validate", { token: SALES(), fields: { mapping: MAPPING } });
    assert.equal(preview.body.data.duplicateRows, 0);

    existingLeads = [{ leadId: "LD-0007", email: "ravi@x.com", phone: null, assignedToId: 2 }];
    const { body } = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.deepEqual([body.data.imported, body.data.skippedDuplicates], [1, 1]);
  });

  test("invalid rows are not imported and are counted as failed", async () => {
    const csv = "name,phone,email\nAsha,1111111111,a@x.com\n,2222222222,b@x.com\nRavi,3333333333,bad\n";
    const { body } = await send("/import", { token: SALES(), file: ["l.csv", csv], fields: { mapping: MAPPING } });
    assert.deepEqual([body.data.totalRows, body.data.imported, body.data.failedRows], [3, 1, 2]);
  });

  test("a failure during the import rolls everything back and says so", async () => {
    const rows = Array.from({ length: 600 }, (_, i) => `Lead ${i},,l${i}@x.com`);
    failCreateManyAt = 2; // the second batch of 500 fails after the first was written
    const { status, body } = await send("/import", { token: SALES(), file: ["l.csv", "name,phone,email\n" + rows.join("\n")], fields: { mapping: MAPPING } });

    assert.equal(status, 500);
    assert.equal(body.message, "The import failed and was rolled back: no leads were imported.");
    assert.equal(JSON.stringify(body).includes("secret-table"), false);
    assert.equal(leads.length, 0);
    assert.equal(counter.seq, 0); // the reserved ID block was handed back
    assert.equal(db.lead.createMany.mock.calls.length, 2);
  });

  test("a large import is written in batches, in one transaction, with unique consecutive IDs", async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => `Lead ${i},,l${i}@x.com`);
    const { status, body } = await send("/import", { token: SALES(), file: ["l.csv", "name,phone,email\n" + rows.join("\n")], fields: { mapping: MAPPING } });
    assert.equal(status, 201);
    assert.equal(body.data.imported, 1200);
    assert.equal(db.$transaction.mock.calls.length, 1);
    assert.deepEqual(db.lead.createMany.mock.calls.map((call) => call.arguments[0].data.length), [500, 500, 200]);
    assert.equal(new Set(leads.map((lead) => lead.leadId)).size, 1200);
    assert.equal(leads[1199].leadId, "LD-1200");
  });

  test("a transaction collision is retried without creating duplicate leads", async () => {
    let attempts = 0;
    const realTransaction = db.$transaction;
    db.$transaction = mock.fn(async (work, options) => {
      attempts++;
      if (attempts === 1) {
        await realTransaction(async (tx) => { await work(tx); throw Object.assign(new Error("conflict"), { code: "P2034" }); }, options).catch(() => {});
        throw Object.assign(new Error("conflict"), { code: "P2034" });
      }
      return realTransaction(work, options);
    });
    const { status, body } = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.equal(status, 201);
    assert.equal(body.data.imported, 2);
    assert.equal(leads.length, 2);
    assert.deepEqual(leads.map((lead) => lead.leadId), ["LD-0001", "LD-0002"]);
  });

  test("a second import by the same user while one is running is refused", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const original = db.counter.update;
    db.counter.update = mock.fn(async (args) => { await gate; return original(args); });

    const first = send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.equal(second.status, 409);

    release();
    assert.equal((await first).status, 201);
    assert.equal(leads.length, 2);
    assert.equal((await send("/import", { token: SALES(), fields: { mapping: MAPPING } })).status, 201); // the lock was released
  });

  test("the row limit and the file size limit come from the configuration", async () => {
    process.env.IMPORT_MAX_ROWS = "1";
    const rows = await send("/import/preview", { token: SALES() });
    assert.equal(rows.status, 400);
    assert.match(rows.body.message, /more than 1 rows/);

    process.env.IMPORT_MAX_ROWS = "5000";
    process.env.IMPORT_MAX_FILE_MB = "1";
    const big = "name\n" + "x".repeat(1024 * 1024 + 10);
    const size = await send("/import/preview", { token: SALES(), file: ["big.csv", big] });
    assert.equal(size.status, 400);
    assert.match(size.body.message, /larger than 1 MB/);
  });

  test("unsupported and old-format uploads get clear messages", async () => {
    const xls = await send("/import/preview", { token: SALES(), file: ["old.xls", "irrelevant"] });
    assert.equal(xls.status, 400);
    assert.match(xls.body.message, /\.xls files are not supported/);
    assert.equal((await send("/import/preview", { token: SALES(), file: ["a.pdf", "%PDF"] })).status, 400);
  });

  test("responses and logs never include row contents or database details", async () => {
    const logged = [];
    mock.method(console, "error", (...args) => logged.push(args.join(" ")));
    failCreateManyAt = 1;
    const { body } = await send("/import", { token: SALES(), fields: { mapping: MAPPING } });
    assert.equal(JSON.stringify(body).includes("Asha"), false);
    assert.equal(logged.join("\n").includes("Asha"), false);
    assert.equal(logged.join("\n").includes("asha@x.com"), false);
  });
});
