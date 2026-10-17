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
import { renderComponent } from "./helpers/renderComponent.js";
import { installFakePrisma, leadRow, userRow, admin } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in, and the React card is rendered to
// HTML in Node (not in a browser). The real MariaDB checks are described in the final report.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.resolve(backendDir, "..", "frontend", "src");
const read = (file) => fs.readFileSync(path.join(frontend, file), "utf8");

let db;
let rows;

const installStore = () => {
  db = installFakePrisma();
  const people = [
    userRow({ id: 1, name: "Sam Sales", role: "sales" }),
    userRow({ id: 2, name: "Boss Admin", role: "admin" }),
    userRow({ id: 3, name: "Other Sales", role: "sales" }),
  ];
  rows = [
    leadRow({ id: 10, leadId: "LD-0001", assignedToId: 1, finalRemark: null, name: "Asha", phone: "9811122233", state: "west.Bengal", customFields: { loan_requirement: "90lakh" } }),
    leadRow({ id: 11, leadId: "LD-0002", assignedToId: 3, finalRemark: "Sam closed this one.\nCustomer will pay next week." }),
    leadRow({ id: 12, leadId: "LD-0003", assignedToId: 1, finalRemark: "Written by Sam, now reassigned.", assignedTo: { id: 3, name: "Other Sales", email: "x" } }),
  ];
  rows[2].assignedToId = 3; // reassigned to another employee after Sam wrote the remark
  db.user.findUnique = mock.fn(async ({ where }) => people.find((row) => row.id === where.id) ?? null);
  db.lead.findUnique = mock.fn(async ({ where }) => rows.find((row) => row.id === where.id || row.leadId === where.leadId) ?? null);
  db.lead.update = mock.fn(async ({ where, data }) => Object.assign(rows.find((row) => row.id === where.id), data));
};

describe("final remark over HTTP", () => {
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
  const save = (leadId, user, finalRemark) => call("PUT", `/${leadId}/final-remark`, user, { finalRemark });
  const SAM = 1;
  const BOSS = 2;
  const OTHER = 3;

  test("an employee adds a final remark to their lead, and it is stored in its own column", async () => {
    const { status, body } = await save("LD-0001", SAM, "Customer wants a call back after the 15th.");
    assert.equal(status, 200);
    assert.equal(body.message, "Final remark saved");
    assert.equal(body.data.finalRemark, "Customer wants a call back after the 15th.");
    assert.deepEqual(db.lead.update.mock.calls[0].arguments[0], { where: { id: 10 }, data: { finalRemark: "Customer wants a call back after the 15th." } });
  });

  test("an employee updates an existing remark as the lead progresses", async () => {
    await save("LD-0001", SAM, "First contact made.");
    const second = await save("LD-0001", SAM, "Loan sanctioned.");
    assert.equal(second.body.data.finalRemark, "Loan sanctioned.");
    assert.equal(rows[0].finalRemark, "Loan sanctioned.");
  });

  test("multiline and long text, accents and non-English text are stored as written", async () => {
    const text = "Line one\n\nLine three – ₹5,00,000\nराजस्थान से कॉल";
    assert.equal((await save("LD-0001", SAM, text)).body.data.finalRemark, text);
    const long = "word ".repeat(999).trim(); // 4,994 characters
    assert.equal((await save("LD-0001", SAM, long)).body.data.finalRemark, long);
    const exactly = "x".repeat(5000);
    assert.equal((await save("LD-0001", SAM, exactly)).status, 200);
  });

  test("an empty remark is allowed and clears it; an unset lead simply has none", async () => {
    await save("LD-0001", SAM, "Something");
    for (const empty of ["", "   \n  ", null]) {
      const { status, body } = await save("LD-0001", SAM, empty);
      assert.equal(status, 200);
      assert.equal(body.data.finalRemark, null);
    }
    assert.equal(rows[0].finalRemark, null);
  });

  test("saving a remark changes nothing else: other fields, assignment, creator and notes stay as they were", async () => {
    const before = JSON.parse(JSON.stringify(rows[0]));
    await save("LD-0001", SAM, "Outcome recorded.");
    const data = db.lead.update.mock.calls[0].arguments[0].data;
    assert.deepEqual(Object.keys(data), ["finalRemark"]);
    for (const field of ["name", "phone", "email", "state", "source", "customFields", "assignedToId", "createdById", "leadId"]) {
      assert.deepEqual(rows[0][field], before[field], field);
    }
    assert.equal(db.lead.updateMany.mock.calls.length, 0);
    assert.equal(db.leadNote.create.mock.calls.length, 0);
  });

  test("other fields sent with the remark are ignored", async () => {
    const { status } = await call("PUT", "/LD-0001/final-remark", SAM, { finalRemark: "ok", assignedTo: "3", assignedToId: 3, name: "Hacked", state: "Goa", customFields: { a: 1 }, leadId: "LD-9" });
    assert.equal(status, 200);
    assert.deepEqual(Object.keys(db.lead.update.mock.calls[0].arguments[0].data), ["finalRemark"]);
    assert.equal(rows[0].assignedToId, 1);
    assert.equal(rows[0].name, "Asha");
  });

  test("the remark is separate from the notes and from the custom fields", async () => {
    const { body } = await save("LD-0001", SAM, "Outcome");
    assert.deepEqual(body.data.customFields, { loan_requirement: "90lakh" });
    assert.deepEqual(body.data.notes, []);
    assert.equal(db.leadNote.create.mock.calls.length, 0);
  });

  test("an employee cannot write the remark of another employee's lead", async () => {
    const { status } = await save("LD-0002", SAM, "Not mine");
    assert.equal(status, 403);
    assert.equal(rows[1].finalRemark, "Sam closed this one.\nCustomer will pay next week.");
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("an unauthenticated request, an unknown lead and a malformed lead are rejected", async () => {
    assert.equal((await save("LD-0001", null, "x")).status, 401);
    assert.equal((await save("LD-9999", SAM, "x")).status, 404);
    assert.equal((await save("not-a-lead", SAM, "x")).status, 404);
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("invalid remarks are rejected: not text, or longer than 5,000 characters", async () => {
    for (const bad of [5, true, ["a"], { text: "a" }]) {
      assert.equal((await save("LD-0001", SAM, bad)).status, 400, JSON.stringify(bad));
    }
    const tooLong = await save("LD-0001", SAM, "x".repeat(5001));
    assert.equal(tooLong.status, 400);
    assert.match(tooLong.body.message, /at most 5000 characters/);
    assert.equal(rows[0].finalRemark, null);
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("a request without the finalRemark field is refused and never wipes a saved remark", async () => {
    rows[0].finalRemark = "Keep this";
    const { status, body } = await call("PUT", "/LD-0001/final-remark", SAM, {});
    assert.equal(status, 400);
    assert.match(body.message, /finalRemark is required/);
    assert.equal(rows[0].finalRemark, "Keep this");
  });

  test("an admin sees the remark on the lead, including one left by an employee who no longer holds the lead", async () => {
    const own = await call("GET", "/LD-0002", BOSS);
    assert.equal(own.body.data.finalRemark, "Sam closed this one.\nCustomer will pay next week.");
    const reassigned = await call("GET", "/LD-0003", BOSS);
    assert.equal(reassigned.body.data.finalRemark, "Written by Sam, now reassigned.");
    assert.equal(reassigned.body.data.assignedTo.name, "Other Sales");
  });

  test("an admin can also write a remark (needed for leads an admin holds), and employees see their own lead's remark", async () => {
    assert.equal((await save("LD-0001", BOSS, "Admin note on outcome")).status, 200);
    assert.equal((await call("GET", "/LD-0001", SAM)).body.data.finalRemark, "Admin note on outcome");
  });

  test("an employee cannot read the remark of someone else's lead", async () => {
    assert.equal((await call("GET", "/LD-0002", SAM)).status, 403);
    assert.equal((await call("GET", "/LD-0002", null)).status, 401);
    // after the lead moved on, the previous employee no longer gets it
    assert.equal((await call("GET", "/LD-0003", SAM)).status, 403);
    assert.equal((await call("GET", "/LD-0003", OTHER)).body.data.finalRemark, "Written by Sam, now reassigned.");
  });

  test("existing leads with no remark load normally, with finalRemark null", async () => {
    const { status, body } = await call("GET", "/LD-0001", SAM);
    assert.equal(status, 200);
    assert.equal(body.data.finalRemark, null);
    assert.equal(body.data.name, "Asha");
  });

  test("the list does not carry the (possibly long) remark", async () => {
    db.lead.findMany = mock.fn(async () => rows);
    db.lead.count = mock.fn(async () => 3);
    const { body } = await call("GET", "/", BOSS);
    assert.ok(body.data.every((lead) => !("finalRemark" in lead)));
  });

  test("assigning, editing a lead or changing its state does not disturb the remark", async () => {
    assert.equal((await call("PATCH", "/LD-0002/assign", BOSS, { assignedTo: "1" })).body.data.finalRemark, "Sam closed this one.\nCustomer will pay next week.");
    assert.equal((await call("PUT", "/LD-0002", BOSS, { name: "Renamed" })).body.data.finalRemark, "Sam closed this one.\nCustomer will pay next week.");
    assert.equal(Object.keys(db.lead.update.mock.calls.at(-1).arguments[0].data).includes("finalRemark"), false);
  });

  test("only the final-remark endpoint can write it: a general update ignores it", async () => {
    await call("PUT", "/LD-0001", BOSS, { finalRemark: "sneaky", name: "Renamed" });
    assert.equal(rows[0].finalRemark, null);
    assert.equal(admin().role, "admin");
  });
});

describe("the Final Remark card", () => {
  test("shows the saved remark, multiline text intact, with a Save button and a counter", () => {
    const html = renderComponent("components/leads/FinalRemarkCard.jsx", { remark: "Line one\nLine two – ₹5,00,000", onSave: async () => ({ success: true }) });
    assert.match(html, /Final Remark/);
    assert.match(html, /<textarea[^>]*>Line one\nLine two – ₹5,00,000<\/textarea>/);
    assert.match(html, /maxLength="5000"|maxlength="5000"/i);
    assert.match(html, /Save/);
    assert.match(html, /\d+ \/ 5000/);
  });

  test("an empty or missing remark shows an empty box with a hint", () => {
    for (const remark of [null, undefined, ""]) {
      const html = renderComponent("components/leads/FinalRemarkCard.jsx", { remark, onSave: async () => ({ success: true }) });
      assert.match(html, /placeholder="No final remark yet"/);
      assert.match(html, /<textarea[^>]*><\/textarea>/);
      assert.match(html, /disabled=""[^>]*>Save|<button[^>]*disabled[^>]*>Save/); // nothing to save yet
    }
  });

  test("a long remark is shown in full and the box can be resized", () => {
    const long = "word ".repeat(999).trim();
    const html = renderComponent("components/leads/FinalRemarkCard.jsx", { remark: long, onSave: async () => ({ success: true }) });
    assert.ok(html.includes(long));
    assert.match(html, /resize-y/);
    assert.match(html, /4994 \/ 5000/);
  });

  test("the lead page uses it with the loaded lead and saves only the remark", () => {
    const page = read("pages/LeadDetails.jsx");
    assert.match(page, /<FinalRemarkCard remark=\{lead\.finalRemark\} onSave=\{handleSaveRemark\} \/>/);
    assert.match(page, /finalRemark: result\.data\.finalRemark/);
    assert.match(read("context/LeadsContext.jsx"), /final-remark/);
    const card = read("components/leads/FinalRemarkCard.jsx");
    for (const text of ["Final remark saved", "Could not save the final remark", "role={feedback.type === 'error' ? 'alert' : 'status'}"]) assert.ok(card.includes(text), text);
  });

  test("the limit in the card matches the server's", async () => {
    const card = read("components/leads/FinalRemarkCard.jsx");
    assert.match(card, /MAX_FINAL_REMARK_LENGTH = 5000/);
    assert.match(fs.readFileSync(path.join(backendDir, "models/Lead.js"), "utf8"), /MAX_FINAL_REMARK_LENGTH = 5000/);
  });
});

describe("the final remark model", () => {
  test("the model trims surrounding whitespace and stores null for empty text", async () => {
    installStore();
    const lead = await Lead.setFinalRemark("LD-0001", "  done  \n", { _id: "1", role: "sales" });
    assert.equal(lead.finalRemark, "done");
    const cleared = await Lead.setFinalRemark("LD-0001", "   ", { _id: "1", role: "sales" });
    assert.equal(cleared.finalRemark, null);
  });

  test("the migration only adds a nullable text column", () => {
    const migrations = path.join(backendDir, "prisma/migrations");
    const folder = fs.readdirSync(migrations).find((name) => name.endsWith("_add_lead_final_remark"));
    const sql = fs.readFileSync(path.join(migrations, folder, "migration.sql"), "utf8");
    assert.match(sql, /ALTER TABLE `leads` ADD COLUMN `final_remark` TEXT NULL/);
    assert.equal(/DROP|TRUNCATE|DELETE\s+FROM|UPDATE/i.test(sql), false);
  });
});
