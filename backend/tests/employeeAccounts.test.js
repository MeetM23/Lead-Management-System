import { describe, test, mock, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authRoutes from "../routes/authRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { createEmployee } from "../controllers/userController.js";
import { loginUser } from "../controllers/authController.js";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by a stand-in that keeps users in memory and enforces
// unique email / employee ID like the real table. The real MariaDB behavior is covered by mysql.integration.test.js.

const PASSWORD = "Temp-Passw0rd-123";
const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

let db;
let users; // in-memory rows
let nextId;

// An in-memory users table behind the fake Prisma client
const installUserStore = () => {
  db = installFakePrisma();
  users = [];
  nextId = 1;
  const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase(); // the real collation ignores case
  db.user.findUnique = mock.fn(async ({ where }) =>
    users.find((row) =>
      (where.id !== undefined && row.id === where.id) ||
      (where.email !== undefined && same(row.email, where.email)) ||
      (where.employeeId !== undefined && same(row.employeeId, where.employeeId))
    ) ?? null);
  db.user.count = mock.fn(async ({ where } = {}) => users.filter((row) => !where?.role || row.role === where.role).length);
  db.user.create = mock.fn(async ({ data }) => {
    for (const [field, target] of [["email", "users_email_key"], ["employeeId", "users_employee_id_key"]]) {
      if (users.some((row) => same(row[field], data[field]))) {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002", meta: { target } });
      }
    }
    const row = userRow({ id: nextId++, ...data });
    users.push(row);
    return row;
  });
  db.user.update = mock.fn(async ({ where, data }) => Object.assign(users.find((row) => row.id === where.id), data));
};

const addUser = async (overrides = {}) => {
  const row = userRow({ id: nextId++, password: await bcrypt.hash(PASSWORD, 4), _count: { leadsCreated: 0, leadsAssigned: 0 }, ...overrides });
  users.push(row);
  return row;
};

const newEmployee = (overrides = {}) => ({ name: "Asha Rao", employeeId: "EMP-001", email: "asha@example.com", password: PASSWORD, ...overrides });

before(() => { process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex"); });
beforeEach(() => installUserStore());

describe("creating an employee", () => {
  test("stores a hashed password, an active account and the sales role", async () => {
    const res = makeRes();
    await createEmployee({ body: newEmployee({ email: "  Asha@Example.COM " }) }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    const stored = users[0];
    assert.notEqual(stored.password, PASSWORD);
    assert.equal(await bcrypt.compare(PASSWORD, stored.password), true);
    assert.equal(stored.role, "sales");
    assert.equal(stored.isActive, true);
    assert.equal(stored.email, "asha@example.com");
    assert.equal(stored.employeeId, "EMP-001");
  });

  test("the response never contains the password or its hash", async () => {
    const res = makeRes();
    await createEmployee({ body: newEmployee() }, res);
    assert.equal("password" in res.body.data, false);
    assert.equal(JSON.stringify(res.body).includes("$2"), false);
    assert.equal(JSON.stringify(res.body).includes(PASSWORD), false);
    assert.equal(res.body.data.employeeId, "EMP-001");
  });

  test("a role or other protected field in the body is ignored", async () => {
    for (const extra of [{ role: "admin" }, { role: "ADMIN" }, { role: ["admin"] }, { isAdmin: true, isActive: false, id: 99 }]) {
      installUserStore();
      const res = makeRes();
      await createEmployee({ body: { ...newEmployee(), ...extra } }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(users[0].role, "sales");
      assert.equal(users[0].isActive, true);
      assert.equal(users[0].id, 1);
    }
  });

  test("invalid input is rejected with 400 and nothing is stored", async () => {
    const bad = [
      {},
      newEmployee({ name: "" }),
      newEmployee({ name: "   " }),
      newEmployee({ employeeId: "" }),
      newEmployee({ employeeId: "a@b" }), // would be mistaken for an email at login
      newEmployee({ employeeId: "has space" }),
      newEmployee({ employeeId: "X" }),
      newEmployee({ employeeId: "E".repeat(21) }),
      newEmployee({ email: "not-an-email" }),
      newEmployee({ password: "short" }),
      newEmployee({ password: "p".repeat(73) }),
      newEmployee({ email: { not: "a string" } }),
      newEmployee({ password: ["x"] }),
      newEmployee({ employeeId: 12345 }),
    ];
    for (const body of bad) {
      const res = makeRes();
      await createEmployee({ body }, res);
      assert.equal(res.statusCode, 400, JSON.stringify(body));
      assert.equal(res.body.success, false);
    }
    assert.equal(users.length, 0);
  });

  test("a duplicate email (any letter case) is a 409", async () => {
    await createEmployee({ body: newEmployee() }, makeRes());
    const res = makeRes();
    await createEmployee({ body: newEmployee({ employeeId: "EMP-002", email: "ASHA@example.com" }) }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { success: false, message: "An account with this email already exists" });
    assert.equal(users.length, 1);
  });

  test("a duplicate employee ID (any letter case) is a 409", async () => {
    await createEmployee({ body: newEmployee() }, makeRes());
    const res = makeRes();
    await createEmployee({ body: newEmployee({ employeeId: "emp-001", email: "other@example.com" }) }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { success: false, message: "This employee ID is already in use" });
    assert.equal(users.length, 1);
  });
});

describe("employee login", () => {
  const login = async (body) => {
    const res = makeRes();
    await loginUser({ body }, res);
    return res;
  };

  test("works with the email address, in any letter case", async () => {
    const row = await addUser({ email: "asha@example.com", employeeId: "EMP-001" });
    for (const identifier of ["asha@example.com", "  ASHA@Example.com "]) {
      const res = await login({ identifier, password: PASSWORD });
      assert.equal(res.statusCode, 200, identifier);
      assert.equal(String(jwt.verify(res.body.token, process.env.JWT_SECRET).id), String(row.id));
    }
  });

  test("works with the employee ID", async () => {
    const row = await addUser({ email: "asha@example.com", employeeId: "EMP-001" });
    const res = await login({ identifier: "EMP-001", password: PASSWORD });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user._id, String(row.id));
    assert.deepEqual(db.user.findUnique.mock.calls[0].arguments[0], { where: { employeeId: "EMP-001" } });
  });

  test("the old email field name still works", async () => {
    await addUser({ email: "asha@example.com" });
    assert.equal((await login({ email: "asha@example.com", password: PASSWORD })).statusCode, 200);
  });

  test("the role comes from the database, never from the request", async () => {
    await addUser({ email: "asha@example.com", role: "sales" });
    const res = await login({ identifier: "asha@example.com", password: PASSWORD, role: "admin", isAdmin: true });
    assert.equal(res.body.user.role, "sales");
    assert.equal(db.user.update.mock.calls.length, 0);

    await addUser({ email: "boss@example.com", employeeId: "ADM-001", role: "admin" });
    assert.equal((await login({ identifier: "ADM-001", password: PASSWORD })).body.user.role, "admin");
  });

  test("a wrong password, an unknown email and an unknown employee ID all get the same generic answer", async () => {
    await addUser({ email: "asha@example.com", employeeId: "EMP-001" });
    for (const body of [
      { identifier: "asha@example.com", password: "Wrong-Passw0rd" },
      { identifier: "EMP-001", password: "Wrong-Passw0rd" },
      { identifier: "nobody@example.com", password: PASSWORD },
      { identifier: "EMP-404", password: PASSWORD },
    ]) {
      const res = await login(body);
      assert.equal(res.statusCode, 400, JSON.stringify(body.identifier));
      assert.deepEqual(res.body, { success: false, message: "Invalid credentials" });
      assert.equal(res.body.token, undefined);
    }
  });

  test("an inactive account is rejected and gets no token", async () => {
    await addUser({ email: "gone@example.com", employeeId: "EMP-009", isActive: false });
    for (const identifier of ["gone@example.com", "EMP-009"]) {
      const res = await login({ identifier, password: PASSWORD });
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, "Account has been deactivated. Contact admin.");
      assert.equal(res.body.token, undefined);
    }
  });

  test("a wrong password on an inactive account does not reveal that it is inactive", async () => {
    await addUser({ email: "gone@example.com", isActive: false });
    const res = await login({ identifier: "gone@example.com", password: "Wrong-Passw0rd" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Invalid credentials");
  });

  test("an empty or non-string identifier is rejected before any query", async () => {
    for (const body of [{ password: PASSWORD }, { identifier: "", password: PASSWORD }, { identifier: { $ne: "" }, password: PASSWORD }, { identifier: "x".repeat(256), password: PASSWORD }]) {
      assert.equal((await login(body)).statusCode, 400);
    }
    assert.equal(db.user.findUnique.mock.calls.length, 0);
  });
});

describe("the first admin", () => {
  test("is created when no admin exists, with the admin role and a hashed password", async () => {
    const admin = await User.createFirstAdmin(newEmployee({ employeeId: "ADM-001" }));
    assert.equal(admin.role, "admin");
    assert.equal(users[0].role, "admin");
    assert.notEqual(users[0].password, PASSWORD);
    assert.equal("password" in admin, false);
  });

  test("cannot be used to add a second admin, even when employees exist", async () => {
    await User.createFirstAdmin(newEmployee({ employeeId: "ADM-001" }));
    await assert.rejects(User.createFirstAdmin(newEmployee({ employeeId: "ADM-002", email: "two@example.com" })), (error) => error.statusCode === 409);
    assert.equal(users.filter((row) => row.role === "admin").length, 1);
  });

  test("is still allowed when only employees exist (no promotion of anyone)", async () => {
    await addUser({ role: "sales", email: "emp@example.com", employeeId: "EMP-001" });
    await User.createFirstAdmin(newEmployee({ employeeId: "ADM-001" }));
    assert.equal(users.find((row) => row.employeeId === "EMP-001").role, "sales");
  });
});

describe("activating and deactivating", () => {
  test("an employee can be deactivated and then cannot log in", async () => {
    await addUser({ email: "asha@example.com", employeeId: "EMP-001" });
    const result = await User.setActiveByEmployeeId("EMP-001", false);
    assert.equal(result.isActive, false);

    const res = makeRes();
    await loginUser({ body: { identifier: "EMP-001", password: PASSWORD } }, res);
    assert.equal(res.statusCode, 403);
  });

  test("an admin cannot be deactivated and an unknown ID is a 404", async () => {
    await addUser({ role: "admin", employeeId: "ADM-001", email: "boss@example.com" });
    await assert.rejects(User.setActiveByEmployeeId("ADM-001", false), (error) => error.statusCode === 403);
    await assert.rejects(User.setActiveByEmployeeId("NOPE-1", false), (error) => error.statusCode === 404);
    assert.equal(db.user.update.mock.calls.length, 0);
  });
});

// The same routers the server mounts, with the real authentication and role middleware
describe("HTTP routes", () => {
  let server;
  let baseUrl;
  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());

  const call = async (method, path, { token, body } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const tokenFor = (row) => jwt.sign({ id: String(row.id) }, process.env.JWT_SECRET);

  test("public registration no longer exists", async () => {
    const res = await call("POST", "/api/auth/register", { body: { name: "A", email: "a@example.com", password: PASSWORD } });
    assert.equal(res.status, 404);
    assert.equal(users.length, 0);
  });

  test("creating an employee requires a logged-in admin", async () => {
    const anonymous = await call("POST", "/api/users", { body: newEmployee() });
    assert.equal(anonymous.status, 401);

    const seller = await addUser({ role: "sales", email: "s@example.com", employeeId: "EMP-100" });
    const asSales = await call("POST", "/api/users", { token: tokenFor(seller), body: newEmployee() });
    assert.equal(asSales.status, 403);
    assert.equal(users.length, 1);

    const boss = await addUser({ role: "admin", email: "boss@example.com", employeeId: "ADM-001" });
    const asAdmin = await call("POST", "/api/users", { token: tokenFor(boss), body: { ...newEmployee(), role: "admin" } });
    assert.equal(asAdmin.status, 201);
    assert.equal(asAdmin.body.data.role, "sales");
    assert.equal("password" in asAdmin.body.data, false);
  });

  test("a deactivated admin's token no longer works", async () => {
    const boss = await addUser({ role: "admin", email: "boss@example.com", employeeId: "ADM-001", isActive: false });
    assert.equal((await call("POST", "/api/users", { token: tokenFor(boss), body: newEmployee() })).status, 403);
  });

  test("changing an account's status is admin-only", async () => {
    const seller = await addUser({ role: "sales", email: "s@example.com", employeeId: "EMP-100" });
    const victim = await addUser({ role: "sales", email: "v@example.com", employeeId: "EMP-200" });
    const asSales = await call("PUT", "/api/users/EMP-200/status", { token: tokenFor(seller), body: { isActive: false } });
    assert.equal(asSales.status, 403);
    assert.equal(victim.isActive, true);

    const boss = await addUser({ role: "admin", email: "boss@example.com", employeeId: "ADM-001" });
    const invalid = await call("PUT", "/api/users/EMP-200/status", { token: tokenFor(boss), body: { isActive: "no" } });
    assert.equal(invalid.status, 400);
    const ok = await call("PUT", "/api/users/EMP-200/status", { token: tokenFor(boss), body: { isActive: false } });
    assert.equal(ok.status, 200);
    assert.equal(victim.isActive, false);
  });

  test("an employee cannot change their own role or protected fields", async () => {
    const seller = await addUser({ role: "sales", email: "s@example.com", employeeId: "EMP-100" });
    const res = await call("PUT", "/api/users/me", {
      token: tokenFor(seller),
      body: { name: "New Name", role: "admin", isActive: true, employeeId: "ADM-999" },
    });
    assert.equal(res.status, 200);
    assert.equal(seller.role, "sales");
    assert.equal(seller.employeeId, "EMP-100");
    assert.deepEqual(Object.keys(db.user.update.mock.calls[0].arguments[0].data), ["name"]);
  });

  test("login over HTTP works with an employee ID and returns the stored role", async () => {
    await addUser({ role: "sales", email: "s@example.com", employeeId: "EMP-100" });
    const res = await call("POST", "/api/auth/login", { body: { identifier: "EMP-100", password: PASSWORD } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, "sales");
    assert.ok(res.body.token);
  });
});
