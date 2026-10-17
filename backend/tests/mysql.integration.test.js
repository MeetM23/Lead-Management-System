import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { setPrismaClient } from "../config/db.js";
import { getDatabaseUrlProblem } from "../config/env.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";

// Runs against your REAL local database (XAMPP/MariaDB), only when TEST_DATABASE_URL is set in backend/.env.
// The app's own DATABASE_URL is never used.
//
// SAFETY: the database name must end in "_test", because these tests empty its tables.
//   1. In phpMyAdmin create an empty database named leadflow_test.
//   2. Put its login in backend/.env as TEST_DATABASE_URL (see .env.example).
//   3. Create its tables:  npm run db:test:setup
//   4. Run the tests:      npm test
const url = process.env.TEST_DATABASE_URL;
const databaseName = url ? new URL(url).pathname.replace(/^\//, "") : "";
const skip = !url
  ? "TEST_DATABASE_URL is not set"
  : getDatabaseUrlProblem(url)
    ? "TEST_DATABASE_URL is not configured yet (still the placeholder, or not a valid mysql:// URL)"
    : !databaseName.endsWith("_test")
      ? "TEST_DATABASE_URL must point to a database whose name ends in _test"
      : false;

const asUser = (row) => ({ _id: String(row.id), role: row.role });

describe("MySQL integration", { skip }, () => {
  let prisma;

  const clean = async () => {
    await prisma.leadNote.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();
    await prisma.counter.deleteMany();
  };

  const makeUser = (n, role = "sales") =>
    prisma.user.create({ data: { name: `User ${n}`, email: `user${n}@example.com`, password: "hash", role, employeeId: `USR-T${String(n).padStart(5, "0")}` } });

  const rawLead = (leadId, assignedToId, extra = {}) =>
    prisma.lead.create({ data: { leadId, name: `Lead ${leadId}`, assignedToId, createdById: assignedToId, ...extra } });

  before(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } });
    setPrismaClient(prisma);
    try {
      await clean();
    } catch (error) {
      throw new Error(`The test database is not ready (run "npm run db:test:setup" first): ${error.message}`);
    }
  });

  after(async () => {
    if (prisma) {
      await clean();
      await prisma.$disconnect();
    }
  });

  describe("lead IDs", () => {
    let seller;
    let boss;
    const addLead = (data) => Lead.createForUser({ ...data, assignedTo: String(seller.id) }, asUser(boss)); // only an admin adds leads
    before(async () => {
      await clean();
      boss = await makeUser(9, "admin");
      seller = await makeUser(1);
      // Existing leads with gaps, plus an ID that does not follow the LD-<number> pattern
      for (const id of ["LD-0001", "LD-0005", "LD-0300", "LEGACY-9"]) await rawLead(id, seller.id);
    });

    test("the counter starts after the highest existing number, not the row count", async () => {
      assert.equal(await Lead.getMaxLeadNumber(), 300);
      const lead = await addLead({ name: "First new" });
      assert.equal(lead.leadId, "LD-0301");
    });

    test("50 simultaneous creates get unique, gap-free IDs", async () => {
      const created = await Promise.all(Array.from({ length: 50 }, (_, i) => addLead({ name: `Parallel ${i}` })));
      const numbers = created.map((lead) => Number(lead.leadId.slice(3))).sort((a, b) => a - b);
      assert.equal(new Set(numbers).size, 50);
      assert.equal(numbers[0], 302);
      assert.equal(numbers[49], 351);
    });

    test("the ID of a deleted lead is never reissued", async () => {
      await Lead.deleteByLeadId("LD-0351");
      const lead = await addLead({ name: "After delete" });
      assert.equal(lead.leadId, "LD-0352");
    });

    test("existing public IDs are untouched", async () => {
      for (const id of ["LD-0001", "LD-0005", "LD-0300", "LEGACY-9"]) {
        assert.ok(await prisma.lead.findUnique({ where: { leadId: id } }), id);
      }
    });
  });

  describe("relationships", () => {
    let admin, seller, other;
    before(async () => {
      await clean();
      admin = await makeUser(10, "admin");
      seller = await makeUser(11);
      other = await makeUser(12);
    });

    test("a user who still has assigned leads cannot be deleted directly", async () => {
      await rawLead("LD-0001", seller.id);
      await assert.rejects(prisma.user.delete({ where: { id: seller.id } }), (error) => error.code === "P2003");
    });

    test("terminating a user moves their leads to the admin and keeps creator and note history", async () => {
      await rawLead("LD-0900", seller.id); // created by the employee who is deleted below
      const lead = { leadId: "LD-0900" };
      await Lead.addNote(lead.leadId, "a note", asUser(seller));

      const result = await User.terminateByEmployeeId(seller.employeeId, String(admin.id));
      assert.ok(result.reassignedCount >= 1);

      const kept = await Lead.findDetail(lead.leadId, asUser(admin));
      assert.equal(kept.assignedTo._id, String(admin.id));
      assert.equal(kept.createdBy, null); // creator deleted
      assert.equal(kept.notes[0].createdBy, null); // note author deleted
      assert.equal(await prisma.user.findUnique({ where: { id: seller.id } }), null);
    });

    test("deleting a lead deletes its notes", async () => {
      const lead = await Lead.createForUser({ name: "Notes", assignedTo: String(other.id) }, asUser(admin));
      await Lead.addNote(lead.leadId, "n1", asUser(other));
      const row = await prisma.lead.findUnique({ where: { leadId: lead.leadId } });

      await Lead.deleteByLeadId(lead.leadId);
      assert.equal(await prisma.leadNote.count({ where: { leadPk: row.id } }), 0);
    });

    test("email uniqueness ignores letter case", async () => {
      await User.createEmployee({ name: "A", employeeId: "CASE-1", email: "Case@Example.com", password: "long-enough-pw" });
      await assert.rejects(User.createEmployee({ name: "B", employeeId: "CASE-2", email: "case@example.COM", password: "long-enough-pw" }), (error) => error.statusCode === 409);
    });
  });

  describe("access, filters, statistics and custom fields", () => {
    let admin, seller, other;
    before(async () => {
      await clean();
      admin = await makeUser(20, "admin");
      seller = await makeUser(21);
      other = await makeUser(22);
      await rawLead("LD-0001", seller.id, { source: "Website" });
      await rawLead("LD-0002", seller.id, { source: "Referral" });
      await rawLead("LD-0003", other.id, { source: "Website" });
    });

    test("a sales user sees only their own leads, even when asking for someone else's", async () => {
      const own = await Lead.findForUser(asUser(seller), { assignedTo: String(other.id) });
      assert.deepEqual(own.map((lead) => lead.leadId).sort(), ["LD-0001", "LD-0002"]);
      assert.equal((await Lead.findForUser(asUser(admin), {})).length, 3);
    });

    test("filters, sorting and pagination work", async () => {
      assert.equal((await Lead.findForUser(asUser(admin), { source: "Website" })).length, 2);
      assert.equal((await Lead.findForUser(asUser(admin), { priority: "Bogus" })).length, 0);
      assert.deepEqual((await Lead.findForUser(asUser(admin), { sort: "leadId", limit: "2" })).map((l) => l.leadId), ["LD-0001", "LD-0002"]);
      assert.deepEqual((await Lead.findForUser(asUser(admin), { sort: "leadId", limit: "2", page: "2" })).map((l) => l.leadId), ["LD-0003"]);
      assert.equal((await Lead.findForUser(asUser(admin), { createdAt: { gte: "2999-01-01" } })).length, 0);
    });

    test("statistics are scoped and have the dashboard's shape", async () => {
      const all = await Lead.getStats(asUser(admin));
      assert.equal(all.totalLeads, 3);
      assert.deepEqual(all.leadsBySource.map((row) => [row._id, row.count]).sort(), [["Referral", 1], ["Website", 2]]);
      assert.match(all.leadsOverTime[0]._id, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(all.leadsOverTime.reduce((sum, row) => sum + row.count, 0), 3);

      const mine = await Lead.getStats(asUser(seller));
      assert.equal(mine.totalLeads, 2);
      assert.equal(mine.leadsOverTime.reduce((sum, row) => sum + row.count, 0), 2);
    });

    test("custom fields are stored as JSON and returned", async () => {
      await prisma.lead.update({ where: { leadId: "LD-0001" }, data: { customFields: { region: "North", budget: 5000 } } });
      const lead = await Lead.findDetail("LD-0001", asUser(admin));
      assert.deepEqual(lead.customFields, { region: "North", budget: 5000 });
      assert.deepEqual((await Lead.findDetail("LD-0002", asUser(admin))).customFields, {});
    });
  });
});
