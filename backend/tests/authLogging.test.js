import { describe, test, mock, afterEach, beforeEach, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginUser } from "../controllers/authController.js";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by a stand-in.

const PASSWORD = "S3cret-Passw0rd-For-Tests";
const WRONG_PASSWORD = "Wr0ng-Passw0rd-For-Tests";

const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

// Records everything written through any console method
const captureConsole = () => {
  const lines = [];
  for (const method of ["log", "info", "warn", "error", "debug"]) {
    mock.method(console, method, (...args) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg) ?? String(arg))).join(" "));
    });
  }
  return lines;
};

let passwordHash;
let db;

before(async () => {
  process.env.JWT_SECRET = "test-secret-not-a-real-secret";
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});
beforeEach(() => { db = installFakePrisma(); });
afterEach(() => mock.restoreAll());

describe("login", () => {
  const attempt = async ({ user, password = PASSWORD, findUnique }) => {
    db.user.findUnique = mock.fn(findUnique ?? (async () => user));
    const lines = captureConsole();
    const res = makeRes();
    await loginUser({ body: { email: "user@example.com", password } }, res);
    return { res, output: lines.join("\n") };
  };

  const assertNothingSensitiveLogged = (output, token) => {
    assert.equal(output.includes(PASSWORD), false, "plaintext password was logged");
    assert.equal(output.includes(WRONG_PASSWORD), false, "submitted wrong password was logged");
    assert.equal(output.includes(passwordHash), false, "password hash was logged");
    assert.equal(output.includes("$2"), false, "a bcrypt hash was logged");
    assert.equal(/"password"/.test(output), false, "a request body with a password field was logged");
    if (token) assert.equal(output.includes(token), false, "token was logged");
  };

  test("still logs in: same response shape and a valid JWT for the user", async () => {
    const user = userRow({ id: 12, password: passwordHash });
    const { res, output } = await attempt({ user });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ["message", "token", "user"]);
    assert.equal(res.body.message, "Login successful");
    assert.deepEqual(res.body.user, { _id: "12", name: user.name, email: user.email, role: user.role });
    assert.equal(String(jwt.verify(res.body.token, process.env.JWT_SECRET).id), "12");
    assertNothingSensitiveLogged(output, res.body.token);
  });

  test("wrong password is rejected with the same response and logs no credentials", async () => {
    const { res, output } = await attempt({ user: userRow({ password: passwordHash }), password: WRONG_PASSWORD });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: "Invalid credentials" });
    assertNothingSensitiveLogged(output);
  });

  test("unknown email is rejected with the same response and logs no credentials", async () => {
    const { res, output } = await attempt({ user: null });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: "Invalid credentials" });
    assertNothingSensitiveLogged(output);
  });

  test("deactivated account is rejected with the same response and logs no credentials", async () => {
    const { res, output } = await attempt({ user: userRow({ password: passwordHash, isActive: false }) });
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Account has been deactivated. Contact admin." });
    assertNothingSensitiveLogged(output);
  });

  test("a server error is reported as before and logs no credentials", async () => {
    const { res, output } = await attempt({ findUnique: async () => { throw new Error("db down"); } });
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { success: false, message: "db down" });
    assert.match(output, /db down/);
    assertNothingSensitiveLogged(output);
  });

  test("missing credentials return 400 and log nothing", async () => {
    const lines = captureConsole();
    const res = makeRes();
    await loginUser({ body: { email: "user@example.com" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(lines.length, 0);
  });
});

describe("backend source", () => {
  const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const sourceFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (["node_modules", "tests", "uploads"].includes(entry.name)) return [];
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.name.endsWith(".js") ? [full] : [];
    });

  // Only the code of a log call matters (its arguments and ${} interpolations), not the wording of its message:
  // a message may name DATABASE_URL, but must never print its value.
  const codeOnly = (line) =>
    line
      .replace(/`([^`]*)`/g, (_, body) => [...body.matchAll(/\$\{([^}]*)\}/g)].map((match) => match[1]).join(" "))
      .replace(/'[^']*'|"[^"]*"/g, '""');

  test("no console call logs request bodies, passwords, tokens or secrets", () => {
    const offenders = [];
    for (const file of sourceFiles(backendDir)) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
        if (/console\.\w+\(/.test(line) && /req\.body|req\.headers|password|token|secret|api[_ ]?key|process\.env|DATABASE_URL/i.test(codeOnly(line))) {
          offenders.push(`${path.relative(backendDir, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    assert.deepEqual(offenders, []);
  });
});
