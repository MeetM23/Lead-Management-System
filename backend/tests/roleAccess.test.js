import { describe, test, mock, beforeEach, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginUser } from "../controllers/authController.js";
import { createEmployee, updateMyProfile } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by a stand-in.

// The address that used to grant admin automatically. It must have no special meaning now.
const FORMER_ADMIN_EMAIL = "meet@gmail.com";

const makeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

let db;
before(() => { process.env.JWT_SECRET = "test-secret-not-a-real-secret"; });
beforeEach(() => { db = installFakePrisma(); });

describe("employee creation", () => {
  const create = async (body) => {
    db.user.create = mock.fn(async ({ data }) => userRow({ id: 5, ...data }));
    const res = makeRes();
    await createEmployee({ body }, res);
    return { created: db.user.create.mock.calls[0]?.arguments[0].data, res };
  };
  const valid = { name: "A", employeeId: "EMP-001", email: "a@example.com", password: "long-enough-pw" };

  test("always creates a sales account", async () => {
    const { created, res } = await create(valid);
    assert.equal(created.role, "sales");
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.role, "sales");
  });

  test("a forged role in the request body is ignored", async () => {
    for (const forged of ["admin", "ADMIN", { not: "sales" }, ["admin"]]) {
      const { created, res } = await create({ ...valid, role: forged, isAdmin: true });
      assert.equal(created.role, "sales");
      assert.equal(res.body.data.role, "sales");
    }
  });

  test("creating an account with the former privileged email does not grant admin", async () => {
    const { created, res } = await create({ ...valid, email: FORMER_ADMIN_EMAIL });
    assert.equal(created.role, "sales");
    assert.equal(res.body.data.role, "sales");
  });
});

describe("login", () => {
  const login = async (storedRole, email) => {
    db.user.findUnique = mock.fn(async () =>
      userRow({ id: 3, email, role: storedRole, password: await bcrypt.hash("correct-password", 4) })
    );
    const res = makeRes();
    await loginUser({ body: { email, password: "correct-password" } }, res);
    return res;
  };

  test("a sales user with the former privileged email stays sales and is not rewritten", async () => {
    const res = await login("sales", FORMER_ADMIN_EMAIL);
    assert.equal(res.body.user.role, "sales");
    assert.equal(db.user.update.mock.calls.length, 0);
  });

  test("an existing admin keeps the stored admin role", async () => {
    assert.equal((await login("admin", "boss@example.com")).body.user.role, "admin");
  });

  test("an existing admin whose email is the former privileged email keeps admin from the stored role", async () => {
    assert.equal((await login("admin", FORMER_ADMIN_EMAIL)).body.user.role, "admin");
  });
});

describe("self profile update", () => {
  const update = async (body, storedRole = "sales") => {
    mock.method(User, "getProfile", async () => ({ email: "old@example.com", role: storedRole }));
    mock.method(User, "isEmailTaken", async () => false);
    let passedToModel;
    mock.method(User, "updateProfile", async (id, data) => {
      passedToModel = data;
      return { _id: id, name: data.name, email: data.email, role: storedRole, leadsCreatedCount: 0, totalLeads: 0 };
    });
    const res = makeRes();
    await updateMyProfile({ user: { _id: "4" }, body }, res);
    mock.restoreAll();
    return { passedToModel, res };
  };

  test("changing the email to the former privileged address does not change the role", async () => {
    const { res } = await update({ email: FORMER_ADMIN_EMAIL });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.email, FORMER_ADMIN_EMAIL);
    assert.equal(res.body.data.role, "sales");
  });

  test("role fields in the request are never passed to the model", async () => {
    const { passedToModel } = await update({ name: "N", role: "admin", isAdmin: true, isActive: true, employeeId: "USR-0000" });
    assert.deepEqual(Object.keys(passedToModel).sort(), ["email", "name", "password", "phone", "profilePic"]);
  });

  test("the model update never writes role, even if it receives one", async () => {
    db.user.update = mock.fn(async ({ data }) => userRow({ id: 4, ...data, _count: { leadsCreated: 0, leadsAssigned: 0 } }));

    const result = await User.updateProfile("4", { name: "New", email: "New@Example.com", role: "admin", isActive: false, employeeId: "X" });

    const written = db.user.update.mock.calls[0].arguments[0].data;
    assert.deepEqual(Object.keys(written).sort(), ["email", "name"]);
    assert.equal(written.email, "new@example.com");
    assert.equal(result.role, "sales");
  });
});

describe("authentication and authorization use the stored role", () => {
  const runProtect = async (tokenPayload, stored) => {
    db.user.findUnique = mock.fn(async () => stored);
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
  };

  const runAuthorize = (user) => {
    const res = makeRes();
    let nextCalled = false;
    authorize("admin")({ user }, res, () => { nextCalled = true; });
    return { res, nextCalled };
  };

  test("a token claiming role admin does not make a stored sales user admin", async () => {
    const stored = userRow({ id: 7, role: "sales" });
    const { req, nextCalled } = await runProtect({ id: "7", role: "admin", isAdmin: true }, stored);
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, "sales");

    const { res, nextCalled: adminAllowed } = runAuthorize(req.user);
    assert.equal(res.statusCode, 403);
    assert.equal(adminAllowed, false);
  });

  test("a stored admin keeps admin access", async () => {
    const stored = userRow({ id: 8, role: "admin", email: FORMER_ADMIN_EMAIL });
    const { req } = await runProtect({ id: "8" }, stored);
    assert.equal(req.user.role, "admin");
    assert.equal(runAuthorize(req.user).nextCalled, true);
  });

  test("the former privileged email without a stored admin role has no admin access", async () => {
    const stored = userRow({ id: 9, role: "sales", email: FORMER_ADMIN_EMAIL });
    const { req } = await runProtect({ id: "9" }, stored);
    assert.equal(runAuthorize(req.user).nextCalled, false);
  });

  test("the authenticated user never carries the password hash", async () => {
    const { req } = await runProtect({ id: "7" }, userRow({ id: 7 }));
    assert.equal("password" in req.user, false);
  });
});
