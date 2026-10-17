import { mock } from "node:test";
import { setPrismaClient } from "../../config/db.js";

// A stand-in for the Prisma client so tests never need a database.
// Every delegate method is a mock function (inspect `.mock.calls`); replace one with `fake.lead.findUnique = mock.fn(async () => row)`.

const delegate = () => ({
  findUnique: mock.fn(async () => null),
  findFirst: mock.fn(async () => null),
  findMany: mock.fn(async () => []),
  create: mock.fn(async ({ data }) => data),
  createMany: mock.fn(async ({ data }) => ({ count: data.length })),
  update: mock.fn(async ({ data }) => data),
  updateMany: mock.fn(async () => ({ count: 0 })),
  delete: mock.fn(async () => ({})),
  deleteMany: mock.fn(async () => ({ count: 0 })),
  count: mock.fn(async () => 0),
  groupBy: mock.fn(async () => []),
});

export const installFakePrisma = () => {
  const fake = {
    user: delegate(),
    lead: delegate(),
    leadNote: delegate(),
    counter: delegate(),
    $queryRaw: mock.fn(async () => []),
    $transaction: mock.fn(async (work) => work(fake)),
    $connect: mock.fn(async () => {}),
    $disconnect: mock.fn(async () => {}),
  };
  setPrismaClient(fake);
  return fake;
};

// True when no query method on any table was called
export const noQueriesMade = (fake) =>
  ["user", "lead", "leadNote", "counter"].every((table) =>
    Object.values(fake[table]).every((method) => method.mock.calls.length === 0)
  ) && fake.$queryRaw.mock.calls.length === 0;

// Test data in the shape Prisma returns
export const userRow = (overrides = {}) => ({
  id: 1,
  name: "Test User",
  email: "user@example.com",
  password: "hash",
  role: "sales",
  phone: null,
  employeeId: "USR-000001",
  profilePic: null,
  isActive: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  ...overrides,
});

export const leadRow = (overrides = {}) => ({
  id: 10,
  leadId: "LD-0001",
  name: "Original",
  email: "lead@example.com",
  phone: null,
  source: "Website",
  priority: "Medium",
  customFields: null,
  createdById: 1,
  assignedToId: 1,
  assignedTo: { id: 1, name: "Sam", email: "sam@example.com" },
  createdBy: { id: 1, name: "Sam", email: "sam@example.com" },
  notes: [],
  createdAt: new Date("2025-01-02T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  ...overrides,
});

// A user as the API hands it to the models (req.user)
export const sales = (id = 1) => ({ _id: String(id), role: "sales" });
export const admin = (id = 99) => ({ _id: String(id), role: "admin" });
