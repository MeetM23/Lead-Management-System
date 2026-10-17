import { describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Lead from "../models/Lead.js";
import authorize from "../middleware/roleMiddleware.js";
import leadRouter from "../routes/leadRoutes.js";
import { installFakePrisma, leadRow, userRow, sales, admin } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by a stand-in.

let db;
beforeEach(() => { db = installFakePrisma(); });

const statusOf = async (promise) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error.statusCode;
  }
};

describe("buildListFilter", () => {
  test("sales scope is the authenticated user's id", () => {
    assert.equal(Lead.buildListFilter(sales(7), {}).assignedToId, 7);
  });

  test("sales cannot override scope with ?assignedTo=<other id>", () => {
    assert.equal(Lead.buildListFilter(sales(7), { assignedTo: "8" }).assignedToId, 7);
    assert.equal(Lead.buildListFilter(sales(7), { assignedToId: "8" }).assignedToId, 7);
  });

  test("sales cannot override scope with operator objects", () => {
    for (const assignedTo of [{ not: "7" }, { in: ["8"] }, { $ne: "7" }, ["8"]]) {
      assert.equal(Lead.buildListFilter(sales(7), { assignedTo }).assignedToId, 7);
    }
  });

  test("sales cannot filter by createdBy (owner fields are admin-only)", () => {
    assert.equal("createdById" in Lead.buildListFilter(sales(7), { createdBy: "3" }), false);
  });

  test("client-supplied role, user or id values are ignored", () => {
    const filter = Lead.buildListFilter(sales(7), { role: "admin", user: { role: "admin" }, id: "1", _id: "1" });
    assert.deepEqual(filter, { assignedToId: 7 });
  });

  test("operator keys, arrays and nested objects are dropped", () => {
    const filter = Lead.buildListFilter(sales(7), {
      $where: "sleep(1000)",
      OR: [{ status: "New" }],
      status: { not: "New" },
      source: ["a", "b"],
      name: { contains: "x" },
    });
    assert.deepEqual(filter, { assignedToId: 7 });
  });

  test("allowed filters are kept next to the scope", () => {
    const filter = Lead.buildListFilter(sales(7), { source: "Website", priority: "High", name: "Sam" });
    assert.deepEqual(filter, { source: "Website", priority: "High", name: "Sam", assignedToId: 7 });
  });

  test("a priority that does not exist matches nothing instead of being ignored", () => {
    assert.equal(Lead.buildListFilter(admin(), { priority: "Urgent" }).id, -1);
  });

  test("there is no status filter any more: a status in the query is ignored", () => {
    assert.deepEqual(Lead.buildListFilter(sales(7), { status: "New" }), { assignedToId: 7 });
    assert.deepEqual(Lead.buildListFilter(admin(), { status: "Bogus" }), {});
  });

  test("date ranges accept only gte/gt/lte/lt with valid dates", () => {
    const filter = Lead.buildListFilter(sales(7), {
      createdAt: { gte: "2024-01-01T00:00:00.000Z", $gt: "2024-01-02", lte: "not a date", where: "1" },
    });
    assert.deepEqual(Object.keys(filter.createdAt), ["gte"]);
    assert.ok(filter.createdAt.gte instanceof Date);
  });

  test("admin may filter by assignedTo; invalid ids are ignored", () => {
    assert.equal(Lead.buildListFilter(admin(), { assignedTo: "42" }).assignedToId, 42);
    assert.equal(Lead.buildListFilter(admin(), { createdBy: "5" }).createdById, 5);
    for (const bad of ["nope", "0", "-3", "1.5", "99999999999", { not: "1" }]) {
      assert.equal("assignedToId" in Lead.buildListFilter(admin(), { assignedTo: bad }), false, JSON.stringify(bad));
    }
  });

  test("admin without filters sees everything (empty filter)", () => {
    assert.deepEqual(Lead.buildListFilter(admin(), {}), {});
  });

  test("unknown role is rejected", () => {
    assert.throws(() => Lead.buildListFilter({ _id: "1", role: "x" }, {}), (error) => error.statusCode === 403);
  });
});

describe("findForUser", () => {
  test("query sent to the database is scoped to the sales user even with malicious params", async () => {
    await Lead.findForUser(sales(7), { assignedTo: "8", "assignedTo[not]": "7", sort: "password", limit: "999999" });

    const { where, take, orderBy } = db.lead.findMany.mock.calls[0].arguments[0];
    assert.equal(where.assignedToId, 7);
    assert.equal(take, 500);
    assert.deepEqual(orderBy, [{ createdAt: "desc" }]);
  });
});

describe("findDetail", () => {
  test("sales cannot view another user's lead", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 2 }));
    assert.equal(await statusOf(Lead.findDetail("LD-0001", sales(1))), 403);
  });

  test("sales can view their own lead", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    assert.equal((await Lead.findDetail("LD-0001", sales(1))).leadId, "LD-0001");
  });

  test("admin can view any lead", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 2 }));
    assert.equal((await Lead.findDetail("LD-0001", admin())).leadId, "LD-0001");
  });

  test("unknown lead id returns null", async () => {
    assert.equal(await Lead.findDetail("LD-9999", sales()), null);
  });
});

describe("updateForUser", () => {
  const withLead = (lead) => { db.lead.findUnique = mock.fn(async () => lead); };

  test("sales cannot update another user's lead", async () => {
    withLead(leadRow({ assignedToId: 2 }));
    assert.equal(await statusOf(Lead.updateForUser("LD-0001", { priority: "High" }, sales(1))), 403);
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("sales cannot reassign or change creator of their own lead", async () => {
    withLead(leadRow({ assignedToId: 1 }));
    for (const body of [{ assignedTo: "2" }, { createdBy: "2" }]) {
      assert.equal(await statusOf(Lead.updateForUser("LD-0001", body, sales(1))), 403);
    }
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("sales cannot edit any field of their own lead: only an admin can", async () => {
    withLead(leadRow({ assignedToId: 1 }));
    for (const body of [{ name: "Hacked" }, { priority: "High" }, { state: "Goa" }, { status: "Contacted" }, {}]) {
      assert.equal(await statusOf(Lead.updateForUser("LD-0001", body, sales(1))), 403, JSON.stringify(body));
    }
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("an invalid priority is a 400", async () => {
    withLead(leadRow({ assignedToId: 1 }));
    assert.equal(await statusOf(Lead.updateForUser("LD-0001", { priority: "Bogus" }, admin())), 400);
  });

  test("admin cannot reassign through update", async () => {
    withLead(leadRow());
    assert.equal(await statusOf(Lead.updateForUser("LD-0001", { assignedTo: "2" }, admin())), 400);
  });

  test("admin edits contact fields; an update that changes nothing writes nothing", async () => {
    withLead(leadRow({ name: "Old" }));
    await Lead.updateForUser("LD-0001", { name: "  New  ", email: "lead@example.com" }, admin());
    assert.deepEqual(db.lead.update.mock.calls[0].arguments[0].data, { name: "New" });

    db.lead.update.mock.resetCalls();
    await Lead.updateForUser("LD-0001", { name: "Old" }, admin());
    assert.equal(db.lead.update.mock.calls.length, 0);
  });
});

describe("assign", () => {
  test("sales cannot assign leads", async () => {
    assert.equal(await statusOf(Lead.assign("LD-0001", "2", sales())), 403);
  });

  test("admin can only assign to a sales user", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow());
    db.user.findUnique = mock.fn(async () => userRow({ id: 5, role: "admin" }));
    assert.equal(await statusOf(Lead.assign("LD-0001", "5", admin())), 400);
    assert.equal(await statusOf(Lead.assign("LD-0001", "not-an-id", admin())), 400);
    assert.equal(db.lead.update.mock.calls.length, 0);
  });

  test("admin assigns to a sales user", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow());
    db.user.findUnique = mock.fn(async () => userRow({ id: 5, role: "sales" }));
    await Lead.assign("LD-0001", "5", admin());
    assert.deepEqual(db.lead.update.mock.calls[0].arguments[0].data, { assignedToId: 5 });
  });
});

describe("notes", () => {
  const note = (createdById) => ({ id: 3, leadPk: 10, content: "x", createdById });

  test("sales cannot add a note to another user's lead", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 2 }));
    assert.equal(await statusOf(Lead.addNote("LD-0001", "hi", sales(1))), 403);
    assert.equal(db.leadNote.create.mock.calls.length, 0);
  });

  test("sales cannot edit or delete notes on a lead no longer assigned to them, even their own note", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 2 }));
    db.leadNote.findFirst = mock.fn(async () => note(1));
    assert.equal(await statusOf(Lead.updateNote("LD-0001", "3", "new text", sales(1))), 403);
    assert.equal(await statusOf(Lead.deleteNote("LD-0001", "3", sales(1))), 403);
    assert.equal(db.leadNote.update.mock.calls.length + db.leadNote.delete.mock.calls.length, 0);
  });

  test("a note can only be edited or deleted by its author", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    db.leadNote.findFirst = mock.fn(async () => note(2));
    assert.equal(await statusOf(Lead.updateNote("LD-0001", "3", "new text", sales(1))), 403);
    assert.equal(await statusOf(Lead.deleteNote("LD-0001", "3", sales(1))), 403);
  });

  test("a missing or malformed note id is a 404", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    assert.equal(await statusOf(Lead.updateNote("LD-0001", "3", "text", sales(1))), 404);
    assert.equal(await statusOf(Lead.deleteNote("LD-0001", "abc", sales(1))), 404);
  });

  test("empty note content is a 400, not a database error", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    for (const content of [undefined, "", 5, { a: 1 }]) {
      assert.equal(await statusOf(Lead.addNote("LD-0001", content, sales(1))), 400);
    }
  });

  test("the author can add, edit and delete notes on their own lead", async () => {
    db.lead.findUnique = mock.fn(async () => leadRow({ assignedToId: 1 }));
    db.leadNote.findFirst = mock.fn(async () => note(1));

    await Lead.addNote("LD-0001", "hello", sales(1));
    assert.deepEqual(db.leadNote.create.mock.calls[0].arguments[0].data, { leadPk: 10, content: "hello", createdById: 1 });

    await Lead.updateNote("LD-0001", "3", "edited", sales(1));
    assert.deepEqual(db.leadNote.update.mock.calls[0].arguments[0], { where: { id: 3 }, data: { content: "edited" } });

    await Lead.deleteNote("LD-0001", "3", sales(1));
    assert.deepEqual(db.leadNote.delete.mock.calls[0].arguments[0], { where: { id: 3 } });
  });
});

describe("getStats", () => {
  test("every sales statistic is scoped to the user's own leads", async () => {
    await Lead.getStats(sales(7));

    assert.deepEqual(db.lead.count.mock.calls[0].arguments[0], { where: { assignedToId: 7 } });
    for (const call of db.lead.groupBy.mock.calls) assert.equal(call.arguments[0].where.assignedToId, 7);
    const perDay = JSON.stringify(db.$queryRaw.mock.calls[0].arguments);
    assert.match(perDay, /assigned_to_id/);
    assert.match(perDay, /7/);
  });

  test("admin statistics are unscoped", async () => {
    await Lead.getStats(admin());
    assert.deepEqual(db.lead.count.mock.calls[0].arguments[0], { where: {} });
    assert.doesNotMatch(JSON.stringify(db.$queryRaw.mock.calls[0].arguments), /assigned_to_id/);
  });

  test("results keep the dashboard's response shape", async () => {
    db.lead.count = mock.fn(async () => 5);
    db.lead.groupBy = mock.fn(async ({ by }) =>
      by[0] === "state" ? [{ state: "Gujarat", _count: { _all: 4 } }]
        : [{ source: "Website", _count: { _all: 5 } }]
    );
    db.$queryRaw = mock.fn(async () => [{ day: "2025-01-02", count: 4n }]);

    assert.deepEqual(await Lead.getStats(admin()), {
      totalLeads: 5,
      leadsOverTime: [{ _id: "2025-01-02", count: 4 }],
      leadsBySource: [{ _id: "Website", count: 5 }],
      leadsByState: [{ _id: "Gujarat", count: 4 }],
    });
  });
});

describe("route protection", () => {
  const runAuthorize = (user) => {
    let status = null;
    let nextCalled = false;
    const res = { status: (code) => ({ json: () => { status = code; } }) };
    authorize("admin")({ user }, res, () => { nextCalled = true; });
    return { status, nextCalled };
  };

  test("authorize('admin') blocks sales and allows admin", () => {
    assert.deepEqual(runAuthorize(sales()), { status: 403, nextCalled: false });
    assert.deepEqual(runAuthorize(admin()), { status: null, nextCalled: true });
  });

  test("delete lead and assign lead routes carry an extra (role) middleware", () => {
    const layerCount = (path, method) =>
      leadRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack
        .filter((handler) => handler.method === method).length;

    assert.equal(layerCount("/:leadId", "delete"), 2);
    assert.equal(layerCount("/:leadId/assign", "patch"), 2);
  });
});
