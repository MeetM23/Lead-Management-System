// `npm run db:check`: tells you whether the app can reach your local database and whether the tables exist.
// It prints the server version, database name and table names, but never the password.
import dotenv from "dotenv";
dotenv.config();

import { getDatabaseUrlProblem } from "../config/env.js";
import { describeDatabase, disconnectDB } from "../config/db.js";

const problem = getDatabaseUrlProblem(process.env.DATABASE_URL);
if (problem) {
  console.log(`✗ ${problem}`);
  process.exit(1);
}

const { hostname, port, pathname } = new URL(process.env.DATABASE_URL);

try {
  const { version, tables } = await describeDatabase();
  console.log(`✓ Connected to ${hostname}:${port || 3306}, database "${pathname.slice(1)}" (server ${version})`);
  console.log(tables.length > 0 ? `✓ Tables: ${tables.join(", ")}` : "• The database is empty. Next step: npm run db:migrate");
} catch (error) {
  // Prisma's message names the problem (wrong login, unknown database, server not running) without the password
  console.log(`✗ Could not use the database: ${error.message.split("\n").find((line) => line.trim()) ?? error.code}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
