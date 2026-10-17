import { describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Lead from "../models/Lead.js";
import { installFakePrisma, leadRow, userRow, admin } from "./helpers/fakePrisma.js";

// No database is used. The counters table is replaced by an in-memory stand-in that behaves like the real one:
// the increment is a single atomic step and creating an existing counter fails with a unique-key error (P2002).
// Real-MySQL behaviour is covered by mysql.integration.test.js, which only runs when TEST_DATABASE_URL is set.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tick = () => new Promise((resolve) => setImmediate(resolve)); // lets concurrent callers interleave

const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

// `existing` pre-populates counters; `max` is the highest LD- number the leads table would report
const installCounter = ({ existing = {}, max = 0 } = {}) => {
  const db = installFakePrisma();
  db.user.findUnique = mock.fn(async () => userRow({ id: 5, role: "sales" })); // the employee the admin assigns leads to
  const store = new Map(Object.entries(existing));
  const stats = { maxQueries: 0 };

  db.counter.findUnique = mock.fn(async ({ where: { name } }) => {
    await tick();
    return store.has(name) ? { name, seq: BigInt(store.get(name)) } : null;
  });
  db.counter.create = mock.fn(async ({ data }) => {
    await tick();
    if (store.has(data.name)) throw uniqueViolation();
    store.set(data.name, Number(data.seq));
    return data;
  });
  db.counter.update = mock.fn(async ({ where: { name }, data }) => {
    await tick();
    const seq = store.get(name) + data.seq.increment; // read-modify-write with no await in between: atomic
    store.set(name, seq);
    return { name, seq: BigInt(seq) };
  });
  db.$queryRaw = mock.fn(async () => {
    stats.maxQueries += 1;
    return [{ max: max ? BigInt(max) : null }];
  });

  return { db, store, stats };
};

// Makes lead.create behave like the database: echoes the lead it was given
const echoCreates = (db) => {
  let nextRowId = 1000;
  db.lead.create = mock.fn(async ({ data }) => leadRow({ id: nextRowId++, leadId: data.leadId, name: data.name }));
};

describe("sequential IDs", () => {
  test("a new database starts at LD-0001 and counts up", async () => {
    installCounter();
    assert.equal(await Lead.generateLeadId(), "LD-0001");
    assert.equal(await Lead.generateLeadId(), "LD-0002");
    assert.equal(await Lead.generateLeadId(), "LD-0003");
  });

  test("keeps the public format, growing past four digits", async () => {
    installCounter({ existing: { leadId: 9998 } });
    assert.equal(await Lead.generateLeadId(), "LD-9999");
    assert.equal(await Lead.generateLeadId(), "LD-10000");
  });
});

describe("initialization from existing leads", () => {
  test("starts after the highest existing number, not the number of leads", async () => {
    const { db, stats } = installCounter({ max: 305 }); // only a few rows may exist, but the highest ID is LD-0305
    assert.equal(await Lead.generateLeadId(), "LD-0306");
    assert.equal(await Lead.generateLeadId(), "LD-0307");
    assert.equal(stats.maxQueries, 1);
    assert.equal(db.lead.count.mock.calls.length, 0);
  });

  test("the max-number query reads the numeric suffix of LD-<digits> IDs only", async () => {
    const { db } = installCounter({ max: 12 });
    assert.equal(await Lead.getMaxLeadNumber(), 12);
    const sql = db.$queryRaw.mock.calls[0].arguments[0].join(" ");
    assert.match(sql, /CAST\(lead_id AS BINARY\) REGEXP '\^LD-\[0-9\]\{1,9\}\$'/);
    assert.doesNotMatch(sql, /REGEXP_LIKE/); // not available on MariaDB
    assert.match(sql, /MAX\(CAST\(SUBSTRING\(lead_id, 4\) AS UNSIGNED\)\)/);
    assert.doesNotMatch(sql, /COUNT/i);
  });

  test("an existing counter is used as is and never re-initialized", async () => {
    const { stats } = installCounter({ existing: { leadId: 10 }, max: 500 });
    assert.equal(await Lead.generateLeadId(), "LD-0011");
    assert.equal(stats.maxQueries, 0);
  });

  test("with no leads at all the first ID is LD-0001", async () => {
    installCounter({ max: 0 });
    assert.equal(await Lead.generateLeadId(), "LD-0001");
  });
});

describe("deleted leads", () => {
  test("IDs of deleted leads are never reused", async () => {
    const { db, store } = installCounter({ max: 3 });
    assert.equal(await Lead.generateLeadId(), "LD-0004");

    // Leads 3 and 4 are deleted: the highest remaining ID is now LD-0002, but the counter does not go back
    db.$queryRaw = mock.fn(async () => [{ max: 2n }]);
    assert.equal(await Lead.generateLeadId(), "LD-0005");
    assert.equal(store.get("leadId"), 5);
  });
});

describe("concurrent creation", () => {
  test("many simultaneous requests get unique, gap-free IDs", async () => {
    installCounter({ existing: { leadId: 300 } });
    const ids = await Promise.all(Array.from({ length: 200 }, () => Lead.generateLeadId()));

    assert.equal(new Set(ids).size, 200);
    const numbers = ids.map((id) => Number(id.slice(3))).sort((a, b) => a - b);
    assert.equal(numbers[0], 301);
    assert.equal(numbers[199], 500);
  });

  test("concurrent first requests on an empty counter all succeed with distinct IDs", async () => {
    const { db } = installCounter({ max: 40 });
    echoCreates(db);

    const created = await Promise.all(Array.from({ length: 30 }, () => Lead.createForUser({ name: "A", assignedTo: "5" }, admin())));
    const ids = created.map((lead) => lead.leadId);

    assert.equal(new Set(ids).size, 30);
    assert.equal(Math.min(...ids.map((id) => Number(id.slice(3)))), 41);
    assert.equal(Math.max(...ids.map((id) => Number(id.slice(3)))), 70);
  });
});

describe("creating a lead", () => {
  const retryableFailure = (code) => Object.assign(new Error("conflict"), { code });

  const stubCreate = (db, behaviour) => {
    const attempts = [];
    db.lead.create = mock.fn(async ({ data }) => {
      attempts.push(data.leadId);
      return behaviour(attempts.length, data);
    });
    return attempts;
  };

  test("uses the generated ID and links the creator (the admin) and the chosen employee", async () => {
    const { db } = installCounter({ max: 7 });
    echoCreates(db);

    const lead = await Lead.createForUser({ name: "  Ann  ", email: "ann@example.com", assignedTo: "5" }, admin(4));

    assert.equal(lead.leadId, "LD-0008");
    const data = db.lead.create.mock.calls[0].arguments[0].data;
    assert.deepEqual(
      { name: data.name, email: data.email, createdById: data.createdById, assignedToId: data.assignedToId },
      { name: "Ann", email: "ann@example.com", createdById: 4, assignedToId: 5 }
    );
  });

  test("the lead and its counter increment run in one transaction", async () => {
    const { db } = installCounter({ max: 7 });
    echoCreates(db);
    await Lead.createForUser({ name: "A", assignedTo: "5" }, admin());
    assert.equal(db.$transaction.mock.calls.length, 1);
  });

  test("on a unique-key conflict it takes the next number and succeeds", async () => {
    const { db } = installCounter({ max: 7 });
    const attempts = stubCreate(db, (n, data) => {
      if (n === 1) throw uniqueViolation();
      return leadRow({ leadId: data.leadId });
    });
    await Lead.createForUser({ name: "A", assignedTo: "5" }, admin());
    assert.deepEqual(attempts, ["LD-0008", "LD-0009"]);
  });

  test("a deadlock or write conflict is retried too", async () => {
    const { db } = installCounter({ max: 7 });
    const attempts = stubCreate(db, (n, data) => {
      if (n === 1) throw retryableFailure("P2034");
      return leadRow({ leadId: data.leadId });
    });
    await Lead.createForUser({ name: "A", assignedTo: "5" }, admin());
    assert.equal(attempts.length, 2);
  });

  test("gives up after a few attempts instead of looping forever", async () => {
    const { db } = installCounter({ max: 7 });
    const attempts = stubCreate(db, () => { throw uniqueViolation(); });
    await assert.rejects(Lead.createForUser({ name: "A", assignedTo: "5" }, admin()), (error) => error.code === "P2002");
    assert.equal(attempts.length, 5);
  });

  test("other errors are not retried", async () => {
    const { db } = installCounter({ max: 7 });
    const attempts = stubCreate(db, () => { throw new Error("connection lost"); });
    await assert.rejects(Lead.createForUser({ name: "A", assignedTo: "5" }, admin()), /connection lost/);
    assert.equal(attempts.length, 1);
  });

  test("invalid input is rejected before any ID is taken", async () => {
    const { db } = installCounter({ max: 7 });
    for (const data of [{}, { name: "" }, { name: 5 }, { name: "A", email: { a: 1 } }]) {
      await assert.rejects(Lead.createForUser({ assignedTo: "5", ...data }, admin()), (error) => error.statusCode === 400, JSON.stringify(data));
    }
    assert.equal(db.counter.update.mock.calls.length, 0);
  });
});

describe("single generator", () => {
  const walk = (dir, found = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "tests", "uploads", "prisma"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, found);
      else if (entry.name.endsWith(".js")) found.push(full);
    }
    return found;
  };

  test("the LD- format is built in exactly one place (the Lead model)", () => {
    const builders = walk(backendDir).filter((file) => /`LD-\$\{|"LD-"\s*\+|'LD-'\s*\+/.test(fs.readFileSync(file, "utf8")));
    assert.deepEqual(builders.map((file) => path.relative(backendDir, file).split(path.sep).join("/")), ["models/Lead.js"]);
  });

  test("no ID generation uses a document count", () => {
    const source = fs.readFileSync(path.join(backendDir, "models/Lead.js"), "utf8");
    assert.equal(/count\s*\+\s*1/.test(source), false);
    assert.equal(/lead\.count\(\)[^;]*LD-/.test(source), false);
  });

  test("the seeder takes its IDs from the same generator (through the Lead model)", () => {
    const source = fs.readFileSync(path.join(backendDir, "utils/seedDummyData.js"), "utf8");
    assert.match(source, /Lead\.createDemoLeads\(/);
    assert.equal(/LD-/.test(source), false);
  });
});
