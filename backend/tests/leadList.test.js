import { describe, test, mock, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import jwt from "jsonwebtoken";
import Lead from "../models/Lead.js";
import leadRoutes from "../routes/leadRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { parseSpreadsheet, suggestMapping, parseMapping, buildImportRows, summarize } from "../utils/leadImport.js";
import { describeCustomFields } from "../../frontend/src/utils/leadDisplay.js";
import { installFakePrisma, leadRow, userRow, sales, admin } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in. The real MariaDB checks
// (migration, branch column, filters, search, paging) are done by a separate script, not by this file.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvFile = (text) => ({ originalname: "leads.csv", buffer: Buffer.from(text), size: Buffer.byteLength(text) });

/* =========================
   MODEL: FILTERS, SEARCH, PAGES
========================= */

describe("search and scope", () => {
  test("search looks in name, phone, email and lead ID, and cannot widen a sales user's scope", () => {
    const filter = Lead.buildListFilter(sales(5), { search: " asha ", assignedTo: "9", priority: "High" });
    assert.deepEqual(filter.OR.map((clause) => Object.keys(clause)[0]), ["name", "phone", "email", "leadId"]);
    assert.deepEqual(filter.OR[0], { name: { contains: "asha" } });
    assert.equal(filter.assignedToId, 5); // the scope, not the requested assignedTo
    assert.equal(filter.priority, "High");
  });

  test("search ignores empty and non-string values, and caps its length", () => {
    assert.equal(Lead.buildListFilter(admin(), { search: "   " }).OR, undefined);
    assert.equal(Lead.buildListFilter(admin(), { search: { contains: "x" } }).OR, undefined);
    assert.equal(Lead.buildListFilter(admin(), { search: ["a"] }).OR, undefined);
    assert.equal(Lead.buildListFilter(admin(), { search: "x".repeat(500) }).OR[0].name.contains.length, 100);
  });

  test("a page returns the total, page number and limit, and counts with the same filter", async () => {
    const db = installFakePrisma();
    db.lead.findMany = mock.fn(async () => [leadRow()]);
    db.lead.count = mock.fn(async () => 42);

    const result = await Lead.findPageForUser(sales(1), { search: "a", page: "3", limit: "10", assignedTo: "7" });

    assert.deepEqual([result.total, result.page, result.limit, result.leads.length], [42, 3, 10, 1]);
    const findArgs = db.lead.findMany.mock.calls[0].arguments[0];
    assert.deepEqual([findArgs.skip, findArgs.take], [20, 10]);
    assert.deepEqual(db.lead.count.mock.calls[0].arguments[0].where, findArgs.where);
    assert.equal(findArgs.where.assignedToId, 1);
  });

});

/* =========================
   HTTP: UPDATES AND PERMISSIONS
========================= */

let db;
let rows; // lead rows by id
let people; // user rows

const installStore = () => {
  db = installFakePrisma();
  people = [
    userRow({ id: 1, name: "Sam Sales", role: "sales", email: "sam@example.com", employeeId: "EMP-1" }),
    userRow({ id: 2, name: "Boss", role: "admin", email: "boss@example.com", employeeId: "ADM-1" }),
    userRow({ id: 3, name: "Other Sales", role: "sales", email: "other@example.com", employeeId: "EMP-3" }),
    userRow({ id: 4, name: "Left Company", role: "sales", email: "left@example.com", employeeId: "EMP-4", isActive: false }),
  ];
  rows = [
    leadRow({ id: 10, leadId: "LD-0001", assignedToId: 1 }),
    leadRow({ id: 11, leadId: "LD-0002", assignedToId: 3 }),
  ];
  db.user.findUnique = mock.fn(async ({ where }) => people.find((row) => row.id === where.id) ?? null);
  db.lead.findUnique = mock.fn(async ({ where }) => rows.find((row) => row.id === where.id || row.leadId === where.leadId) ?? null);
  db.lead.update = mock.fn(async ({ where, data }) => {
    const row = rows.find((candidate) => candidate.id === where.id);
    Object.assign(row, data);
    if (data.assignedToId) row.assignedTo = { id: data.assignedToId, name: people.find((p) => p.id === data.assignedToId).name, email: "x" };
    return row;
  });
};

describe("lead updates over HTTP", () => {
  let server;
  let baseUrl;

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
  afterEach(() => mock.restoreAll());

  const call = async (method, path, userId, body) => {
    const response = await fetch(`${baseUrl}/api/leads${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(userId ? { Authorization: `Bearer ${jwt.sign({ id: String(userId) }, process.env.JWT_SECRET)}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const SAM = 1;
  const BOSS = 2;

  test("the list returns the page information", async () => {
    db.lead.findMany = mock.fn(async () => rows);
    db.lead.count = mock.fn(async () => 2);
    const { status, body } = await call("GET", "/?search=asha&page=2&limit=5", BOSS);
    assert.equal(status, 200);
    assert.deepEqual([body.total, body.page, body.limit, body.count], [2, 2, 5, 2]);
    assert.equal("branch" in body.data[0], false); // branches no longer exist
  });

  test("a sales user listing with filters only ever queries their own leads", async () => {
    db.lead.findMany = mock.fn(async () => []);
    db.lead.count = mock.fn(async () => 0);
    await call("GET", "/?assignedTo=3&search=x&assignedToId=3&OR[0][name]=x", SAM);
    const where = db.lead.findMany.mock.calls[0].arguments[0].where;
    assert.equal(where.assignedToId, 1);
    assert.equal(db.lead.count.mock.calls[0].arguments[0].where.assignedToId, 1);
  });

  describe("lead status no longer exists", () => {
    test("a status in an update is ignored for an admin and refused for sales", async () => {
      assert.equal((await call("PUT", "/LD-0001", BOSS, { status: "Lost" })).status, 200);
      assert.equal("status" in rows[0], false);
      assert.equal(db.lead.update.mock.calls.length, 0); // nothing to change
      assert.equal((await call("PUT", "/LD-0001", SAM, { status: "Contacted" })).status, 403);
    });

    test("leads come back without a status", async () => {
      db.lead.findMany = mock.fn(async () => rows);
      db.lead.count = mock.fn(async () => 2);
      const { body } = await call("GET", "/?status=New", BOSS);
      assert.equal("status" in body.data[0], false);
      assert.equal("status" in db.lead.findMany.mock.calls[0].arguments[0].where, false); // the filter is ignored
    });
  });

  describe("assigned employee dropdown", () => {
    test("an admin can reassign a lead to an active sales employee", async () => {
      const { status, body } = await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: "3" });
      assert.equal(status, 200);
      assert.equal(rows[0].assignedToId, 3);
      assert.equal(body.data.assignedTo.name, "Other Sales");
    });

    test("an inactive employee, an admin, an unknown id or a malformed id cannot be assigned", async () => {
      for (const target of ["4", "2", "999", "abc", "-1", { id: 3 }, ["3"]]) {
        const { status } = await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: target });
        assert.equal(status, 400, JSON.stringify(target));
      }
      assert.equal(rows[0].assignedToId, 1);
    });

    test("a sales user cannot reassign leads, including their own", async () => {
      assert.equal((await call("PATCH", "/LD-0001/assign", SAM, { assignedTo: "3" })).status, 403);
      assert.equal(rows[0].assignedToId, 1);
    });

    test("assigning an unknown lead is a 404", async () => {
      assert.equal((await call("PATCH", "/LD-9999/assign", BOSS, { assignedTo: "3" })).status, 404);
    });

    test("a sales user cannot move a lead by sending assignedTo in an update", async () => {
      assert.equal((await call("PUT", "/LD-0001", SAM, { assignedTo: "3" })).status, 403);
      assert.equal(rows[0].assignedToId, 1);
    });
  });
});

/* =========================
   IMPORT AND DETAILS: THE LEAD-AD SPREADSHEET HEADERS
========================= */

const AD_HEADERS = [
  "ad_name",
  "is_your_business_registered_as_an_msme?",
  "do_you_currently_have_a_udyam_registration?",
  "which_zed_certification_level_are_you_interested_in?",
  "full_name",
  "phone",
  "email",
  "state",
  "Ofiifce",
];
const q = (value) => `"${value}"`;
const adCsv = (...rows) => [AD_HEADERS.map(q).join(","), ...rows.map((row) => row.map(q).join(","))].join("\n");

describe("import with the lead-ad spreadsheet headers", () => {
  test("full_name, phone, email and state are suggested; everything else is left as custom data", () => {
    assert.deepEqual(suggestMapping(AD_HEADERS), { 4: "name", 5: "phone", 6: "email", 7: "state" });
  });

  test("office, branch and location columns are not lead fields: nothing is suggested for them", () => {
    for (const header of ["Office", "branch", "Branch Name", "Location", "Ofiifce"]) {
      assert.deepEqual(suggestMapping(["full_name", header]), { 0: "name" }, header);
    }
  });

  test("branch is no longer a destination for a column", () => {
    for (const target of ["branch", "Branch"]) {
      assert.throws(() => parseMapping(JSON.stringify({ 0: "name", 1: target }), 2), (error) => error.statusCode === 400, target);
    }
  });

  const build = async (...rows) => {
    const sheet = await parseSpreadsheet(csvFile(adCsv(...rows)), { maxRows: 100 });
    return buildImportRows(sheet, parseMapping(JSON.stringify({ 4: "name", 5: "phone", 6: "email", 7: "state" }), AD_HEADERS.length));
  };
  const row = (office = "Pune", name = "Asha Rao") => ["Zed Ad 1", "Yes", "No", "Silver", name, "9811122233", "asha@example.com", "Gujarat", office];

  test("every other column is kept as custom data under its original name, including the office column", async () => {
    const [item] = await build(row("Pune"));
    assert.deepEqual(item.fields, { name: "Asha Rao", phone: "9811122233", email: "asha@example.com", state: "Gujarat" });
    assert.deepEqual(item.customFields, {
      ad_name: "Zed Ad 1",
      "is_your_business_registered_as_an_msme?": "Yes",
      "do_you_currently_have_a_udyam_registration?": "No",
      "which_zed_certification_level_are_you_interested_in?": "Silver",
      Ofiifce: "Pune",
    });
    assert.equal("needsBranch" in item, false);
  });

  test("columns with any names are kept, including long and multiline values", async () => {
    const sheet = await parseSpreadsheet(csvFile('full_name,Loan Requirement,notes,anything_else\nAsha,"5,00,000","line one\nline two",x'), { maxRows: 10 });
    const [item] = buildImportRows(sheet, parseMapping(JSON.stringify({ 0: "name" }), 4));
    assert.deepEqual(item.customFields, { "Loan Requirement": "5,00,000", notes: "line one\nline two", anything_else: "x" });
  });

  test("the import report has no branch section", async () => {
    assert.equal("branch" in summarize(await build(row("Mumbai"), row(""))), false);
  });
});

describe("custom fields on the lead page", () => {
  test("every saved field is listed with its saved name, in order, whatever the columns are", () => {
    const fields = describeCustomFields({
      "which_zed_certification_level_are_you_interested_in?": "Silver",
      "Loan Requirement": "5,00,000",
      "a brand new column": "x",
    });
    assert.deepEqual(fields.map((field) => field.label), ["which_zed_certification_level_are_you_interested_in?", "Loan Requirement", "a brand new column"]);
    assert.deepEqual(fields.map((field) => field.text), ["Silver", "5,00,000", "x"]);
  });

  test("ad_name is saved but not shown on the lead page", () => {
    const fields = describeCustomFields({ ad_name: "Zed Certification 29-09-2026", loan_requirement: "90lakh" });
    assert.deepEqual(fields.map((field) => field.label), ["loan_requirement"]);
  });

  test("empty, missing, long, multiline and non-text values are handled", () => {
    const long = "word ".repeat(500).trim();
    const fields = describeCustomFields({ blank: "", spaces: "   ", nothing: null, gone: undefined, multi: "a\nb\n\nc", long, count: 42, flag: false, list: ["a", "b"], nested: { k: 1 } });
    const byLabel = Object.fromEntries(fields.map((field) => [field.label, field]));
    for (const name of ["blank", "spaces", "nothing", "gone"]) assert.equal(byLabel[name].empty, true, name);
    assert.equal(byLabel.multi.text, "a\nb\n\nc");
    assert.equal(byLabel.long.text, long);
    assert.equal(byLabel.count.text, "42");
    assert.equal(byLabel.flag.text, "false");
    assert.deepEqual(JSON.parse(byLabel.list.text), ["a", "b"]);
    assert.deepEqual(JSON.parse(byLabel.nested.text), { k: 1 });
    assert.equal(fields.length, 10); // nothing is dropped
  });

  test("a lead without custom fields gives an empty list", () => {
    for (const value of [undefined, null, {}, [], "text", 5]) assert.deepEqual(describeCustomFields(value), []);
  });

  test("a lead's custom fields come back unchanged from the lead detail", async () => {
    const db = installFakePrisma();
    const customFields = { ad_name: "Zed Certification 29-09-2026", "is_your_business_registered_as_an_msme?": "yes", Ofiifce: "ABAD", notes: "a\nb" };
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1, customFields }));
    const lead = await Lead.findDetail("LD-0001", admin());
    assert.deepEqual(lead.customFields, customFields);
    assert.equal("branch" in lead, false);
  });
});

describe("import API without branches", () => {
  let server;
  let baseUrl;
  let created;

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
    created = [];
    let seq = 0;
    db.counter.findUnique = mock.fn(async () => ({ name: "leadId", seq: BigInt(seq) }));
    db.counter.update = mock.fn(async ({ data }) => { seq += data.seq.increment; return { name: "leadId", seq: BigInt(seq) }; });
    db.lead.createMany = mock.fn(async ({ data }) => { created.push(...data); return { count: data.length }; });
  });

  const MAPPING = JSON.stringify({ 4: "name", 5: "phone", 6: "email", 7: "state" });
  const FILE = adCsv(
    ["Ad", "Yes", "No", "Silver", "Asha Rao", "9811122233", "asha@example.com", "Gujarat", "Pune"],
    ["Ad", "Yes", "No", "Gold", "Ravi Shah", "9822233344", "ravi@example.com", "Gujarat", "Mumbai"],
  );
  const send = async (path, fields) => {
    const form = new FormData();
    form.append("file", new Blob([FILE]), "ads.csv");
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const response = await fetch(`${baseUrl}/api/leads${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt.sign({ id: "2" }, process.env.JWT_SECRET)}` },
      body: form,
    });
    return { status: response.status, body: await response.json() };
  };

  test("preview suggests name, phone, email and state only; the report has no branch section", async () => {
    const preview = await send("/import/preview", {});
    assert.deepEqual(preview.body.data.suggestedMapping, { 4: "name", 5: "phone", 6: "email", 7: "state" });
    assert.equal(preview.body.data.fields.some((field) => field.key === "branch"), false);
    assert.deepEqual(preview.body.data.fields.map((field) => field.key), ["name", "phone", "email", "state", "source", "priority"]);

    const report = await send("/import/validate", { mapping: MAPPING });
    assert.equal(report.body.data.validRows, 2);
    assert.equal("branch" in report.body.data, false);
  });

  test("imported leads keep the office column as custom data and have no branch", async () => {
    const { status, body } = await send("/import", { mapping: MAPPING });
    assert.equal(status, 201);
    assert.equal("withoutBranch" in body.data, false);
    assert.deepEqual(created.map((lead) => lead.customFields.Ofiifce), ["Pune", "Mumbai"]);
    assert.ok(created.every((lead) => !("branch" in lead)));
    assert.deepEqual(created.map((lead) => lead.state), ["Gujarat", "Gujarat"]);
  });

  test("a leftover defaultBranch value in a request is ignored", async () => {
    const { status } = await send("/import", { mapping: MAPPING, defaultBranch: "Chennai" });
    assert.equal(status, 201);
    assert.ok(created.every((lead) => !("branch" in lead)));
  });

  test("a column cannot be mapped to branch", async () => {
    const { status } = await send("/import", { mapping: JSON.stringify({ 4: "name", 8: "branch" }) });
    assert.equal(status, 400);
    assert.equal(created.length, 0);
  });
});

describe("the remove_lead_branch migration", () => {
  const sql = fs.readFileSync(path.join(backendDir, "prisma/migrations", fs.readdirSync(path.join(backendDir, "prisma/migrations")).find((name) => name.endsWith("_remove_lead_branch")), "migration.sql"), "utf8");

  test("drops only the branch column and its index, and only when they exist", () => {
    assert.match(sql, /column_name = 'branch'/);
    assert.match(sql, /index_name = 'leads_branch_idx'/);
    assert.equal((sql.match(/DROP COLUMN/g) ?? []).length, 1);
    assert.match(sql, /DROP COLUMN `branch`/);
    assert.equal(/DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM|DROP COLUMN `(?!branch`)/i.test(sql), false);
    assert.match(sql, /IF\(@has_branch > 0/);
    assert.match(sql, /IF\(@has_index > 0/);
  });

  test("the schema and the application no longer mention branches", () => {
    const schema = fs.readFileSync(path.join(backendDir, "prisma/schema.prisma"), "utf8");
    assert.equal(/branch/i.test(schema), false);
    for (const file of ["models/Lead.js", "utils/leadImport.js", "controllers/leadImportController.js", "constants/index.js"]) {
      assert.equal(/branch/i.test(fs.readFileSync(path.join(backendDir, file), "utf8")), false, file);
    }
  });
});
