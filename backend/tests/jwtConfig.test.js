import { describe, test, mock, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";
import protect from "../middleware/authMiddleware.js";
import { generateToken } from "../utils/generateToken.js";
import { getJwtSecretProblem, getDatabaseUrlProblem, assertRequiredConfig } from "../config/env.js";

// No database is used: the Prisma client is replaced by a stand-in.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const randomSecret = () => crypto.randomBytes(48).toString("hex");
let nextId = 100;
const newId = () => nextId++;

const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const originalSecret = process.env.JWT_SECRET;
let db;
beforeEach(() => {
  process.env.JWT_SECRET = randomSecret();
  db = installFakePrisma();
});
afterEach(() => {
  mock.restoreAll();
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

describe("database URL validation", () => {
  test("requires a mysql:// URL", () => {
    assert.equal(getDatabaseUrlProblem("mysql://user:pass@localhost:3306/leadflow"), null);
    for (const value of [undefined, "", "   ", 5]) assert.match(getDatabaseUrlProblem(value), /not set/);
    for (const value of ["postgres://localhost/x", "http://localhost/x", "localhost:3306"]) assert.match(getDatabaseUrlProblem(value), /must be a mysql/);
  });

  test("accepts the stock XAMPP login (root, no password) in both spellings", () => {
    assert.equal(getDatabaseUrlProblem("mysql://root@localhost:3306/leadflow"), null);
    assert.equal(getDatabaseUrlProblem("mysql://root:@localhost:3306/leadflow"), null);
  });

  test("rejects the USER/PASSWORD placeholder from .env.example with a helpful message", () => {
    assert.match(getDatabaseUrlProblem("mysql://USER:PASSWORD@localhost:3306/leadflow"), /placeholder/);
    assert.match(getDatabaseUrlProblem("mysql://root:PASSWORD@localhost:3306/leadflow"), /placeholder/);
    assert.match(getDatabaseUrlProblem("mysql://USER@localhost:3306/leadflow"), /placeholder/);
  });

  test("requires a database name and a parseable URL", () => {
    assert.match(getDatabaseUrlProblem("mysql://root@localhost:3306"), /database name/);
    assert.match(getDatabaseUrlProblem("mysql://root@localhost:3306/"), /database name/);
    assert.match(getDatabaseUrlProblem("mysql://not a url"), /valid URL/);
  });

  test("the error never echoes the URL", () => {
    const url = "postgres://user:hunter2@localhost/x";
    assert.throws(() => assertRequiredConfig({ DATABASE_URL: url, JWT_SECRET: randomSecret() }), (error) => !error.message.includes("hunter2") && /DATABASE_URL/.test(error.message));
  });
});

describe("JWT secret validation", () => {
  test("accepts a long random secret", () => {
    assert.equal(getJwtSecretProblem(randomSecret()), null);
    assert.equal(getJwtSecretProblem(crypto.randomBytes(48).toString("base64url").replace(/test|secret/gi, "x")), null);
  });

  test("rejects missing, empty and non-string values", () => {
    for (const value of [undefined, null, "", "   ", 12345678901234567890123456789012345]) {
      assert.ok(getJwtSecretProblem(value), `${String(value)} should be rejected`);
    }
  });

  test("rejects short secrets", () => {
    assert.match(getJwtSecretProblem("a1B2c3D4e5F6g7H8"), /too short/);
  });

  test("rejects long but repetitive secrets", () => {
    assert.match(getJwtSecretProblem("ab".repeat(40)), /repetitive/);
  });

  test("rejects placeholder-style secrets even when long", () => {
    for (const value of ["supersecretkey-" + randomSecret(), "your_jwt_key_" + randomSecret(), "changeme" + randomSecret()]) {
      assert.match(getJwtSecretProblem(value), /placeholder/);
    }
  });

  test("assertRequiredConfig throws without echoing the secret", () => {
    const weak = "short-weak-value";
    assert.throws(() => assertRequiredConfig({ JWT_SECRET: weak }), (error) => !error.message.includes(weak) && /JWT_SECRET/.test(error.message));
    assert.throws(() => assertRequiredConfig({}), /JWT_SECRET is not set/);
    assert.doesNotThrow(() => assertRequiredConfig({ JWT_SECRET: randomSecret(), DATABASE_URL: "mysql://u:p@localhost:3306/db" }));
  });
});

describe("token signing and verification use JWT_SECRET only", () => {
  const verify = async (token, storedUser) => {
    db.user.findUnique = mock.fn(async () => storedUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
  };

  test("a token signed with the configured secret is accepted", async () => {
    const stored = userRow({ id: newId(), role: "sales" });
    const { req, nextCalled } = await verify(generateToken(stored.id), stored);
    assert.equal(nextCalled, true);
    assert.equal(req.user._id, String(stored.id));
  });

  test("signing fails when JWT_SECRET is missing: there is no fallback secret", () => {
    delete process.env.JWT_SECRET;
    assert.throws(() => generateToken(newId()));
  });

  test("verification fails closed when JWT_SECRET is missing", async () => {
    const token = generateToken(newId());
    delete process.env.JWT_SECRET;
    mock.method(console, "error", () => {});
    const { res, nextCalled } = await verify(token, userRow({ id: newId(), role: "admin" }));
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test("a token signed with a well-known or previous secret is rejected", async () => {
    mock.method(console, "error", () => {});
    const stored = userRow({ id: newId(), role: "admin" });
    for (const oldSecret of ["weak-previous-key", "secret", randomSecret()]) {
      const forged = jwt.sign({ id: String(stored.id) }, oldSecret);
      const { res, nextCalled } = await verify(forged, stored);
      assert.equal(res.statusCode, 401);
      assert.equal(nextCalled, false);
    }
  });

  test("tokens issued before the secret was rotated stop working", async () => {
    mock.method(console, "error", () => {});
    const stored = userRow({ id: newId(), role: "sales" });
    const issuedBeforeRotation = generateToken(stored.id);

    assert.equal((await verify(issuedBeforeRotation, stored)).nextCalled, true);

    process.env.JWT_SECRET = randomSecret(); // rotation
    const afterRotation = await verify(issuedBeforeRotation, stored);
    assert.equal(afterRotation.res.statusCode, 401);
    assert.equal(afterRotation.nextCalled, false);

    assert.equal((await verify(generateToken(stored.id), stored)).nextCalled, true);
  });

  test("an unsigned (alg none) token is rejected", async () => {
    mock.method(console, "error", () => {});
    const stored = userRow({ id: newId(), role: "admin" });
    const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ id: String(stored.id) })}.`;
    const { res, nextCalled } = await verify(unsigned, stored);
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test("no source file hardcodes a JWT secret or adds a fallback", () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "tests", "uploads"].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith(".js")) continue;
        fs.readFileSync(full, "utf8").split("\n").forEach((line, index) => {
          const usesJwt = /jwt\.(sign|verify)\(/.test(line);
          const fallback = /JWT_SECRET\s*(\|\||\?\?)/.test(line);
          const literalSecret = /JWT_SECRET\s*[:=]\s*["'`][^"'`]+["'`]/.test(line);
          if (fallback || literalSecret) offenders.push(`${path.relative(backendDir, full)}:${index + 1}`);
          if (usesJwt && !/process\.env\.JWT_SECRET/.test(line + (fs.readFileSync(full, "utf8").split("\n")[index + 2] ?? ""))) {
            offenders.push(`${path.relative(backendDir, full)}:${index + 1} (secret not read from process.env.JWT_SECRET)`);
          }
        });
      }
    };
    walk(backendDir);
    assert.deepEqual(offenders, []);
  });
});

describe("server startup", () => {
  // Runs index.js from an empty directory with a bogus database address. A correct startup check exits before
  // connecting to anything. Variables are set explicitly (even to ""), because importing the Prisma client
  // loads backend/.env for any variable that is not already defined.
  const startServer = (env) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "leadflow-startup-"));
    try {
      return spawnSync(process.execPath, [path.join(backendDir, "index.js")], {
        cwd,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, DATABASE_URL: "mysql://user:pass@127.0.0.1:1/unused", JWT_SECRET: "", PORT: "0", ...env },
        encoding: "utf8",
        timeout: 15000,
      });
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  };

  test("refuses to start when JWT_SECRET is missing", () => {
    const result = startServer({});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /JWT_SECRET is not set/);
    assert.doesNotMatch(result.stdout, /Server running/);
  });

  test("refuses to start with a weak JWT_SECRET and never prints it", () => {
    const weak = "weakvalue123";
    const result = startServer({ JWT_SECRET: weak });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /too short/);
    assert.equal((result.stdout + result.stderr).includes(weak), false);
    assert.doesNotMatch(result.stdout, /Server running/);
  });

  test("refuses to start while DATABASE_URL still has the placeholder login", () => {
    const result = startServer({ DATABASE_URL: "mysql://USER:PASSWORD@localhost:3306/leadflow", JWT_SECRET: randomSecret() });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /placeholder/);
    assert.doesNotMatch(result.stdout, /Server running/);
  });

  test("refuses to start when DATABASE_URL is missing or not a MySQL URL, without printing it", () => {
    const bad = "postgres://user:hunter2@localhost/x";
    const missing = startServer({ DATABASE_URL: "", JWT_SECRET: randomSecret() });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /DATABASE_URL is not set/);

    const wrong = startServer({ DATABASE_URL: bad, JWT_SECRET: randomSecret() });
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /must be a mysql/);
    assert.equal((wrong.stdout + wrong.stderr).includes("hunter2"), false);
  });

  test("index.js validates configuration before connecting to the database", () => {
    const source = fs.readFileSync(path.join(backendDir, "index.js"), "utf8");
    assert.ok(source.indexOf("assertRequiredConfig();") > -1);
    assert.ok(source.indexOf("assertRequiredConfig();") < source.indexOf("connectDB();"));
  });
});
