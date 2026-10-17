import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import AppError from "../utils/AppError.js";
import { toId, toApiId, isUniqueViolation } from "../utils/ids.js";
import { normalizeEmail } from "../utils/normalize.js";
import { ROLES, EMAIL_PATTERN } from "../constants/index.js";

// All user queries live here. Callers get plain objects with the API's `_id` (a string) and never the password hash.

/* =========================
   HELPERS
========================= */


// Database row -> API user (no password)
const toUser = (row) =>
  row && {
    _id: toApiId(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    employeeId: row.employeeId,
    profilePic: row.profilePic,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

const withLeadCounts = (row) => ({
  ...toUser(row),
  leadsCreatedCount: row._count.leadsCreated,
  leadsAssignedCount: row._count.leadsAssigned,
});

const countSelect = { _count: { select: { leadsCreated: true, leadsAssigned: true } } };

/* =========================
   AUTHENTICATION
========================= */

// Loads the user behind a verified token. Returns null when the ID is invalid or the user no longer exists.
const findForAuth = async (userId) => {
  const id = toId(userId);
  if (!id) return null;
  return toUser(await prisma.user.findUnique({ where: { id } }));
};

// Accounts are created only by an admin (createEmployee) or by the one-time first-admin script (createFirstAdmin)
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/; // fits the 20-character column; never contains "@"
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 bytes

// A real hash to compare against when the account does not exist, so a miss takes as long as a wrong password
const MISSING_ACCOUNT_HASH = bcrypt.hashSync("no-such-account", 10);

// The password policy, used for new accounts and for password changes
const checkPassword = (password) => {
  if (password.length < MIN_PASSWORD_LENGTH) throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) throw new AppError(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`, 400);
};

// Validates and normalizes the fields of a new account. The role is never part of the input.
const cleanNewAccount = ({ name, employeeId, email, password }) => {
  if (![name, employeeId, email, password].every((value) => typeof value === "string" && value.trim() !== "")) {
    throw new AppError("Name, employee ID, email and password are required", 400);
  }
  if (name.trim().length > 255) throw new AppError("Name is too long", 400);
  if (!EMPLOYEE_ID_PATTERN.test(employeeId.trim())) {
    throw new AppError("Employee ID must be 2-20 characters: letters, numbers, hyphen or underscore", 400);
  }
  if (email.trim().length > 255 || !EMAIL_PATTERN.test(email.trim())) throw new AppError("Enter a valid email address", 400);
  checkPassword(password);

  return { name: name.trim(), employeeId: employeeId.trim(), email: normalizeEmail(email), password };
};

const createAccount = async (input, role) => {
  const account = cleanNewAccount(input);
  try {
    return toUser(await prisma.user.create({ data: { ...account, password: await bcrypt.hash(account.password, 10), role, isActive: true } }));
  } catch (error) {
    if (isUniqueViolation(error, "email")) throw new AppError("An account with this email already exists", 409);
    if (isUniqueViolation(error, "employee_id")) throw new AppError("This employee ID is already in use", 409);
    throw error;
  }
};

// Admin creates an employee: always a sales account, whatever the caller sends
const createEmployee = (input) => createAccount(input, ROLES.SALES);

// Creates the first admin. Refuses when any admin already exists, so it can never add a second one.
const createFirstAdmin = async (input) => {
  if ((await prisma.user.count({ where: { role: ROLES.ADMIN } })) > 0) throw new AppError("An admin account already exists", 409);
  return createAccount(input, ROLES.ADMIN);
};

// Signs in with an email address or an employee ID. Returns the user, or throws an AppError.
// A wrong password, an unknown account and a wrong identifier type all give the same answer.
const authenticate = async (identifier, password) => {
  const where = identifier.includes("@") ? { email: normalizeEmail(identifier) } : { employeeId: identifier.trim() };
  const row = await prisma.user.findUnique({ where });

  const passwordMatches = await bcrypt.compare(password, row ? row.password : MISSING_ACCOUNT_HASH);
  if (!row || !passwordMatches) throw new AppError("Invalid credentials", 400);

  if (row.isActive === false) {
    throw new AppError("Account has been deactivated. Contact admin.", 403);
  }

  return toUser(row);
};

/* =========================
   PROFILES AND USER MANAGEMENT
========================= */

const getAllUsers = async () => {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toUser);
};

// `email` must already be normalized (trimmed and lowercase)
const isEmailTaken = async (email) => Boolean(await prisma.user.findUnique({ where: { email } }));

const getProfile = async (userId) => {
  const id = toId(userId);
  if (!id) return null;

  const row = await prisma.user.findUnique({ where: { id }, include: countSelect });
  if (!row) return null;

  const leadsCreatedCount = row._count.leadsCreated;
  return { ...toUser(row), leadsCreatedCount, totalLeads: leadsCreatedCount };
};

// Only these fields can ever be changed here: never the role, other account fields or the password (see changePassword)
const updateProfile = async (userId, data) => {
  const id = toId(userId);
  if (!id) return null;

  const changes = {};
  if (data.name !== undefined) changes.name = data.name.trim();
  if (data.phone !== undefined) changes.phone = data.phone ? data.phone.trim() : "";
  if (data.profilePic !== undefined) changes.profilePic = data.profilePic || "";
  if (data.email !== undefined) changes.email = normalizeEmail(data.email);

  try {
    const row = await prisma.user.update({ where: { id }, data: changes, include: countSelect });
    const leadsCreatedCount = row._count.leadsCreated;
    return { ...toUser(row), leadsCreatedCount, totalLeads: leadsCreatedCount };
  } catch (error) {
    if (error.code === "P2025") return null;
    if (isUniqueViolation(error, "email")) throw new AppError("Email already in use", 400);
    throw error;
  }
};

// Self-service password change for the authenticated user's own account (the current password is not asked for).
// Only the password column is written. Existing login tokens stay valid.
const changePassword = async (userId, newPassword) => {
  checkPassword(newPassword);

  const id = toId(userId);
  const row = id && (await prisma.user.findUnique({ where: { id } }));
  if (!row) throw new AppError("User not found", 404);
  if (row.isActive === false) throw new AppError("Account has been deactivated. Contact admin.", 403);

  if (await bcrypt.compare(newPassword, row.password)) throw new AppError("New password must be different from the current password", 400);

  await prisma.user.update({ where: { id: row.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
};

const getSalesWithCounts = async () => {
  const rows = await prisma.user.findMany({
    where: { role: ROLES.SALES },
    orderBy: { createdAt: "desc" },
    include: countSelect,
  });

  return rows.map((row) => {
    const user = withLeadCounts(row);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      employeeId: user.employeeId || "",
      profilePic: user.profilePic || "",
      isActive: user.isActive,
      leadsCreatedCount: user.leadsCreatedCount,
      leadsAssignedCount: user.leadsAssignedCount,
    };
  });
};

// The people a lead can be assigned to: active employees with the sales role (never an admin)
const listAssignable = async () => {
  const rows = await prisma.user.findMany({ where: { role: ROLES.SALES, isActive: true }, orderBy: { name: "asc" } });
  return rows.map((row) => ({ _id: toApiId(row.id), name: row.name, email: row.email, employeeId: row.employeeId }));
};

const setAvatar = async (userId, filename) => {
  const id = toId(userId);
  if (!id) return null;

  try {
    return toUser(await prisma.user.update({ where: { id }, data: { profilePic: `/uploads/${filename}` } }));
  } catch (error) {
    if (error.code === "P2025") return null;
    throw error;
  }
};

const getByEmployeeId = async (employeeId) => {
  const row = await prisma.user.findUnique({ where: { employeeId }, include: countSelect });
  return row ? withLeadCounts(row) : null;
};

// Deletes a sales user and reassigns their leads to the acting admin, all or nothing
const terminateByEmployeeId = async (employeeId, adminId) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { employeeId } });
    if (!user) throw new AppError("User not found", 404);
    if (user.role === ROLES.ADMIN) throw new AppError("Cannot delete an admin", 403);

    const { count } = await tx.lead.updateMany({
      where: { assignedToId: user.id },
      data: { assignedToId: toId(adminId) },
    });
    await tx.user.delete({ where: { id: user.id } });

    return { user: toUser(user), reassignedCount: count };
  });
};

// Activates or deactivates an employee (never an admin)
const setActiveByEmployeeId = async (employeeId, isActive) => {
  const user = await prisma.user.findUnique({ where: { employeeId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.role === ROLES.ADMIN) throw new AppError("Cannot change an admin's status", 403);
  return toUser(await prisma.user.update({ where: { id: user.id }, data: { isActive } }));
};

/* =========================
   DEMO DATA (used only by the seeder)
========================= */

const findByEmail = async (email) => toUser(await prisma.user.findUnique({ where: { email: normalizeEmail(email) } }));
const findFirstByRole = async (role) => toUser(await prisma.user.findFirst({ where: { role } }));
const countByRole = async (role) => prisma.user.count({ where: { role } });
const listByRole = async (role) => (await prisma.user.findMany({ where: { role }, orderBy: { id: "asc" } })).map(toUser);
const createUser = async (data) => toUser(await prisma.user.create({ data }));
const createManyUsers = async (rows) => (await prisma.user.createMany({ data: rows })).count;

const User = {
  findForAuth,
  createEmployee,
  createFirstAdmin,
  authenticate,
  getAllUsers,
  isEmailTaken,
  getProfile,
  updateProfile,
  changePassword,
  getSalesWithCounts,
  listAssignable,
  setAvatar,
  getByEmployeeId,
  terminateByEmployeeId,
  setActiveByEmployeeId,
  findByEmail,
  findFirstByRole,
  countByRole,
  listByRole,
  createUser,
  createManyUsers,
};

export default User;
