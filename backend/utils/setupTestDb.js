// `npm run db:test:setup`: creates the tables in the TEST database (TEST_DATABASE_URL in backend/.env).
// It runs Prisma's `migrate deploy` against that database only, and refuses any name that does not end in _test.
import dotenv from "dotenv";
dotenv.config();

import { spawnSync } from "node:child_process";
import { getDatabaseUrlProblem } from "../config/env.js";

const testUrl = process.env.TEST_DATABASE_URL;
const problem = getDatabaseUrlProblem(testUrl);

if (problem) {
  console.log(`✗ TEST_DATABASE_URL: ${problem.replace("DATABASE_URL", "TEST_DATABASE_URL")}`);
  process.exit(1);
}
if (!new URL(testUrl).pathname.slice(1).endsWith("_test")) {
  console.log('✗ TEST_DATABASE_URL must point to a database whose name ends in "_test" (for example leadflow_test).');
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: testUrl },
});
process.exit(result.status ?? 1);
