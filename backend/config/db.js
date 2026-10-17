import { PrismaClient } from "@prisma/client";

// The Prisma client is created on first use, so importing a model never opens a connection.
let client = null;
const getClient = () => (client ??= new PrismaClient());

// All database access goes through this object (used only inside models/).
export const prisma = new Proxy({}, { get: (_target, property) => getClient()[property] });

// Lets tests replace the real client with a stand-in
export const setPrismaClient = (replacement) => {
  client = replacement;
};

const connectDB = async () => {
  try {
    await getClient().$connect();
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Server version and table names, for `npm run db:check`
export const describeDatabase = async () => {
  const [{ version }] = await getClient().$queryRaw`SELECT VERSION() AS version`;
  const tables = await getClient().$queryRaw`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name`;
  return { version, tables: tables.map((table) => table.name).filter((name) => !name.startsWith("_prisma")) };
};

export const disconnectDB = async () => {
  if (client) await client.$disconnect();
};

export default connectDB;
