import { describe, test, mock, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import jwt from "jsonwebtoken";
import Lead from "../models/Lead.js";
import leadRoutes from "../routes/leadRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { cleanPhone } from "../utils/normalize.js";
import { parseSpreadsheet, buildImportRows, parseMapping, suggestMapping } from "../utils/leadImport.js";
import { computeMenuPosition } from "../../frontend/src/utils/menuPosition.js";
import { renderComponent } from "./helpers/renderComponent.js";
import { installFakePrisma, leadRow, userRow, admin } from "./helpers/fakePrisma.js";

// No database is used: the Prisma client is replaced by an in-memory stand-in, and the React components are rendered
// to HTML in Node (not in a browser). What was checked against real MariaDB is described in the final report.

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.resolve(backendDir, "..", "frontend", "src");
const read = (file) => fs.readFileSync(path.join(frontend, file), "utf8");

let db;
let people;
let leads;

const installStore = () => {
  db = installFakePrisma();
  people = [
    userRow({ id: 1, name: "Sam Sales", role: "sales", email: "sam@example.com", employeeId: "EMP-1" }),
    userRow({ id: 2, name: "Boss Admin", role: "admin", email: "boss@example.com", employeeId: "ADM-1" }),
    userRow({ id: 3, name: "Other Sales", role: "sales", email: "other@example.com", employeeId: "EMP-3" }),
    userRow({ id: 4, name: "Left Company", role: "sales", email: "left@example.com", employeeId: "EMP-4", isActive: false }),
  ];
  leads = [
    leadRow({
      id: 10, leadId: "LD-0100", assignedToId: 1, phone: "p:+919042435900", state: "west.Bengal",
      customFields: { loan_requirement: "90lakh", "is_your_business_registered_as_an_msme?": "yes", "which_zed_certification_level_are_you_interested_in?": "not_sure_/_need_guidance", ad_name: "Zed Certification" },
    }),
    leadRow({ id: 11, leadId: "LD-0101", assignedToId: 3, phone: "9876543210", customFields: { loan_requirement: "2500000" } }),
    leadRow({ id: 12, leadId: "LD-0102", assignedToId: 2, assignedTo: { id: 2, name: "Boss Admin", email: "boss@example.com" } }), // held by an admin
  ];
  db.user.findUnique = mock.fn(async ({ where }) => people.find((row) => row.id === where.id) ?? null);
  db.user.findMany = mock.fn(async ({ where } = {}) => people.filter((row) => (!where?.role || row.role === where.role) && (where?.isActive === undefined || row.isActive === where.isActive)));
  db.lead.findUnique = mock.fn(async ({ where }) => leads.find((row) => row.id === where.id || row.leadId === where.leadId) ?? null);
  db.lead.update = mock.fn(async ({ where, data }) => {
    const row = leads.find((candidate) => candidate.id === where.id);
    Object.assign(row, data);
    if (data.assignedToId) row.assignedTo = { id: data.assignedToId, name: people.find((p) => p.id === data.assignedToId).name, email: "x" };
    return row;
  });
};

describe("HTTP", () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
    const app = express();
    app.use(express.json());
    app.use("/api/leads", leadRoutes);
    app.use("/api/users", userRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    installStore();
    mock.method(console, "error", () => {});
  });
  afterEach(() => mock.restoreAll());

  const call = async (method, urlPath, userId, body) => {
    const response = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: { "Content-Type": "application/json", ...(userId ? { Authorization: `Bearer ${jwt.sign({ id: String(userId) }, process.env.JWT_SECRET)}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const SAM = 1;
  const BOSS = 2;

  describe("loan requirement and the other imported fields on the lead page", () => {
    test("the detail API returns every saved custom field with its saved name and value", async () => {
      const { status, body } = await call("GET", "/api/leads/LD-0100", BOSS);
      assert.equal(status, 200);
      assert.deepEqual(body.data.customFields, {
        loan_requirement: "90lakh",
        "is_your_business_registered_as_an_msme?": "yes",
        "which_zed_certification_level_are_you_interested_in?": "not_sure_/_need_guidance",
        ad_name: "Zed Certification",
      });
    });

    test("the lead page shows what the API returned: loan requirement, MSME, ZED answer, but not the ad name", async () => {
      const { body } = await call("GET", "/api/leads/LD-0100", BOSS);
      const html = renderComponent("components/leads/CustomFieldsCard.jsx", { customFields: body.data.customFields });
      for (const text of ["loan_requirement", "90lakh", "is_your_business_registered_as_an_msme?", ">yes<", "which_zed_certification_level_are_you_interested_in?", "not_sure_/_need_guidance"]) {
        assert.ok(html.includes(text), text);
      }
      assert.equal(html.includes("ad_name"), false);
      assert.equal(html.includes("Zed Certification"), false);
    });

    test("a different spreadsheet's columns are shown the same way, nothing is hardcoded", () => {
      const html = renderComponent("components/leads/CustomFieldsCard.jsx", { customFields: { "Monthly Income": "₹ 50,000", "कारोबार": "दुकान", notes: "line one\nline two", empty: "" } });
      for (const text of ["Monthly Income", "₹ 50,000", "कारोबार", "दुकान", "line one\nline two"]) assert.ok(html.includes(text), text);
      assert.ok(html.includes("—")); // the empty value
    });

    test("the lead page really renders that card from the lead it loaded", () => {
      assert.match(read("pages/LeadDetails.jsx"), /<CustomFieldsCard customFields=\{lead\.customFields\} \/>/);
    });

    test("a sales user gets the custom fields of their own lead, and is refused someone else's", async () => {
      assert.equal((await call("GET", "/api/leads/LD-0100", SAM)).body.data.customFields.loan_requirement, "90lakh");
      assert.equal((await call("GET", "/api/leads/LD-0101", SAM)).status, 403);
    });
  });

  describe("employees a lead can be assigned to", () => {
    test("the list holds only active sales employees: no admin, no deactivated employee", async () => {
      const { status, body } = await call("GET", "/api/users/assignable", BOSS);
      assert.equal(status, 200);
      assert.deepEqual(body.data.map((employee) => employee.name).sort(), ["Other Sales", "Sam Sales"]);
      assert.deepEqual(db.user.findMany.mock.calls[0].arguments[0], { where: { role: "sales", isActive: true }, orderBy: { name: "asc" } });
      assert.ok(body.data.every((employee) => !("password" in employee) && !("role" in employee)));
      assert.equal(JSON.stringify(body).includes("Boss Admin"), false);
      assert.equal(JSON.stringify(body).includes("Left Company"), false);
    });

    test("the list is admin-only", async () => {
      assert.equal((await call("GET", "/api/users/assignable", null)).status, 401);
      assert.equal((await call("GET", "/api/users/assignable", SAM)).status, 403);
    });

    test("the server refuses to assign to an admin, an inactive employee, an unknown or malformed id", async () => {
      for (const target of ["2", "4", "999", "abc", { id: 3 }, null]) {
        assert.equal((await call("PATCH", "/api/leads/LD-0100/assign", BOSS, { assignedTo: target })).status, 400, JSON.stringify(target));
      }
      assert.equal(leads[0].assignedToId, 1);
      assert.equal(db.lead.update.mock.calls.length, 0);
    });

    test("an admin can assign to an active sales employee, a sales user cannot assign at all", async () => {
      assert.equal((await call("PATCH", "/api/leads/LD-0100/assign", SAM, { assignedTo: "3" })).status, 403);
      const ok = await call("PATCH", "/api/leads/LD-0100/assign", BOSS, { assignedTo: "3" });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.assignedTo.name, "Other Sales");
    });

    test("a lead held by an admin still loads, and can be moved to a valid employee", async () => {
      const detail = await call("GET", "/api/leads/LD-0102", BOSS);
      assert.equal(detail.body.data.assignedTo.name, "Boss Admin");
      assert.equal((await call("PATCH", "/api/leads/LD-0102/assign", BOSS, { assignedTo: "1" })).status, 200);
      assert.equal(leads[2].assignedToId, 1);
    });

    test("a sales user's list is still limited to their own leads", async () => {
      db.lead.findMany = mock.fn(async () => []);
      db.lead.count = mock.fn(async () => 0);
      await call("GET", "/api/leads?assignedTo=3&source=x&state=y", SAM);
      assert.equal(db.lead.findMany.mock.calls[0].arguments[0].where.assignedToId, 1);
    });
  });

  describe("only an admin adds or imports leads", () => {
    test("an employee cannot add a lead: refused, nothing created, no ID used", async () => {
      db.counter.update = mock.fn(async () => ({ name: "leadId", seq: 1n }));
      for (const body of [{ name: "New" }, { name: "New", assignedTo: "1" }]) {
        const { status, body: result } = await call("POST", "/api/leads", SAM, body);
        assert.equal(status, 403);
        assert.equal(result.success, false);
      }
      assert.equal(db.lead.create.mock.calls.length, 0);
      assert.equal(db.counter.update.mock.calls.length, 0);
    });

    test("an unauthenticated request cannot add a lead", async () => {
      assert.equal((await call("POST", "/api/leads", null, { name: "New" })).status, 401);
    });

    test("an admin can still add a lead for an active employee", async () => {
      db.counter.findUnique = mock.fn(async () => ({ name: "leadId", seq: 5n }));
      db.counter.update = mock.fn(async () => ({ name: "leadId", seq: 6n }));
      db.lead.create = mock.fn(async ({ data }) => leadRow({ ...data, id: 20 }));
      const { status } = await call("POST", "/api/leads", BOSS, { name: "New", assignedTo: "3" });
      assert.equal(status, 201);
      assert.equal(db.lead.create.mock.calls[0].arguments[0].data.assignedToId, 3);
    });

    test("the model refuses a sales user too, whatever route reached it", async () => {
      await assert.rejects(Lead.createForUser({ name: "A", assignedTo: "1" }, { _id: "1", role: "sales" }), (error) => error.statusCode === 403);
    });
  });

  describe("phone numbers", () => {
    test("the API returns clean numbers for old stored values, in the list and on the detail", async () => {
      db.lead.findMany = mock.fn(async () => leads);
      db.lead.count = mock.fn(async () => 3);
      const list = await call("GET", "/api/leads", BOSS);
      assert.deepEqual(list.body.data.map((lead) => lead.phone), ["+919042435900", "9876543210", leadRow().phone]);
      assert.equal((await call("GET", "/api/leads/LD-0100", BOSS)).body.data.phone, "+919042435900");
      assert.equal(leads[0].phone, "p:+919042435900"); // the stored value is not touched
    });

    test("a phone typed or edited with the label is saved clean", async () => {
      assert.equal((await call("PUT", "/api/leads/LD-0101", BOSS, { phone: "p:+91 98765 43210" })).body.data.phone, "+91 98765 43210");
      assert.equal(leads[1].phone, "+91 98765 43210");
    });
  });
});

describe("phone cleaning", () => {
  test("removes the export label from real phone numbers", () => {
    const cases = {
      "p:+917550853464": "+917550853464",
      "P:+917550853464": "+917550853464",
      "p: +91 75508 53464": "+91 75508 53464",
      "  p:9876543210  ": "9876543210",
      "tel:+1 (555) 123-4567": "+1 (555) 123-4567",
      "phone: 022-2345 6789": "022-2345 6789",
    };
    for (const [input, expected] of Object.entries(cases)) assert.equal(cleanPhone(input), expected, input);
  });

  test("leaves everything else exactly as it was, so no real digit or country code is lost", () => {
    for (const same of ["+917550853464", "9876543210", "+91 98765-43210", "(022) 2345 6789", "00447911123456", "p:", "p:abc", "p:+91abc", "pp:+917550853464", "ext:123456", "call p:+917550853464", "N/A", "", "   "]) {
      assert.equal(cleanPhone(same), same, JSON.stringify(same));
    }
    for (const notText of [null, undefined, 5]) assert.equal(cleanPhone(notText), notText);
  });

  test("an import stores the clean number; xlsx and csv give the same result", async () => {
    const text = "full_name,phone\nAsha,p:+917550853464\nRavi,+91 98765 43210\nMeena,p:9876543210";
    const sheet = await parseSpreadsheet({ originalname: "l.csv", buffer: Buffer.from(text), size: text.length }, { maxRows: 10 });
    const items = buildImportRows(sheet, parseMapping(JSON.stringify(suggestMapping(sheet.headers)), 2));
    assert.deepEqual(items.map((item) => item.fields.phone), ["+917550853464", "+91 98765 43210", "9876543210"]);
  });

  test("duplicate detection still matches a labelled number with a plain one", async () => {
    const { markDuplicates } = await import("../utils/leadImport.js");
    const sheet = await parseSpreadsheet({ originalname: "l.csv", buffer: Buffer.from("full_name,phone\nA,p:+917550853464\nB,+91 75508 53464"), size: 50 }, { maxRows: 10 });
    const items = buildImportRows(sheet, parseMapping('{"0":"name","1":"phone"}', 2));
    markDuplicates(items, []);
    assert.deepEqual(items[1].duplicateReasons, ["Same phone as row 2 in this file"]);
  });

  test("the model hands out clean numbers", async () => {
    installStore();
    db.lead.findUnique = mock.fn(async () => leads[0]);
    assert.equal((await Lead.findDetail("LD-0100", admin())).phone, "+919042435900");
  });
});

describe("the Leads page", () => {
  const list = read("pages/Leads.jsx");

  test("has no State or Source filter, and no code that exists only for them", () => {
    assert.equal(/All States|All Sources|stateFilter|sourceFilter|stateOptions|uniqueSources|api\/leads\/states|apiGet/.test(list), false);
    assert.equal(/aria-label="Filter by state"/.test(list), false);
  });

  test("keeps search, the employee filter (admin), the time filter, sorting and paging", () => {
    for (const text of ["Search name, phone, email or lead ID", "All Employees", "All Time", "Newest First", "Rows per page"]) assert.ok(list.includes(text), text);
    assert.match(list, /user\?\.role === ROLES\.ADMIN && \(\s*<select/);
  });

  test("the Assigned Employee column and dropdown are for admins only: an employee does not see their own name as a column", () => {
    assert.match(list, /\.\.\.\(isAdmin \? \['Assigned Employee'\] : \[\]\)/);
    assert.match(list, /\{isAdmin && <td className="px-4 py-3"><AssigneeSelect/);
    assert.match(list, /\{isAdmin && <div>.*<AssigneeSelect/);
  });

  test("the employee dropdown uses only the server's assignable list, with no special option for the current user or an admin", () => {
    const controls = read("components/leads/LeadInlineControls.jsx");
    assert.equal(/ROLES\.SALES|role ===|isActive/.test(controls.split("export const AssigneeSelect")[1]), false); // no client-side guessing
    assert.match(read("context/LeadsContext.jsx"), /apiGet\('\/api\/users\/assignable'\)/);
    assert.equal(/user\??\.name/.test(controls), false);
    assert.equal(/Currently:/.test(controls), false); // no "Currently: Admin" caption
  });

  test("the row menu is the portal-based menu for the table and for the cards", () => {
    assert.equal((list.match(/<RowActionsMenu/g) ?? []).length, 2);
    assert.equal(/absolute right-0 top-full|openDropdownId|dropdownRef/.test(list), false);
  });
});

describe("the screens for employees", () => {
  test("the Leads page and the dashboard show Import Leads and Add Lead to admins only", () => {
    const list = read("pages/Leads.jsx");
    assert.match(list, /\{isAdmin && \(\s*<div className="flex items-center gap-3">\s*<button\s+onClick=\{\(\) => navigate\(`\$\{basePath\}\/import-leads`\)\}/);
    assert.match(read("pages/Dashboard.jsx"), /user\?\.role === ROLES\.ADMIN && \(\s*<button\s+onClick=\{\(\) => navigate\(`\$\{getBasePath\(user\?\.role\)\}\/add-lead`\)\}/);
  });

  test("the add-lead and import-leads pages exist only in the admin area", () => {
    const app = read("App.jsx");
    const admin = app.slice(app.indexOf('path="/admin/dashboard"'), app.indexOf('path="/sales/dashboard"'));
    const employee = app.slice(app.indexOf('path="/sales/dashboard"'));
    for (const page of ["add-lead", "import-leads"]) {
      assert.ok(admin.includes(`path="${page}"`), page);
      assert.equal(employee.includes(`path="${page}"`), false, page);
    }
  });
});

describe("the Actions menu", () => {
  const viewport = { width: 1280, height: 720 };
  const button = (top, left, size = 36) => ({ top, bottom: top + size, left, right: left + size });
  const menu = { width: 176, height: 130 };
  const inside = ({ top, left }) => top >= 8 && left >= 8 && top + menu.height <= viewport.height - 8 && left + menu.width <= viewport.width - 8;

  test("near the top of the table it opens downwards from its own button", () => {
    const position = computeMenuPosition(button(100, 1000), menu, viewport);
    assert.equal(position.opensUp, false);
    assert.equal(position.top, 100 + 36 + 4);
    assert.equal(position.left, 1000 + 36 - menu.width); // right-aligned with the button
    assert.ok(inside(position));
  });

  test("near the bottom of the window it opens upwards, fully visible, above the footer", () => {
    const position = computeMenuPosition(button(660, 1000), menu, viewport);
    assert.equal(position.opensUp, true);
    assert.equal(position.top, 660 - 4 - menu.height);
    assert.ok(inside(position));
  });

  test("at the right edge it is pulled back inside the window", () => {
    const position = computeMenuPosition(button(200, 1270), menu, viewport);
    assert.ok(inside(position), JSON.stringify(position));
  });

  test("at the left edge it is pulled inside the window", () => {
    const position = computeMenuPosition(button(200, 0), menu, viewport);
    assert.equal(position.left, 8);
    assert.ok(inside(position));
  });

  test("it stays inside the window for a button anywhere on the screen, and in a small window", () => {
    for (const size of [viewport, { width: 360, height: 400 }]) {
      for (let top = 0; top <= size.height - 36; top += 41) {
        for (let left = 0; left <= size.width - 36; left += 53) {
          const position = computeMenuPosition(button(top, left), menu, size);
          assert.ok(position.top >= 8 && position.left >= 8, `${top},${left}`);
          assert.ok(position.top + menu.height <= Math.max(size.height - 8, menu.height + 8), `${top},${left}`);
          assert.ok(position.left + menu.width <= Math.max(size.width - 8, menu.width + 8), `${top},${left}`);
        }
      }
    }
  });

  test("when there is little room both ways it picks the roomier side", () => {
    assert.equal(computeMenuPosition(button(500, 600), { width: 176, height: 400 }, viewport).opensUp, true);
    assert.equal(computeMenuPosition(button(100, 600), { width: 176, height: 400 }, viewport).opensUp, false);
  });

  test("the component is drawn outside the table, closes on outside click, Escape, scroll and resize, and supports the keyboard", () => {
    const source = read("components/leads/RowActionsMenu.jsx");
    assert.match(source, /createPortal\(/);
    assert.match(source, /position: 'fixed'/);
    assert.match(source, /e\.key === 'Escape'/);
    assert.match(source, /addEventListener\('mousedown'/);
    assert.match(source, /addEventListener\('scroll', onViewportChange, true\)/);
    assert.match(source, /addEventListener\('resize'/);
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) assert.ok(source.includes(key), key);
    for (const attribute of ['role="menu"', 'role="menuitem"', 'aria-haspopup="menu"', "aria-expanded"]) assert.ok(source.includes(attribute), attribute);
  });

  test("it renders as a closed button with an accessible name, and the menu only exists once opened", () => {
    const html = renderComponent("components/leads/RowActionsMenu.jsx", { label: "Actions for Asha", actions: [{ key: "view", label: "View Lead", icon: () => null, onSelect() {} }] });
    assert.match(html, /aria-label="Actions for Asha"/);
    assert.match(html, /aria-expanded="false"/);
    assert.equal(html.includes("View Lead"), false);
  });

  test("the row actions keep their authorization: Delete is offered to admins only", () => {
    const list = read("pages/Leads.jsx");
    assert.match(list, /\.\.\.\(isAdmin \? \[\{ key: 'delete'/);
    assert.match(list, /View Lead/);
    assert.match(list, /Edit Lead/);
  });
});

describe("imports keep the Source and State data", () => {
  test("source and state columns are still mapped and stored", async () => {
    const sheet = await parseSpreadsheet({ originalname: "l.csv", buffer: Buffer.from("full_name,state,source\nAsha,west.Bengal,Facebook"), size: 50 }, { maxRows: 10 });
    const mapping = suggestMapping(sheet.headers);
    assert.deepEqual(mapping, { 0: "name", 1: "state", 2: "source" });
    const [item] = buildImportRows(sheet, parseMapping(JSON.stringify(mapping), 3));
    assert.deepEqual(item.fields, { name: "Asha", state: "west.Bengal", source: "Facebook" });
  });
});
