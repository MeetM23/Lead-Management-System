import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import AppError from "../utils/AppError.js";
import { parseListOptions } from "../utils/listOptions.js";
import { toId, toApiId, isUniqueViolation } from "../utils/ids.js";
import { normalizePhone, cleanPhone } from "../utils/normalize.js";
import { ROLES } from "../constants/index.js";

// All lead queries live here (leads and their notes). Callers get plain objects shaped like the API
// responses: the internal integer ID is exposed as the string `_id`, and `leadId` (LD-0001) is the public ID.

const LEAD_ID_COUNTER = "leadId";
const MAX_LEAD_ID_ATTEMPTS = 5;

/* =========================
   SHAPES SENT TO THE API
========================= */

// Three views, matching what each endpoint has always returned:
//   list    - assignedTo/createdBy as { _id, name, email }; notes without author details
//   summary - same people, notes with author { _id, name }          (create, update, assign, notes)
//   detail  - people with profilePic too; notes with author { _id, name, profilePic }
const includeFor = (view) => {
  const person = { select: { id: true, name: true, email: true, ...(view === "detail" && { profilePic: true }) } };
  const author = { select: { id: true, name: true, ...(view === "detail" && { profilePic: true }) } };

  return {
    assignedTo: person,
    createdBy: person,
    notes: view === "list" ? { orderBy: { createdAt: "asc" } } : { orderBy: { createdAt: "asc" }, include: { createdBy: author } },
  };
};

const toPerson = (user) =>
  user && {
    _id: toApiId(user.id),
    name: user.name,
    ...(user.email !== undefined && { email: user.email }),
    ...(user.profilePic && { profilePic: user.profilePic }),
  };

const toNote = (note, view) => ({
  _id: toApiId(note.id),
  content: note.content,
  createdBy: view === "list" ? toApiId(note.createdById) : toPerson(note.createdBy),
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

const toLead = (row, view) => ({
  _id: toApiId(row.id),
  leadId: row.leadId,
  name: row.name,
  email: row.email,
  phone: cleanPhone(row.phone), // old imports stored "p:+91..."; the stored value is left as it was
  source: row.source,
  state: row.state ?? null,
  // Can be long, so it is left out of the list; every other view (detail, create, update, assign, notes) includes it
  ...(view !== "list" && { finalRemark: row.finalRemark ?? null }),
  customFields: row.customFields ?? {},
  createdBy: toPerson(row.createdBy),
  assignedTo: toPerson(row.assignedTo),
  notes: row.notes.map((note) => toNote(note, view)),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const findSummary = async (id) => toLead(await prisma.lead.findUnique({ where: { id }, include: includeFor("summary") }), "summary");

/* =========================
   ACCESS RULES
========================= */

const userIdOf = (user) => toId(user._id);

// Which leads a user may touch, derived only from the authenticated user (never from client input)
const accessScope = (user) => {
  if (user.role === ROLES.ADMIN) return {};
  if (user.role === ROLES.SALES) return { assignedToId: userIdOf(user) };
  throw new AppError("Unauthorized role", 403);
};

const assertSalesOwnsLead = (lead, user, message) => {
  if (user.role === ROLES.SALES && lead.assignedToId !== userIdOf(user)) {
    throw new AppError(message, 403);
  }
};

/* =========================
   INPUT CHECKS
========================= */

const requireText = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new AppError(`${label} is required`, 400);
  return value.trim();
};

const optionalText = (value, label, { trim = true } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new AppError(`Invalid ${label}`, 400);
  return trim ? value.trim() : value;
};

// A state typed by a user is stored exactly as written (only surrounding spaces are removed).
// It is never matched to a list, corrected or translated.
const stateText = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new AppError("Invalid state", 400);
  const state = value.trim();
  if (state.length > 100) throw new AppError("State is longer than 100 characters", 400);
  return state || undefined;
};

/* =========================
   LEAD IDS (LD-0001, LD-0002, …)
========================= */

// Highest number among existing "LD-<digits>" IDs (0 when there are none). Used only to start the counter.
// Written to work on both MySQL 8 and MariaDB (CAST to BINARY makes the pattern case-sensitive on both).
const getMaxLeadNumber = async (db = prisma) => {
  const [row] = await db.$queryRaw`
    SELECT MAX(CAST(SUBSTRING(lead_id, 4) AS UNSIGNED)) AS max
    FROM leads
    WHERE CAST(lead_id AS BINARY) REGEXP '^LD-[0-9]{1,9}$'`;
  return Number(row?.max ?? 0);
};

// Reserves `count` consecutive numbers from the counter and returns the first. Call it inside the same
// transaction that inserts the leads: the increment locks the counter row until commit, so concurrent
// creates are serialized and a failed insert hands the numbers back. Numbers are never reused, even after
// a lead is deleted.
const reserveLeadNumbers = async (db, count) => {
  if (!(await db.counter.findUnique({ where: { name: LEAD_ID_COUNTER } }))) {
    // First use: start after the highest existing ID, never from the number of leads
    await db.counter.create({ data: { name: LEAD_ID_COUNTER, seq: await getMaxLeadNumber(db) } });
  }
  const counter = await db.counter.update({ where: { name: LEAD_ID_COUNTER }, data: { seq: { increment: count } } });
  return Number(counter.seq) - (count - 1); // the first number of the reserved block
};

const formatLeadId = (number) => `LD-${String(number).padStart(4, "0")}`;

const generateLeadId = async (db = prisma) => formatLeadId(await reserveLeadNumbers(db, 1));

// Runs `work(tx)` in a transaction, retrying when two requests collide on the counter or the lead ID
const withLeadIdRetry = async (work, options) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(work, options);
    } catch (error) {
      const collision = isUniqueViolation(error) || error?.code === "P2034"; // unique conflict, or deadlock/write conflict
      if (!collision || attempt >= MAX_LEAD_ID_ATTEMPTS) throw error;
    }
  }
};

/* =========================
   QUERIES
========================= */

// Fields clients may filter on. Anything else in the query string is ignored.
const FILTER_TEXT_FIELDS = ["leadId", "name", "email", "phone", "source"];
const SEARCH_FIELDS = ["name", "phone", "email", "leadId"]; // `search` looks in all of these
const MAX_SEARCH_LENGTH = 100;
const FILTER_OWNER_FIELDS = { assignedTo: "assignedToId", createdBy: "createdById" }; // admin only
const FILTER_DATE_FIELDS = ["createdAt", "updatedAt"];
const RANGE_OPERATORS = ["gte", "gt", "lte", "lt"];

// Builds the list filter: whitelisted client filters first, then the access scope on top,
// so the scope always wins. Operator keys, arrays and nested objects from the client are dropped.
const buildListFilter = (user, queryString = {}) => {
  const scope = accessScope(user);
  const filter = {};

  for (const field of FILTER_TEXT_FIELDS) {
    const value = queryString[field];
    if (typeof value === "string" && value !== "") filter[field] = value;
  }

  if (user.role === ROLES.ADMIN) {
    for (const [field, column] of Object.entries(FILTER_OWNER_FIELDS)) {
      const id = toId(queryString[field]);
      if (id) filter[column] = id;
    }
  }

  for (const field of FILTER_DATE_FIELDS) {
    const value = queryString[field];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const range = {};
    for (const operator of RANGE_OPERATORS) {
      const date = typeof value[operator] === "string" ? new Date(value[operator]) : null;
      if (date && !Number.isNaN(date.getTime())) range[operator] = date;
    }
    if (Object.keys(range).length > 0) filter[field] = range;
  }

  // Free-text search: matches any of the search fields. It narrows the result; the scope below still applies.
  const search = typeof queryString.search === "string" ? queryString.search.trim().slice(0, MAX_SEARCH_LENGTH) : "";
  if (search) filter.OR = SEARCH_FIELDS.map((field) => ({ [field]: { contains: search } }));

  return { ...filter, ...scope };
};

// One page of the leads visible to the user (admin: all, sales: assigned to them), with filter/sort/pagination,
// plus the total number of matching leads (for page numbers)
const findPageForUser = async (user, queryString = {}) => {
  const where = buildListFilter(user, queryString);
  const options = parseListOptions(queryString);
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({ where, ...options, include: includeFor("list") }),
    prisma.lead.count({ where }),
  ]);
  return { leads: rows.map((row) => toLead(row, "list")), total, page: options.skip / options.take + 1, limit: options.take };
};

const findDetail = async (leadId, user) => {
  const row = await prisma.lead.findUnique({ where: { leadId }, include: includeFor("detail") });
  if (!row) return null;

  assertSalesOwnsLead(row, user, "Not authorized to view this lead");

  return toLead(row, "detail");
};

// Only an admin adds leads; the lead goes to the sales employee the admin picks
const createForUser = async (data, user) => {
  if (user.role !== ROLES.ADMIN) throw new AppError("Only an admin can add leads", 403);
  if (!data.assignedTo) {
    throw new AppError("Admin must assign lead to a sales user", 400);
  }
  const assignee = toId(data.assignedTo) && (await prisma.user.findUnique({ where: { id: toId(data.assignedTo) } }));
  if (!assignee || assignee.role !== ROLES.SALES || assignee.isActive === false) {
    throw new AppError("Assigned user must be an active sales user", 400);
  }
  const assignedToId = assignee.id;

  const fields = {
    name: requireText(data.name, "Name"),
    email: optionalText(data.email, "email"),
    phone: cleanPhone(optionalText(data.phone, "phone")),
    source: optionalText(data.source, "source", { trim: false }),
    state: stateText(data.state),
  };

  const row = await withLeadIdRetry(async (tx) =>
    tx.lead.create({
      data: { ...fields, leadId: await generateLeadId(tx), createdById: userIdOf(user), assignedToId },
      include: includeFor("summary"),
    })
  );

  return toLead(row, "summary");
};

/* =========================
   IMPORT FROM A SPREADSHEET
========================= */

const IMPORT_BATCH_SIZE = 500;
const LOOKUP_BATCH_SIZE = 500;
const IMPORT_TRANSACTION = { maxWait: 10000, timeout: 120000 };

const inBatches = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

// Existing leads that share an email or a phone number (last 10 digits) with the given values, as
// [{ leadId, email, phoneKey, visible }]. `visible` says whether the user may see that lead; the caller shows
// the lead ID only then. Emails are already lowercase; both lookups ignore letter case and phone formatting.
const findImportMatches = async ({ emails, phones }, user) => {
  const isAdmin = user.role === ROLES.ADMIN;
  const matches = [];
  const add = (row, email, phoneKey) =>
    matches.push({ leadId: row.leadId, email, phoneKey, visible: isAdmin || row.assignedToId === userIdOf(user) });

  for (const batch of inBatches(emails, LOOKUP_BATCH_SIZE)) {
    const rows = await prisma.lead.findMany({ where: { email: { in: batch } }, select: { leadId: true, email: true, assignedToId: true } });
    for (const row of rows) add(row, row.email.toLowerCase(), "");
  }

  for (const batch of inBatches(phones, LOOKUP_BATCH_SIZE)) {
    const rows = await prisma.$queryRaw`
      SELECT lead_id AS leadId, phone, assigned_to_id AS assignedToId
      FROM leads
      WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) IN (${Prisma.join(batch)})`;
    for (const row of rows) add(row, "", normalizePhone(row.phone));
  }
  return matches;
};

// Creates all the given leads, or none: one transaction, one block of consecutive lead IDs, assigned to and
// created by the importing user. Each row: { fields: { name, email?, phone?, source? }, customFields }.
const createManyForUser = async (rows, user) => {
  if (user.role !== ROLES.ADMIN) throw new AppError("Only an admin can import leads", 403);
  if (rows.length === 0) return { count: 0 };
  const ownerId = userIdOf(user);

  return withLeadIdRetry(async (tx) => {
    const first = await reserveLeadNumbers(tx, rows.length);
    for (const [batchIndex, batch] of inBatches(rows, IMPORT_BATCH_SIZE).entries()) {
      await tx.lead.createMany({
        data: batch.map((row, index) => ({
          ...row.fields,
          ...(Object.keys(row.customFields).length > 0 && { customFields: row.customFields }),
          leadId: formatLeadId(first + batchIndex * IMPORT_BATCH_SIZE + index),
          createdById: ownerId,
          assignedToId: ownerId,
        })),
      });
    }
    return { count: rows.length, firstLeadId: formatLeadId(first), lastLeadId: formatLeadId(first + rows.length - 1) };
  }, IMPORT_TRANSACTION);
};

const updateForUser = async (leadId, data, user) => {
  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;

  const changes = {};

  if (user.role === ROLES.SALES) {
    assertSalesOwnsLead(lead, user, "Not authorized to update this lead");
    if (data.assignedTo || data.createdBy) {
      throw new AppError("Sales cannot update assignment or creator", 403);
    }
    throw new AppError("Only an admin can edit a lead", 403);
  } else if (user.role === ROLES.ADMIN) {
    if (data.assignedTo) {
      throw new AppError("Use PATCH /leads/:id/assign to reassign leads", 400);
    }
    const next = {
      name: optionalText(data.name, "name"),
      email: optionalText(data.email, "email"),
      phone: cleanPhone(optionalText(data.phone, "phone")),
      source: optionalText(data.source, "source", { trim: false }),
      state: stateText(data.state),
    };
    for (const [field, value] of Object.entries(next)) {
      if (value && lead[field] !== value) changes[field] = value;
    }
  } else {
    throw new AppError("Unauthorized role", 403);
  }

  if (Object.keys(changes).length > 0) {
    await prisma.lead.update({ where: { id: lead.id }, data: changes });
  }

  return await findSummary(lead.id);
};

const MAX_FINAL_REMARK_LENGTH = 5000;

// Saves the final remark of a lead and nothing else. The assigned employee (or an admin) writes it; an empty
// text clears it. Status-like data, assignment and every other field are left exactly as they are.
const setFinalRemark = async (leadId, value, user) => {
  if (value === undefined) throw new AppError("finalRemark is required (send an empty text to clear it)", 400); // a client mistake must never wipe a remark
  if (value !== null && typeof value !== "string") throw new AppError("Final remark must be text", 400);
  const remark = (value ?? "").trim();
  if (remark.length > MAX_FINAL_REMARK_LENGTH) throw new AppError(`Final remark can be at most ${MAX_FINAL_REMARK_LENGTH} characters`, 400);

  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;
  assertSalesOwnsLead(lead, user, "Not authorized to update this lead");
  accessScope(user); // only admin and sales

  await prisma.lead.update({ where: { id: lead.id }, data: { finalRemark: remark || null } });
  return await findSummary(lead.id);
};

const deleteByLeadId = async (leadId) => {
  const { count } = await prisma.lead.deleteMany({ where: { leadId } });
  return count > 0 ? { leadId } : null;
};

const assign = async (leadId, assignedTo, user) => {
  if (user.role !== ROLES.ADMIN) throw new AppError("Only admin can assign leads", 403);
  if (!assignedTo) throw new AppError("assignedTo is required", 400);

  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;

  const assignee = toId(assignedTo) && (await prisma.user.findUnique({ where: { id: toId(assignedTo) } }));
  if (!assignee || assignee.role !== ROLES.SALES || assignee.isActive === false) {
    throw new AppError("Admin can only assign leads to active sales users", 400);
  }

  await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: assignee.id } });

  return await findSummary(lead.id);
};

/* =========================
   NOTES
========================= */

const requireNoteContent = (content) => {
  if (typeof content !== "string" || content === "") throw new AppError("Note content is required", 400);
  return content;
};

// Finds a note on this lead; the same "not found" for a missing or malformed note ID
const findNote = async (lead, noteId) => {
  const id = toId(noteId);
  const note = id && (await prisma.leadNote.findFirst({ where: { id, leadPk: lead.id } }));
  if (!note) throw new AppError("Note not found", 404);
  return note;
};

const addNote = async (leadId, content, user) => {
  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;

  assertSalesOwnsLead(lead, user, "Not authorized to add notes to this lead");

  await prisma.leadNote.create({
    data: { leadPk: lead.id, content: requireNoteContent(content), createdById: userIdOf(user) },
  });

  return await findSummary(lead.id);
};

const updateNote = async (leadId, noteId, content, user) => {
  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;

  assertSalesOwnsLead(lead, user, "Not authorized to edit this note");

  const note = await findNote(lead, noteId);
  if (note.createdById !== userIdOf(user)) {
    throw new AppError("Not authorized to edit this note", 403);
  }

  await prisma.leadNote.update({ where: { id: note.id }, data: { content: requireNoteContent(content) } });

  return await findSummary(lead.id);
};

const deleteNote = async (leadId, noteId, user) => {
  const lead = await prisma.lead.findUnique({ where: { leadId } });
  if (!lead) return null;

  assertSalesOwnsLead(lead, user, "Not authorized to delete this note");

  const note = await findNote(lead, noteId);
  if (note.createdById !== userIdOf(user)) {
    throw new AppError("Not authorized to delete this note", 403);
  }

  await prisma.leadNote.delete({ where: { id: note.id } });

  return await findSummary(lead.id);
};

/* =========================
   DASHBOARD STATS
========================= */

const getStats = async (user) => {
  const where = accessScope(user);

  const totalLeads = await prisma.lead.count({ where });

  const bySource = await prisma.lead.groupBy({ by: ["source"], where, _count: { _all: true } });
  const byState = await prisma.lead.groupBy({ by: ["state"], where: { ...where, state: { not: null } }, _count: { _all: true } });

  // Leads created per day over the last 30 days (days are UTC, as stored)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const scopeSql = where.assignedToId ? Prisma.sql`AND assigned_to_id = ${where.assignedToId}` : Prisma.empty;
  const perDay = await prisma.$queryRaw`
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS count
    FROM leads
    WHERE created_at >= ${thirtyDaysAgo} ${scopeSql}
    GROUP BY day
    ORDER BY day`;

  return {
    totalLeads,
    leadsOverTime: perDay.map((row) => ({ _id: row.day, count: Number(row.count) })),
    leadsBySource: bySource.map((row) => ({ _id: row.source, count: row._count._all })),
    leadsByState: byState.map((row) => ({ _id: row.state, count: row._count._all })),
  };
};

/* =========================
   DEMO DATA (used only by the seeder)
========================= */

const countAll = async () => prisma.lead.count();

// Creates demo leads one by one, each with a fresh ID from the same generator as real leads.
// Each row: { name, email, phone, source, createdBy, assignedTo (user _id strings),
//             createdAt, updatedAt, notes: [{ content, createdBy, createdAt }] }
const createDemoLeads = async (rows) => {
  for (const row of rows) {
    await withLeadIdRetry(async (tx) =>
      tx.lead.create({
        data: {
          leadId: await generateLeadId(tx),
          name: row.name,
          email: row.email,
          phone: row.phone,
          source: row.source,
          createdById: toId(row.createdBy),
          assignedToId: toId(row.assignedTo),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          notes: {
            create: row.notes.map((note) => ({ content: note.content, createdById: toId(note.createdBy), createdAt: note.createdAt })),
          },
        },
      })
    );
  }
  return rows.length;
};

const Lead = {
  buildListFilter,
  findPageForUser,
  findDetail,
  createForUser,
  findImportMatches,
  createManyForUser,
  updateForUser,
  setFinalRemark,
  deleteByLeadId,
  assign,
  addNote,
  updateNote,
  deleteNote,
  getStats,
  getMaxLeadNumber,
  generateLeadId,
  countAll,
  createDemoLeads,
};

export default Lead;
