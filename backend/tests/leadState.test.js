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
import { parseSpreadsheet, suggestMapping, parseMapping, buildImportRows } from "../utils/leadImport.js";
import { makeXlsx } from "./helpers/makeXlsx.js";
import { installFakePrisma, leadRow, userRow, sales, admin } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in. How the real MariaDB stores and returns
// these values (including Devanagari text) was checked by a separate script, described in the final report.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvFile = (text) => ({ originalname: "leads.csv", buffer: Buffer.from(text), size: Buffer.byteLength(text) });

// The values found in the real spreadsheet: they must come out exactly as they went in
const SOURCE_STATES = ["India", "Madhya Pradesh", "west.Bengal", "राजस्थान", "Tamil nadu", "Madhya pradesh", "BIHAR", "Tamilnadu", "West bangal", "Indian"];

describe("import keeps the state exactly as in the file", () => {
  const build = async (text, mapping = { 0: "name", 1: "state" }) => {
    const sheet = await parseSpreadsheet(csvFile(text), { maxRows: 50 });
    return buildImportRows(sheet, parseMapping(JSON.stringify(mapping), sheet.headers.length));
  };

  test("state, State and STATE columns are suggested as the state field", () => {
    for (const header of ["state", "State", "STATE", "State Name", "Province"]) {
      assert.deepEqual(suggestMapping(["full_name", header, "Ofiifce"]), { 0: "name", 1: "state" }, header);
    }
  });

  test("spelling, capitalization, punctuation and non-English text are not changed", async () => {
    const items = await build(["name,state", ...SOURCE_STATES.map((state, index) => `Lead ${index},${state}`)].join("\n"));
    assert.deepEqual(items.map((item) => item.fields.state), SOURCE_STATES);
    assert.ok(items.every((item) => item.errors.length === 0));
  });

  test("the same holds for an .xlsx file", async () => {
    const buffer = makeXlsx([["full_name", "state"], ...SOURCE_STATES.map((state, index) => [`Lead ${index}`, state])]);
    const sheet = await parseSpreadsheet({ originalname: "leads.xlsx", buffer, size: buffer.length }, { maxRows: 50 });
    const items = buildImportRows(sheet, parseMapping(JSON.stringify({ 0: "name", 1: "state" }), 2));
    assert.deepEqual(items.map((item) => item.fields.state), SOURCE_STATES);
  });

  test("the state is stored in its column only, not copied into customFields (one authoritative value)", async () => {
    const [item] = await build("name,state,other\nA,India,x", { 0: "name", 1: "state" });
    assert.equal(item.fields.state, "India");
    assert.deepEqual(item.customFields, { other: "x" });
  });

  test("an empty state is left unset, and a too-long one is a row error rather than being cut", async () => {
    const [blank, long] = await build(`name,state\nA,\nB,${"x".repeat(101)}`);
    assert.equal(blank.fields.state, undefined);
    assert.match(long.errors.join(";"), /State is longer than 100/);
  });

  test("an office column and every other column stay custom data with their original headers", async () => {
    const headers = ["is_your_business_registered_as_an_msme", "do_you_currently_have_a_udyam_registration", "which_zed_certification_level_are_you_interested_in", "full_name", "phone", "email", "state", "Ofiifce"];
    const text = `${headers.join(",")}\nyes,no,not_sure_/_need_guidance,Asha,9811122233,a@x.com,west.Bengal,ABAD`;
    const sheet = await parseSpreadsheet(csvFile(text), { maxRows: 10 });
    const mapping = suggestMapping(sheet.headers);
    assert.deepEqual(mapping, { 3: "name", 4: "phone", 5: "email", 6: "state" }); // Ofiifce is not mapped to anything
    const [item] = buildImportRows(sheet, parseMapping(JSON.stringify(mapping), headers.length));
    assert.equal(item.fields.state, "west.Bengal");
    assert.deepEqual(item.customFields, {
      is_your_business_registered_as_an_msme: "yes",
      do_you_currently_have_a_udyam_registration: "no",
      which_zed_certification_level_are_you_interested_in: "not_sure_/_need_guidance",
      Ofiifce: "ABAD",
    });
  });
});

describe("state is data, not a filter", () => {
  test("there is no state filter any more: a state in the query is ignored, and the scope still applies", () => {
    assert.deepEqual(Lead.buildListFilter(sales(5), { state: "west.Bengal", assignedTo: "9" }), { assignedToId: 5 });
    assert.deepEqual(Lead.buildListFilter(admin(), { state: "Goa" }), {});
  });

  test("search, employee and paging still work together", async () => {
    const db = installFakePrisma();
    db.lead.findMany = mock.fn(async () => []);
    db.lead.count = mock.fn(async () => 0);
    await Lead.findPageForUser(admin(), { assignedTo: "3", search: "asha", page: "2", limit: "25" });

    const args = db.lead.findMany.mock.calls[0].arguments[0];
    assert.equal(args.where.assignedToId, 3);
    assert.equal(args.where.OR.length, 4);
    assert.deepEqual([args.skip, args.take], [25, 25]);
    assert.deepEqual(db.lead.count.mock.calls[0].arguments[0].where, args.where);
  });

  test("a lead's state is still returned unchanged", async () => {
    const db = installFakePrisma();
    db.lead.findMany = mock.fn(async () => SOURCE_STATES.map((state, index) => leadRow({ id: index + 1, state })));
    const { leads } = await Lead.findPageForUser(admin(), {});
    assert.deepEqual(leads.map((lead) => lead.state), SOURCE_STATES);
  });
});

let db;
let rows;

const installStore = () => {
  db = installFakePrisma();
  const people = [
    userRow({ id: 1, role: "sales", name: "Sam" }),
    userRow({ id: 2, role: "admin", name: "Boss" }),
    userRow({ id: 3, role: "sales", name: "Other" }),
    userRow({ id: 4, role: "sales", name: "Gone", isActive: false }),
  ];
  rows = [
    leadRow({ id: 10, leadId: "LD-0001", assignedToId: 1, state: null }),
    leadRow({ id: 11, leadId: "LD-0002", assignedToId: 3, state: "west.Bengal" }),
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

describe("editing over HTTP", () => {
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

  const call = async (method, urlPath, userId, body) => {
    const response = await fetch(`${baseUrl}/api/leads${urlPath}`, {
      method,
      headers: { "Content-Type": "application/json", ...(userId ? { Authorization: `Bearer ${jwt.sign({ id: String(userId) }, process.env.JWT_SECRET)}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const SAM = 1;
  const BOSS = 2;

  test("an admin's state edit is stored as typed: no list, no correction, no translation", async () => {
    for (const state of ["India", "west.Bengal", "राजस्थान", "Tamil nadu", "Atlantis"]) {
      const { status, body } = await call("PUT", "/LD-0001", BOSS, { state });
      assert.equal(status, 200, state);
      assert.equal(body.data.state, state);
    }
  });

  test("an invalid state value (not text, or over 100 characters) is refused", async () => {
    for (const bad of [5, ["Goa"], { a: 1 }, "x".repeat(101)]) {
      assert.equal((await call("PUT", "/LD-0001", BOSS, { state: bad })).status, 400, JSON.stringify(bad).slice(0, 20));
    }
    assert.equal(rows[0].state, null);
  });

  test("a sales user cannot change the state, and the whole request is refused", async () => {
    const { status, body } = await call("PUT", "/LD-0001", SAM, { state: "Goa", name: "Renamed" });
    assert.equal(status, 403);
    assert.match(body.message, /Only an admin can edit a lead/);
    assert.equal(rows[0].state, null);
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("a lead can be created with a state typed as given", async () => {
    db.counter.findUnique = mock.fn(async () => ({ name: "leadId", seq: 5n }));
    db.counter.update = mock.fn(async () => ({ name: "leadId", seq: 6n }));
    db.lead.create = mock.fn(async ({ data }) => leadRow({ ...data, id: 20, assignedToId: 1 }));
    const ok = await call("POST", "/", BOSS, { name: "New", state: " west.Bengal ", assignedTo: "1" });
    assert.equal(ok.status, 201);
    assert.equal(db.lead.create.mock.calls[0].arguments[0].data.state, "west.Bengal");
  });

  describe("only the assigned employee can be changed from the list", () => {
    test("a sales user cannot edit any lead field: every attempt is refused and nothing is written", async () => {
      for (const body of [{ name: "Hacked" }, { phone: "000" }, { email: "x@y.z" }, { source: "Evil" }, { priority: "High" }, { customFields: { a: 1 } }, { status: "Lost" }]) {
        assert.equal((await call("PUT", "/LD-0001", SAM, body)).status, 403, JSON.stringify(body));
      }
      assert.equal(db.lead.update.mock.calls.length, 0);
    });

    test("an admin edit changes only the fields it names, and never custom data", async () => {
      const before = { ...rows[0] };
      const { status } = await call("PUT", "/LD-0001", BOSS, { name: "Renamed", customFields: { a: 1 }, leadId: "LD-9999", assignedToId: 3, createdById: 3 });
      assert.equal(status, 200);
      assert.deepEqual(db.lead.update.mock.calls[0].arguments[0].data, { name: "Renamed" });
      assert.deepEqual(rows[0].customFields, before.customFields);
      assert.equal(rows[0].leadId, "LD-0001");
    });

    test("a sales user cannot change someone else's lead either", async () => {
      assert.equal((await call("PUT", "/LD-0002", SAM, { name: "x" })).status, 403);
    });

    test("only an admin can reassign, only to an active sales employee", async () => {
      assert.equal((await call("PATCH", "/LD-0001/assign", SAM, { assignedTo: "3" })).status, 403);
      assert.equal((await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: "4" })).status, 400); // inactive
      assert.equal((await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: "2" })).status, 400); // an admin
      assert.equal((await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: "999" })).status, 400);
      assert.equal(rows[0].assignedToId, 1);
      const ok = await call("PATCH", "/LD-0001/assign", BOSS, { assignedTo: "3" });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.assignedTo.name, "Other");
    });
  });
});

describe("the Leads list screen", () => {
  const frontend = path.resolve(backendDir, "..", "frontend", "src");
  const read = (file) => fs.readFileSync(path.join(frontend, file), "utf8");

  test("the only inline editor is Assigned Employee", () => {
    const controls = read("components/leads/LeadInlineControls.jsx");
    assert.deepEqual([...controls.matchAll(/export const (\w+)/g)].map((match) => match[1]), ["AssigneeSelect"]);

    const list = read("pages/Leads.jsx");
    assert.match(list, /import \{ AssigneeSelect \} from/);
    assert.equal(/updateLead\b/.test(list), false); // the list saves nothing except through those two
    assert.equal(/<input[^>]*value=\{lead\./.test(list), false);
  });

  test("the columns are exactly the requested ones, and branch, requirement and status are gone", () => {
    const list = read("pages/Leads.jsx");
    assert.match(list, /\['Name', 'Phone', 'Email', 'State', \.\.\.\(isAdmin \? \['Assigned Employee'\] : \[\]\)\]/);
    assert.equal(/branch|requirement|status/i.test(list), false);
    assert.equal(/>\{lead\.leadId\}</.test(list), false); // no lead ID label under the name
  });

  test("state is shown as plain text, with no list of states in the frontend", () => {
    assert.match(read("pages/Leads.jsx"), /\{lead\.state \|\| '—'\}/);
    assert.equal(/STATES\b/.test(read("constants/index.js")), false);
  });
});

describe("migrations", () => {
  const migrations = path.join(backendDir, "prisma/migrations");
  const read = (suffix) => fs.readFileSync(path.join(migrations, fs.readdirSync(migrations).find((name) => name.endsWith(suffix)), "migration.sql"), "utf8");

  test("the state column migration adds a nullable column and an index and nothing destructive", () => {
    const sql = read("_add_lead_state");
    assert.match(sql, /ALTER TABLE `leads` ADD COLUMN `state` VARCHAR\(100\) NULL/);
    assert.match(sql, /CREATE INDEX `leads_state_idx`/);
    assert.equal(/\bDROP\s+(TABLE|COLUMN|DATABASE)|\bTRUNCATE\b|\bDELETE\s+FROM\b/i.test(sql.replace(/DROP TEMPORARY TABLE `_state_names`/, "")), false);
  });

  test("the remove_lead_priority migration drops only priority, and only when it exists; no code mentions priority", () => {
    const sql = read("_remove_lead_priority");
    assert.equal((sql.match(/DROP COLUMN/g) ?? []).length, 1);
    assert.match(sql, /DROP COLUMN `priority`/);
    assert.match(sql, /column_name = 'priority'/);
    assert.equal(/DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM|DROP COLUMN `(?!priority`)/i.test(sql), false);
    for (const file of ["models/Lead.js", "utils/leadImport.js", "utils/listOptions.js", "constants/index.js", "utils/seedDummyData.js", "prisma/schema.prisma"]) {
      assert.equal(/priorit/i.test(fs.readFileSync(path.join(backendDir, file), "utf8")), false, file);
    }
    for (const file of ["pages/AddLead.jsx", "constants/index.js", "pages/LeadDetails.jsx"]) {
      assert.equal(/priorit/i.test(fs.readFileSync(path.join(backendDir, "..", "frontend", "src", file), "utf8")), false, file);
    }
  });

  test("the remove_lead_status migration drops only status, its indexes, and only when they exist", () => {
    const sql = read("_remove_lead_status");
    assert.equal((sql.match(/DROP COLUMN/g) ?? []).length, 1);
    assert.match(sql, /DROP COLUMN `status`/);
    assert.equal(/DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM|DROP COLUMN `(?!status`)/i.test(sql), false);
    for (const index of ["leads_assigned_to_id_status_created_at_idx", "leads_status_idx"]) assert.ok(sql.includes(`DROP INDEX \`${index}\``), index);
    assert.ok(sql.indexOf("CREATE INDEX `leads_assigned_to_id_created_at_idx`") < sql.indexOf("DROP INDEX"), "the replacement index must exist before the old one is dropped (foreign key)");
    assert.equal((sql.match(/information_schema/g) ?? []).length, 4); // every step checks first
  });

  test("the schema and the application no longer have a lead status", () => {
    const schema = fs.readFileSync(path.join(backendDir, "prisma/schema.prisma"), "utf8");
    assert.equal(/LeadStatus|status\s+Lead|@@index\(\[status|status,/i.test(schema), false);
    for (const file of ["models/Lead.js", "utils/leadImport.js", "utils/listOptions.js", "constants/index.js", "utils/seedDummyData.js"]) {
      assert.equal(/LEAD_STATUSES|leadsByStatus|status:\s*(row|choice)|"status"/.test(fs.readFileSync(path.join(backendDir, file), "utf8")), false, file);
    }
  });
});
