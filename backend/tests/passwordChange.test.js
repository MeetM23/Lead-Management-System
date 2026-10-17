import { describe, test, mock, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRoutes from "../routes/userRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { updateMyProfile } from "../controllers/userController.js";
import User from "../models/User.js";
import { renderComponent } from "./helpers/renderComponent.js";
import { installFakePrisma, userRow } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in that keeps users (with real bcrypt
// hashes) in memory. The components are rendered to HTML in Node, not in a browser. Real MariaDB: see the report.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.resolve(backendDir, "..", "frontend", "src");
const read = (file) => fs.readFileSync(path.join(frontend, file), "utf8");

const OLD = "Old-Passw0rd-123";
const NEW = "New-Passw0rd-456";

let db;
let users;

const installStore = async () => {
  db = installFakePrisma();
  const hash = await bcrypt.hash(OLD, 4);
  users = [
    userRow({ id: 1, name: "Sam Sales", role: "sales", email: "sam@example.com", employeeId: "EMP-1", password: hash }),
    userRow({ id: 2, name: "Boss Admin", role: "admin", email: "boss@example.com", employeeId: "ADM-1", password: hash }),
    userRow({ id: 3, name: "Other Sales", role: "sales", email: "other@example.com", employeeId: "EMP-3", password: hash }),
    userRow({ id: 4, name: "Gone", role: "sales", email: "gone@example.com", employeeId: "EMP-4", password: hash, isActive: false }),
  ];
  db.user.findUnique = mock.fn(async ({ where }) => users.find((row) => row.id === where.id) ?? null);
  db.user.update = mock.fn(async ({ where, data }) => Object.assign(users.find((row) => row.id === where.id), data));
};

describe("changing my own password over HTTP", () => {
  let server;
  let baseUrl;
  let nextIp = 1;

  before(async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
    const app = express();
    app.set("trust proxy", true); // lets each test come from its own "address", so the failed-attempt limiter does not mix tests
    app.use(express.json());
    app.use("/api/users", userRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(async () => {
    await installStore();
    mock.method(console, "error", () => {});
  });
  afterEach(() => mock.restoreAll());

  const change = async (userId, body, ip = `10.0.0.${nextIp++}`) => {
    const response = await fetch(`${baseUrl}/api/users/me/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
        ...(userId ? { Authorization: `Bearer ${jwt.sign({ id: String(userId) }, process.env.JWT_SECRET)}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const valid = (overrides = {}) => ({ newPassword: NEW, confirmPassword: NEW, ...overrides });
  const stillOld = async (row) => assert.equal(await bcrypt.compare(OLD, row.password), true);

  test("an unauthenticated request is rejected and changes nothing", async () => {
    const { status } = await change(null, valid());
    assert.equal(status, 401);
    assert.equal(db.user.update.mock.calls.length, 0);
  });

  test("an employee changes their password: stored as a bcrypt hash, the new one verifies, the old one no longer does", async () => {
    const { status, body } = await change(1, valid());
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true, message: "Password changed" });
    const stored = users[0].password;
    assert.match(stored, /^\$2[aby]\$/);
    assert.notEqual(stored, NEW);
    assert.equal(await bcrypt.compare(NEW, stored), true);
    assert.equal(await bcrypt.compare(OLD, stored), false);
  });

  test("an admin changes their own password the same way", async () => {
    const { status } = await change(2, valid());
    assert.equal(status, 200);
    assert.equal(await bcrypt.compare(NEW, users[1].password), true);
    assert.equal(await bcrypt.compare(OLD, users[1].password), false);
  });

  test("only the password column is written, and the response never contains a hash or a password", async () => {
    const { body } = await change(1, valid());
    assert.deepEqual(Object.keys(db.user.update.mock.calls[0].arguments[0].data), ["password"]);
    assert.deepEqual(db.user.update.mock.calls[0].arguments[0].where, { id: 1 });
    const text = JSON.stringify(body);
    for (const secret of [OLD, NEW, "$2"]) assert.equal(text.includes(secret), false);
    assert.equal(users[0].name, "Sam Sales");
    assert.equal(users[0].email, "sam@example.com");
    assert.equal(users[0].role, "sales");
  });

  test("missing or wrongly typed fields are rejected", async () => {
    for (const body of [{}, valid({ newPassword: "" }), valid({ confirmPassword: "" }), { newPassword: NEW }, { confirmPassword: NEW }, valid({ newPassword: 12345678 }), valid({ newPassword: ["x"], confirmPassword: ["x"] }), valid({ confirmPassword: { a: 1 } })]) {
      const { status, body: result } = await change(1, body);
      assert.equal(status, 400, JSON.stringify(body));
      assert.equal(result.success, false);
    }
    assert.equal(db.user.update.mock.calls.length, 0);
    await stillOld(users[0]);
  });

  test("the current password is not asked for: a change works without it, and one sent anyway is ignored", async () => {
    assert.equal((await change(1, valid())).status, 200);
    await installStore();
    assert.equal((await change(1, valid({ currentPassword: "anything-at-all" }))).status, 200);
    assert.equal(await bcrypt.compare(NEW, users[0].password), true);
  });

  test("a mismatched confirmation is rejected", async () => {
    const { status, body } = await change(1, valid({ confirmPassword: "Different-Passw0rd" }));
    assert.equal(status, 400);
    assert.equal(body.message, "New password and confirmation do not match");
    await stillOld(users[0]);
  });

  test("a weak new password is rejected: shorter than 8 characters, or longer than bcrypt can use", async () => {
    for (const weak of ["short", "1234567", "x".repeat(73)]) {
      const { status } = await change(1, valid({ newPassword: weak, confirmPassword: weak }));
      assert.equal(status, 400, weak.slice(0, 10));
    }
    assert.equal((await change(1, valid({ newPassword: "12345678", confirmPassword: "12345678" }))).status, 200); // exactly 8 is allowed
    assert.equal(db.user.update.mock.calls.length, 1);
  });

  test("keeping the same password is rejected", async () => {
    const { status, body } = await change(1, valid({ newPassword: OLD, confirmPassword: OLD }));
    assert.equal(status, 400); // the same as the password stored now
    assert.match(body.message, /must be different/);
    assert.equal(db.user.update.mock.calls.length, 0);
  });

  test("the account is always the logged-in user's: ids, emails or roles in the request cannot target someone else", async () => {
    const { status } = await change(1, { ...valid(), _id: "3", id: 3, userId: "3", employeeId: "EMP-3", email: "other@example.com", role: "admin", user: { _id: "3" } });
    assert.equal(status, 200);
    assert.equal(await bcrypt.compare(NEW, users[0].password), true); // Sam's own
    await stillOld(users[2]); // Other Sales untouched
    await stillOld(users[1]);
    assert.equal(users[0].role, "sales");
  });

  test("an admin can change only their own password here, never an employee's", async () => {
    const attempt = await change(2, { ...valid(), employeeId: "EMP-3", id: 3, userId: "3" });
    assert.equal(attempt.status, 200);
    await stillOld(users[2]); // the employee's password did not change; the admin's own did
    assert.equal(await bcrypt.compare(NEW, users[1].password), true);
  });

  test("a deactivated account cannot change its password (its session is refused)", async () => {
    const { status } = await change(4, valid());
    assert.equal(status, 403);
    assert.equal(db.user.update.mock.calls.length, 0);
  });

  test("the model itself refuses a deactivated or unknown account", async () => {
    await assert.rejects(User.changePassword("4", NEW), (error) => error.statusCode === 403);
    await assert.rejects(User.changePassword("999", NEW), (error) => error.statusCode === 404);
    await assert.rejects(User.changePassword("abc", NEW), (error) => error.statusCode === 404);
  });

  test("a database failure is a generic 500, never a success, and the password stays as it was", async () => {
    db.user.update = mock.fn(async () => { throw new Error("connection lost to password table"); });
    const { status, body } = await change(1, valid());
    assert.equal(status, 500);
    assert.equal(body.success, false);
    assert.deepEqual(body, { success: false, message: "Server error" });
    await stillOld(users[0]);
  });

  test("a failure while loading the account is not reported as success either", async () => {
    db.user.findUnique = mock.fn(async ({ where }) => {
      if (db.user.findUnique.mock.calls.length >= 1) throw new Error("db down"); // the login check worked, the password lookup fails
      return users.find((row) => row.id === where.id);
    });
    const { status, body } = await change(1, valid());
    assert.equal(status, 500);
    assert.equal(body.success, false);
    await stillOld(users[0]);
  });

  test("passwords are never logged", async () => {
    const logged = [];
    for (const method of ["log", "info", "warn", "error"]) mock.method(console, method, (...args) => logged.push(args.map(String).join(" ")));
    await change(1, valid({ confirmPassword: "Wrong-Passw0rd-Logged" }));
    db.user.update = mock.fn(async () => { throw new Error("boom"); });
    await change(1, valid());
    const output = logged.join("\n");
    for (const secret of [OLD, NEW, "Wrong-Passw0rd-Logged", "$2a$", "$2b$"]) assert.equal(output.includes(secret), false, secret);
  });

  test("repeated rejected attempts from one address are slowed down with a 429; a correct change is not counted", async () => {
    const ip = "10.9.9.9";
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await change(1, valid({ confirmPassword: "Different-Passw0rd" }), ip)).status, 400);
    const blocked = await change(1, valid(), ip);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.success, false);
    await stillOld(users[0]);
    assert.equal((await change(1, valid(), "10.9.9.10")).status, 200); // another address is not affected
  });

  test("existing login tokens stay valid after a change (sessions are not touched)", async () => {
    const token = jwt.sign({ id: "1" }, process.env.JWT_SECRET);
    await change(1, valid());
    const response = await fetch(`${baseUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.notEqual(response.status, 401);
  });
});

describe("the profile update no longer changes passwords", () => {
  test("a password in PUT /api/users/me is ignored: it is never passed on, so it cannot bypass the current-password check", async () => {
    await installStore();
    let passed;
    mock.method(User, "getProfile", async () => ({ email: "sam@example.com", role: "sales" }));
    mock.method(User, "updateProfile", async (id, data) => {
      passed = data;
      return { _id: id, name: "Sam", email: "sam@example.com", role: "sales", leadsCreatedCount: 0, totalLeads: 0 };
    });
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await updateMyProfile({ user: { _id: "1" }, body: { name: "Sam", password: "sneaky-new-password" } }, res);
    mock.restoreAll();
    assert.equal(res.statusCode, 200);
    assert.equal("password" in passed, false);
  });

  test("the model's profile update never writes a password even if given one", async () => {
    await installStore();
    db.user.update = mock.fn(async ({ data }) => userRow({ id: 1, ...data, _count: { leadsCreated: 0, leadsAssigned: 0 } }));
    await User.updateProfile("1", { name: "Sam", password: "sneaky-new-password" });
    assert.equal("password" in db.user.update.mock.calls[0].arguments[0].data, false);
  });
});

describe("the Profile page", () => {
  test("shows a Change Password form with two masked password fields (new and confirm) and a button, for admin and employee alike", () => {
    const html = renderComponent("components/ChangePasswordForm.jsx", {});
    assert.match(html, /Change Password/);
    assert.equal((html.match(/type="password"/g) ?? []).length, 2);
    for (const label of ["New Password", "Confirm New Password"]) assert.ok(html.includes(label), label);
    assert.equal(/Current Password/i.test(html), false);
    assert.match(html, /<button[^>]*type="submit"[^>]*>Change Password<\/button>/);
    assert.equal(/<input[^>]*value="[^"]+"/.test(html), false); // nothing is pre-filled
  });

  test("the form is used on the Profile page for every role, and the old optional password box is gone", () => {
    const page = read("pages/Profile.jsx");
    assert.match(page, /<ChangePasswordForm \/>/);
    assert.equal(/ROLES\.ADMIN[^\n]*ChangePasswordForm|New Password \(optional\)/.test(page), false);
    assert.equal(/name="password"/.test(page), false);
  });

  test("the form talks only to the dedicated endpoint, via the API client, and validates before sending", () => {
    const form = read("components/ChangePasswordForm.jsx");
    assert.match(form, /import \{ apiPut \} from '\.\.\/utils\/api\.js'/);
    assert.match(form, /apiPut\('\/api\/users\/me\/password', form\)/);
    assert.equal(/\bfetch\(|localStorage|sessionStorage|console\./.test(form), false);
    for (const message of ["Please fill in all password fields", "New password and confirmation do not match", "must be at least"]) {
      assert.ok(form.includes(message), message);
    }
    assert.match(form, /disabled=\{saving\}/); // no double submit while the request runs
    assert.match(form, /setForm\(EMPTY_FORM\);\s*setFeedback\(\{ type: 'success'/); // fields cleared, success shown only after the server said yes
    assert.ok(form.indexOf("res.ok && result.success") < form.indexOf("'Password changed'"));
  });
});

describe("clickable lead names", () => {
  const list = read("pages/Leads.jsx");

  test("the name opens the lead's details page through the same function as View Lead", () => {
    assert.equal((list.match(/navigate\(`\$\{basePath\}\/leads\/\$\{lead\.leadId\}`\)/g) ?? []).length, 1); // one place builds the route
    assert.match(list, /const openLead = \(lead\) => navigate\(`\$\{basePath\}\/leads\/\$\{lead\.leadId\}`\)/);
    assert.match(list, /const open = \(\) => openLead\(lead\);/); // View Lead / Edit Lead
    assert.equal((list.match(/onClick=\{\(\) => openLead\(lead\)\}/g) ?? []).length, 2); // the name in the table and in the phone-size card
  });

  test("the name is a real button with a hover state, and the row itself is not clickable", () => {
    assert.equal((list.match(/<button\s+type="button"\s+onClick=\{\(\) => openLead\(lead\)\}/g) ?? []).length, 2);
    assert.match(list, /hover:text-primary hover:underline/);
    assert.match(list, /focus-visible:underline/); // keyboard users see it too
    assert.equal(/<tr[^>]*onClick/.test(list), false); // so the dropdown and the Actions menu cannot trigger navigation
  });

  test("the existing View Lead action is still there, and admins and employees share the same route", () => {
    assert.match(list, /label: 'View Lead'/);
    const app = read("App.jsx");
    assert.ok(app.includes('path="leads/:leadId"'));
    assert.equal((app.match(/path="leads\/:leadId"/g) ?? []).length, 2); // under /admin/dashboard and /sales/dashboard
  });
});
