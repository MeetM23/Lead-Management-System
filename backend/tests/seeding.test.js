import { describe, test, mock, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import seedDummyData, { getSeedingBlockReason } from "../utils/seedDummyData.js";
import { installFakePrisma, noQueriesMade, userRow } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by a stand-in.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(backendDir, relativePath), "utf8");

const DEMO_PASSWORD = "demo-password-for-tests";
const allowedEnv = { NODE_ENV: "development", ENABLE_SEEDING: "true", SEED_DEMO_PASSWORD: DEMO_PASSWORD };

let db;
beforeEach(() => { db = installFakePrisma(); });
afterEach(() => mock.restoreAll());

describe("seeding is disabled by default", () => {
  test("blocked with an empty environment", () => {
    assert.ok(getSeedingBlockReason({}));
  });

  test("blocked in development without the flag", () => {
    assert.ok(getSeedingBlockReason({ NODE_ENV: "development", SEED_DEMO_PASSWORD: DEMO_PASSWORD }));
  });

  test("only the exact value \"true\" enables it", () => {
    for (const value of ["false", "TRUE", "True", "1", "yes", "", " true"]) {
      assert.ok(getSeedingBlockReason({ ...allowedEnv, ENABLE_SEEDING: value }), `ENABLE_SEEDING=${JSON.stringify(value)} should not enable seeding`);
    }
  });

  test("blocked when NODE_ENV is unset or unknown, because that could be a production host", () => {
    for (const NODE_ENV of [undefined, "", "staging", "prod"]) {
      assert.ok(getSeedingBlockReason({ ...allowedEnv, NODE_ENV }), `NODE_ENV=${JSON.stringify(NODE_ENV)} should block seeding`);
    }
  });

  test("blocked without a demo password or with a short one", () => {
    assert.ok(getSeedingBlockReason({ ...allowedEnv, SEED_DEMO_PASSWORD: undefined }));
    assert.ok(getSeedingBlockReason({ ...allowedEnv, SEED_DEMO_PASSWORD: "short" }));
  });

  test("allowed only when explicitly enabled in development or test", () => {
    assert.equal(getSeedingBlockReason(allowedEnv), null);
    assert.equal(getSeedingBlockReason({ ...allowedEnv, NODE_ENV: "test" }), null);
  });
});

describe("production is always blocked", () => {
  test("blocked even when the flag and password are set", () => {
    assert.match(getSeedingBlockReason({ ...allowedEnv, NODE_ENV: "production" }), /production/);
  });

  test("the seeder touches no data in production, even with the flag enabled", async () => {
    mock.method(console, "log", () => {});

    assert.equal(await seedDummyData({ ...allowedEnv, NODE_ENV: "production" }), false);
    assert.equal(noQueriesMade(db), true);
  });

  test("the seeder touches no data by default", async () => {
    mock.method(console, "log", () => {});

    assert.equal(await seedDummyData({}), false);
    assert.equal(noQueriesMade(db), true);
  });
});

describe("demo credentials", () => {
  test("accounts use the configured password, never a hardcoded one", async () => {
    // No admin and no sales users yet; plenty of leads, so the run stops before creating any
    db.user.findFirst = mock.fn(async () => null);
    db.user.findUnique = mock.fn(async () => null);
    db.user.count = mock.fn(async () => 0);
    db.user.create = mock.fn(async ({ data }) => userRow({ id: 1, ...data }));
    db.user.createMany = mock.fn(async ({ data }) => ({ count: data.length }));
    db.user.findMany = mock.fn(async () => [userRow({ id: 2 })]);
    db.lead.count = mock.fn(async () => 100);
    mock.method(console, "log", () => {});

    await seedDummyData(allowedEnv);

    const admin = db.user.create.mock.calls[0].arguments[0].data;
    const sellers = db.user.createMany.mock.calls[0].arguments[0].data;
    assert.equal(await bcrypt.compare(DEMO_PASSWORD, admin.password), true);
    assert.equal(await bcrypt.compare("password123", admin.password), false);
    assert.equal(sellers.length, 10);
    assert.equal(await bcrypt.compare(DEMO_PASSWORD, sellers[0].password), true);
    assert.equal(db.lead.createMany.mock.calls.length + db.lead.create.mock.calls.length, 0);
  });

  test("demo leads are created through the Lead model, with generated IDs", async () => {
    let created = 0;
    db.user.findFirst = mock.fn(async () => userRow({ id: 1, role: "admin" }));
    db.user.count = mock.fn(async () => 10);
    db.user.findMany = mock.fn(async () => [userRow({ id: 2 })]);
    db.lead.count = mock.fn(async () => 0);
    db.counter.findUnique = mock.fn(async () => ({ name: "leadId", seq: 0n }));
    db.counter.update = mock.fn(async () => ({ name: "leadId", seq: BigInt(++created) }));
    mock.method(console, "log", () => {});

    await seedDummyData(allowedEnv);

    assert.equal(db.lead.create.mock.calls.length, 300);
    assert.equal(db.lead.create.mock.calls[0].arguments[0].data.leadId, "LD-0001");
    assert.equal(db.lead.create.mock.calls[299].arguments[0].data.leadId, "LD-0300");
  });

  test("no demo password is hardcoded in the seeder source", () => {
    assert.equal(/password123/i.test(read("utils/seedDummyData.js")), false);
  });
});

describe("server startup", () => {
  test("index.js neither imports nor calls the seeder", () => {
    assert.equal(/seed/i.test(read("index.js")), false);
  });

  test("seeding is only reachable through the explicit seed script", () => {
    const callers = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "tests", "uploads"].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js") && /seedDummyData/.test(fs.readFileSync(full, "utf8"))) {
          callers.push(path.relative(backendDir, full).split(path.sep).join("/"));
        }
      }
    };
    walk(backendDir);
    assert.deepEqual(callers.sort(), ["utils/runSeed.js", "utils/seedDummyData.js"]);
    assert.equal(JSON.parse(read("package.json")).scripts.seed, "node utils/runSeed.js");
  });

  test(".env.example documents the flag and defaults it to off", () => {
    assert.match(read(".env.example"), /^ENABLE_SEEDING=false$/m);
  });
});
