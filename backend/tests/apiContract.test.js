import { describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Lead from "../models/Lead.js";
import { toId, toApiId, isUniqueViolation } from "../utils/ids.js";
import { parseListOptions } from "../utils/listOptions.js";
import { installFakePrisma, leadRow, userRow, sales, admin } from "./helpers/fakePrisma.js";

// These tests pin the response shapes the frontend relies on: `_id` as a string, nested people and notes.

let db;
beforeEach(() => { db = installFakePrisma(); });

describe("ids", () => {
  test("toId accepts only positive 32-bit integers (as numbers or digit strings)", () => {
    assert.equal(toId(5), 5);
    assert.equal(toId("12"), 12);
    for (const bad of [0, "0", -1, "-1", "1.5", 1.5, "abc", "", null, undefined, {}, [], ["1"], "99999999999", 2 ** 31, "507f1f77bcf86cd799439011", true]) {
      assert.equal(toId(bad), null, String(JSON.stringify(bad)));
    }
  });

  test("toApiId turns an internal id into the string `_id`", () => {
    assert.equal(toApiId(7), "7");
    assert.equal(toApiId(null), null);
    assert.equal(toApiId(undefined), null);
  });

  test("isUniqueViolation recognises Prisma's duplicate error, optionally for one column", () => {
    const error = { code: "P2002", meta: { target: "users_email_key" } };
    assert.equal(isUniqueViolation(error), true);
    assert.equal(isUniqueViolation(error, "email"), true);
    assert.equal(isUniqueViolation(error, "employee_id"), false);
    assert.equal(isUniqueViolation({ code: "P2025" }), false);
  });
});

describe("list options", () => {
  test("defaults to newest first, page 1, 100 per page", () => {
    assert.deepEqual(parseListOptions({}), { orderBy: [{ createdAt: "desc" }], skip: 0, take: 100 });
  });

  test("sort accepts only known columns, with an optional leading minus", () => {
    assert.deepEqual(parseListOptions({ sort: "name" }).orderBy, [{ name: "asc" }]);
    assert.deepEqual(parseListOptions({ sort: "-name,createdAt" }).orderBy, [{ name: "desc" }, { createdAt: "asc" }]);
    assert.deepEqual(parseListOptions({ sort: "password,$where,-createdBy" }).orderBy, [{ createdAt: "desc" }]);
    assert.deepEqual(parseListOptions({ sort: ["name"] }).orderBy, [{ createdAt: "desc" }]);
  });

  test("page and limit are sanitized and capped", () => {
    assert.deepEqual(parseListOptions({ page: "3", limit: "20" }), { orderBy: [{ createdAt: "desc" }], skip: 40, take: 20 });
    assert.equal(parseListOptions({ limit: "999999" }).take, 500);
    assert.equal(parseListOptions({ limit: "-5" }).take, 1);
    assert.deepEqual([parseListOptions({ page: "abc" }).skip, parseListOptions({ page: "-2" }).skip], [0, 0]);
  });
});

describe("lead response shapes", () => {
  const fullRow = () =>
    leadRow({
      id: 10,
      customFields: { region: "North" },
      assignedTo: { id: 2, name: "Sam", email: "sam@example.com", profilePic: "data:image/png;base64,AAA" },
      createdBy: { id: 1, name: "Ann", email: "ann@example.com", profilePic: null },
      notes: [
        { id: 4, leadPk: 10, content: "First", createdById: 2, createdAt: new Date("2025-02-01T00:00:00Z"), updatedAt: new Date("2025-02-01T00:00:00Z"),
          createdBy: { id: 2, name: "Sam", profilePic: "data:image/png;base64,AAA" } },
        { id: 5, leadPk: 10, content: "Orphan", createdById: null, createdAt: new Date("2025-02-02T00:00:00Z"), updatedAt: new Date("2025-02-02T00:00:00Z"),
          createdBy: null },
      ],
      assignedToId: 2,
    });

  test("detail: ids are strings, people include email and photo, notes carry their author", async () => {
    db.lead.findUnique = mock.fn(async () => fullRow());
    const lead = await Lead.findDetail("LD-0001", admin());

    assert.equal(lead._id, "10");
    assert.equal(lead.leadId, "LD-0001");
    assert.deepEqual(lead.assignedTo, { _id: "2", name: "Sam", email: "sam@example.com", profilePic: "data:image/png;base64,AAA" });
    assert.deepEqual(lead.createdBy, { _id: "1", name: "Ann", email: "ann@example.com" });
    assert.deepEqual(lead.customFields, { region: "North" });
    assert.deepEqual(lead.notes[0].createdBy, { _id: "2", name: "Sam", profilePic: "data:image/png;base64,AAA" });
    assert.equal(lead.notes[0]._id, "4");
    assert.equal(lead.notes[1].createdBy, null); // author deleted: the UI shows "Unknown"
    assert.ok(lead.createdAt instanceof Date);
  });

  test("list: people as { _id, name, email }; notes are plain with the author's id", async () => {
    db.lead.findMany = mock.fn(async () => [fullRow()]);
    const { leads: [lead] } = await Lead.findPageForUser(admin(), {});

    assert.deepEqual(Object.keys(lead).sort(), [
      "_id", "assignedTo", "createdAt", "createdBy", "customFields", "email", "leadId", "name", "notes", "phone", "source", "state", "updatedAt",
    ]);
    assert.equal(lead.notes[0].createdBy, "2");
    assert.equal(lead.notes[1].createdBy, null);
  });

  test("summary (create, update, assign, notes): people and note authors by name", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    db.lead.update = mock.fn(async () => ({}));
    const lead = await Lead.updateForUser("LD-0001", { name: "Renamed" }, admin());

    assert.equal(lead._id, "10");
    assert.deepEqual(lead.assignedTo, { _id: "1", name: "Sam", email: "sam@example.com" });
    assert.deepEqual(lead.notes, []);
    assert.deepEqual(lead.customFields, {}); // empty when nothing has been stored
  });

  test("the request for a view only asks the database for what that view shows", async () => {
    db.lead.findMany = mock.fn(async () => []);
    await Lead.findPageForUser(admin(), {});
    const list = db.lead.findMany.mock.calls[0].arguments[0].include;
    assert.equal(list.notes.include, undefined); // list notes are not joined to authors
    assert.deepEqual(list.assignedTo.select, { id: true, name: true, email: true });

    db.lead.findUnique = mock.fn(async () => leadRow());
    await Lead.findDetail("LD-0001", admin());
    const detail = db.lead.findUnique.mock.calls[0].arguments[0].include;
    assert.equal(detail.assignedTo.select.profilePic, true);
    assert.equal(detail.notes.include.createdBy.select.profilePic, true);
  });
});
