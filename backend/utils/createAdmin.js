// `npm run create-admin`: creates the first admin account on your local database.
// It asks for the details in the terminal (the password is not shown and is never printed or stored in a file),
// and refuses to run when an admin already exists. Further employees are created by that admin in the website.
import dotenv from "dotenv";
dotenv.config();

import readline from "node:readline/promises";
import { Writable } from "node:stream";
import { getDatabaseUrlProblem } from "../config/env.js";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/User.js";

const problem = getDatabaseUrlProblem(process.env.DATABASE_URL);
if (problem) {
  console.log(`✗ ${problem}`);
  process.exit(1);
}
if (!process.stdin.isTTY) {
  console.log("✗ Run this in an interactive terminal: it asks for the password and does not accept it from a pipe.");
  process.exit(1);
}

// Typed characters are echoed only while `echo` is true (turned off for the password)
let echo = true;
const output = new Writable({
  write(chunk, encoding, done) {
    if (echo) process.stdout.write(chunk, encoding);
    done();
  },
});
const rl = readline.createInterface({ input: process.stdin, output, terminal: true });

const ask = async (question) => (await rl.question(question)).trim();
const askPassword = async (question) => {
  const answer = rl.question(question); // the prompt is written now, then typing is hidden
  echo = false;
  const password = await answer;
  echo = true;
  process.stdout.write("\n");
  return password;
};

try {
  await connectDB();

  const name = await ask("Admin name: ");
  const employeeId = await ask("Employee ID (e.g. ADM-001): ");
  const email = await ask("Email: ");
  const password = await askPassword("Password (min 8 characters): ");
  if (password !== (await askPassword("Repeat password: "))) throw new Error("The passwords do not match");

  const admin = await User.createFirstAdmin({ name, employeeId, email, password });
  console.log(`✓ Admin created: ${admin.name} (${admin.employeeId}, ${admin.email}). Log in on the website with your email or employee ID.`);
} catch (error) {
  console.log(`✗ ${error.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
  await disconnectDB();
}
