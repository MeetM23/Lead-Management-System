import { describe, test, mock, afterEach, beforeEach, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginUser } from "../controllers/authController.js";
import { updateMyProfile, getUserById, terminateUser } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import { sendError, errorHandler } from "../middleware/errorMiddleware.js";
import AppError from "../utils/AppError.js";
import { ROLES } from "../constants/index.js";
import { installFakePrisma, noQueriesMade, userRow } from "./helpers/fakePrisma.js";
import { getAllowedOrigins, getCorsOriginsProblem } from "../config/env.js";

// No database is used: the Prisma client is replaced by a stand-in.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const sourceFiles = (dir = backendDir, found = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "tests", "uploads"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (entry.name.endsWith(".js")) found.push(full);
  }
  return found;
};
const relative = (file) => path.relative(backendDir, file).split(path.sep).join("/");
const read = (file) => fs.readFileSync(path.join(backendDir, file), "utf8");

let db;
before(() => { process.env.JWT_SECRET = "architecture-test-key-0123456789abcdefghij"; });
beforeEach(() => { db = installFakePrisma(); });
afterEach(() => mock.restoreAll());

describe("layering rules", () => {
  test("database queries live only in models", () => {
    const offenders = sourceFiles()
      .map(relative)
      .filter((file) => !file.startsWith("models/") && file !== "config/db.js")
      .filter((file) => /\bprisma\.[$A-Za-z]|@prisma\/client/.test(read(file)));
    assert.deepEqual(offenders, []);
  });

  test("there is no service layer", () => {
    assert.equal(fs.existsSync(path.join(backendDir, "services")), false);
  });

  test("routes contain no logic: they only import controllers, middleware and constants", () => {
    for (const file of sourceFiles().map(relative).filter((f) => f.startsWith("routes/"))) {
      assert.equal(/\bawait\b|\.find\(|res\.json/.test(read(file)), false, `${file} contains logic`);
    }
  });

  test("the error response is built in exactly one place", () => {
    const definitions = sourceFiles().map(relative).filter((file) => /const sendError\s*=/.test(read(file)));
    assert.deepEqual(definitions, ["middleware/errorMiddleware.js"]);
  });

  test("the database schema and the shared constants list the same values", () => {
    const schema = read("prisma/schema.prisma");
    const enumValues = (name) =>
      schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`))[1].split("\n").map((line) => line.trim()).filter(Boolean);

    assert.equal(/LeadStatus|\bstatus\b/.test(schema.split("model Lead {")[1].split("}")[0]), false); // leads have no status
    assert.equal(/LeadPriority|priority/i.test(schema), false); // leads have no priority
    assert.deepEqual(enumValues("Role"), Object.values(ROLES));
  });
});

describe("local development setup", () => {
  test("CORS origins come from CORS_ORIGINS (local Vite server by default), never a hardcoded host", () => {
    const source = read("index.js");
    assert.match(source, /getAllowedOrigins\(\)/);
    assert.doesNotMatch(source, /vercel\.app|onrender\.com/i);
    assert.deepEqual(getAllowedOrigins({}), ["http://localhost:5173", "http://127.0.0.1:5173"]);
    assert.deepEqual(getAllowedOrigins({ CORS_ORIGINS: "https://a.vercel.app/, https://b.com" }), ["https://a.vercel.app", "https://b.com"]);
    assert.equal(getCorsOriginsProblem({ CORS_ORIGINS: "https://a.vercel.app" }), null);
    assert.match(getCorsOriginsProblem({ CORS_ORIGINS: "a.vercel.app/path" }), /CORS_ORIGINS/);
  });

  test("the frontend rewrites every path to index.html so page refreshes work on Vercel", () => {
    const config = JSON.parse(fs.readFileSync(path.join(backendDir, "../frontend/vercel.json"), "utf8"));
    assert.deepEqual(config.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
  });

  test(".env.example is a template: placeholders only, every setting the app reads, no real secrets", () => {
    const template = read(".env.example");
    for (const name of ["DATABASE_URL", "TEST_DATABASE_URL", "JWT_SECRET", "PORT", "NODE_ENV", "ENABLE_SEEDING", "SEED_DEMO_PASSWORD", "CORS_ORIGINS"]) {
      assert.match(template, new RegExp(`^${name}=`, "m"), name);
    }
    assert.match(template, /^JWT_SECRET=$/m);
    assert.match(template, /^SEED_DEMO_PASSWORD=$/m);
    assert.ok(template.includes("mysql://USER:PASSWORD@"));
  });

  test("the setup scripts exist and the README documents them", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    const readme = fs.readFileSync(path.join(backendDir, "../README.md"), "utf8");
    for (const name of ["db:check", "db:migrate", "db:test:setup", "seed", "test"]) {
      assert.ok(scripts[name], `script ${name}`);
      assert.ok(readme.includes(`npm run ${name}`) || name === "test", `README mentions ${name}`);
    }
    assert.match(readme, /leadflow_test/);
    assert.match(readme, /phpmyadmin/i);
  });
});

describe("standard error responses", () => {
  test("sendError uses the error's status and the { success, message } shape", () => {
    const res = makeRes();
    sendError(res, new AppError("Nope", 418));
    assert.equal(res.statusCode, 418);
    assert.deepEqual(res.body, { success: false, message: "Nope" });
  });

  test("unknown errors are 500; framework errors keep their own status", () => {
    const unknown = makeRes();
    sendError(unknown, new Error("boom"));
    assert.equal(unknown.statusCode, 500);

    const parseError = makeRes();
    sendError(parseError, Object.assign(new Error("bad json"), { status: 400 }));
    assert.equal(parseError.statusCode, 400);
  });

  test("the Express error handler returns the same shape", () => {
    mock.method(console, "error", () => {});
    const res = makeRes();
    errorHandler(new AppError("Forbidden", 403), {}, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Forbidden" });
  });

  test("known database errors become clear client errors", () => {
    const missing = makeRes();
    sendError(missing, Object.assign(new Error("An operation failed because it depends on records that were not found"), { code: "P2025" }));
    assert.equal(missing.statusCode, 404);
    assert.deepEqual(missing.body, { success: false, message: "Record not found" });

    const tooLong = makeRes();
    sendError(tooLong, Object.assign(new Error("The provided value for the column is too long"), { code: "P2000" }));
    assert.equal(tooLong.statusCode, 400);
  });

  test("other database errors never leak table or column details", () => {
    mock.method(console, "error", () => {});
    const res = makeRes();
    const error = Object.assign(new Error("Invalid `prisma.lead.findMany()` invocation: column `leads.secret_column` ..."), {
      name: "PrismaClientKnownRequestError",
      code: "P2022",
    });
    sendError(res, error);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { success: false, message: "Database error" });
  });

  test("authentication and role middleware use it too", async () => {
    const noToken = makeRes();
    await protect({ headers: {} }, noToken, () => {});
    assert.equal(noToken.statusCode, 401);
    assert.deepEqual(noToken.body, { success: false, message: "Not authorized, no token" });

    const forbidden = makeRes();
    authorize(ROLES.ADMIN)({ user: { role: ROLES.SALES } }, forbidden, () => {});
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.body.success, false);

    mock.method(console, "error", () => {});
    const token = jwt.sign({ id: "5" }, process.env.JWT_SECRET);
    const gone = makeRes();
    await protect({ headers: { authorization: `Bearer ${token}` } }, gone, () => {});
    assert.equal(gone.statusCode, 401);
    assert.deepEqual(gone.body, { success: false, message: "Not authorized, user not found" });

    const deactivated = makeRes();
    db.user.findUnique = mock.fn(async () => userRow({ id: 5, isActive: false }));
    await protect({ headers: { authorization: `Bearer ${token}` } }, deactivated, () => {});
    assert.equal(deactivated.statusCode, 403);
  });

  test("a token whose id is not a valid database id is rejected without querying", async () => {
    mock.method(console, "error", () => {});
    for (const id of ["abc", "0", "-1", "1.5", { not: 1 }, ["1"], "507f1f77bcf86cd799439011"]) {
      const res = makeRes();
      await protect({ headers: { authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` } }, res, () => {});
      assert.equal(res.statusCode, 401, JSON.stringify(id));
    }
    assert.equal(noQueriesMade(db), true);
  });
});

describe("input validation", () => {
  test("login rejects non-string credentials before touching the database", async () => {
    for (const body of [
      { email: { not: null }, password: "x" },
      { email: "a@example.com", password: { gt: "" } },
      { email: ["a@example.com"], password: "x" },
      { email: "a@example.com", password: 12345 },
      { email: "", password: "x" },
    ]) {
      const login = makeRes();
      await loginUser({ body }, login);
      assert.equal(login.statusCode, 400);
      assert.deepEqual(login.body, { success: false, message: "Please enter all fields" });
    }
    assert.equal(noQueriesMade(db), true);
  });

  test("profile update answers 400, not 500, for wrongly typed fields", async () => {
    for (const body of [{ email: 5 }, { phone: { a: 1 } }, { name: 7 }, { profilePic: 9 }]) {
      const res = makeRes();
      await updateMyProfile({ user: { _id: "4" }, body }, res);
      assert.equal(res.statusCode, 400, JSON.stringify(body));
      assert.equal(res.body.success, false);
    }
  });
});

describe("user management through the model", () => {
  test("viewing a user: unknown id is 404 and non-sales users are 403", async () => {
    const missing = makeRes();
    await getUserById({ params: { employeeId: "USR-X" } }, missing);
    assert.equal(missing.statusCode, 404);

    db.user.findUnique = mock.fn(async () => userRow({ role: "admin", _count: { leadsCreated: 0, leadsAssigned: 0 } }));
    const admin = makeRes();
    await getUserById({ params: { employeeId: "USR-X" } }, admin);
    assert.equal(admin.statusCode, 403);
  });

  test("deleting a user: unknown is 404, an admin cannot be deleted, a sales user is removed and leads reassigned", async () => {
    const run = async (found) => {
      db = installFakePrisma();
      db.user.findUnique = mock.fn(async () => found);
      db.lead.updateMany = mock.fn(async () => ({ count: 3 }));
      const res = makeRes();
      await terminateUser({ params: { employeeId: "USR-1" }, user: { _id: "99" } }, res);
      return res;
    };

    assert.equal((await run(null)).statusCode, 404);
    assert.equal((await run(userRow({ role: "admin", name: "Boss" }))).statusCode, 403);
    assert.equal(db.user.delete.mock.calls.length, 0);

    const ok = await run(userRow({ id: 6, role: "sales", name: "Sam" }));
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.message, "User Sam has been deleted. 3 leads were reassigned to you.");
    assert.deepEqual(ok.body.data, { isActive: false, deleted: true });
    assert.deepEqual(db.lead.updateMany.mock.calls[0].arguments[0], { where: { assignedToId: 6 }, data: { assignedToId: 99 } });
    assert.deepEqual(db.user.delete.mock.calls[0].arguments[0], { where: { id: 6 } });
  });

  test("the sales list uses one query with lead counts and keeps its response shape", async () => {
    db.user.findMany = mock.fn(async () => [userRow({ id: 3, name: "Sam", _count: { leadsCreated: 2, leadsAssigned: 5 } })]);
    const list = await User.getSalesWithCounts();
    assert.equal(db.user.findMany.mock.calls.length, 1);
    assert.deepEqual(list, [{
      _id: "3", name: "Sam", email: "user@example.com", phone: "", employeeId: "USR-000001", profilePic: "", isActive: true,
      leadsCreatedCount: 2, leadsAssignedCount: 5,
    }]);
  });
});

describe("unexpected errors", () => {
  test("a plain Error gives a generic 500 and never leaks its text; known errors keep their message", () => {
    mock.method(console, "error", () => {});
    const unexpected = makeRes();
    sendError(unexpected, new Error("SELECT * FROM users WHERE password = 'x' failed at C:\secret\path"));
    assert.equal(unexpected.statusCode, 500);
    assert.deepEqual(unexpected.body, { success: false, message: "Server error" });

    const known = makeRes();
    sendError(known, new AppError("Lead not found", 404));
    assert.deepEqual([known.statusCode, known.body.message], [404, "Lead not found"]);

    const upload = makeRes();
    sendError(upload, Object.assign(new Error("File too large"), { name: "MulterError" }));
    assert.deepEqual([upload.statusCode, upload.body.message], [400, "File too large"]);
  });

  test("the log line for an unexpected error holds only its type", () => {
    const lines = [];
    mock.method(console, "error", (...args) => lines.push(args.join(" ")));
    sendError(makeRes(), new Error("secret internal detail"));
    assert.equal(lines.join("\n").includes("secret internal detail"), false);
  });
});

describe("avatar upload", () => {
  const upload = fs.readFileSync(path.join(backendDir, "middleware/uploadMiddleware.js"), "utf8");

  test("accepts only real image extensions and image types, with a 400 for anything else", () => {
    assert.ok(upload.includes(String.raw`const IMAGE_EXTENSIONS = /^\.(jpe?g|png|gif)$/;`));
    assert.ok(upload.includes(String.raw`const IMAGE_TYPES = /^image\/(jpeg|png|gif)$/;`));
    assert.ok(upload.includes("new AppError('Only JPG, PNG or GIF images are allowed', 400)"));
    assert.equal(upload.includes("new Error('Images Only!')"), false);
  });

  test("creates its folder on first use and does not depend on the working directory", () => {
    assert.match(upload, /fs\.mkdirSync\(UPLOADS_DIR, \{ recursive: true \}\)/);
    assert.equal(/cb\(null, 'uploads\/'\)/.test(upload), false);
  });
});
