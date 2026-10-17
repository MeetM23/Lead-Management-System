// Explicit entry point for demo data: `npm run seed`.
// Refuses to start (before connecting to the database) unless seeding is explicitly enabled and safe.
import dotenv from "dotenv";
dotenv.config();

import connectDB, { disconnectDB } from "../config/db.js";
import seedDummyData, { getSeedingBlockReason } from "./seedDummyData.js";

const blockReason = getSeedingBlockReason();

if (blockReason) {
  console.log(`🚫 Seeding not started: ${blockReason}`);
  process.exitCode = 1;
} else {
  try {
    await connectDB();
    await seedDummyData();
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
