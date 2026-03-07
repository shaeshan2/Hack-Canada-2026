#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/promote.js admin <email>
 *   node scripts/promote.js seller <email>
 *
 * npm scripts:
 *   npm run promote:admin -- <email>
 *   npm run promote:seller -- <email>
 */
const { execSync } = require("child_process");
const path = require("path");

const [, , roleArg, email] = process.argv;

const validRoles = {
  admin: "ADMIN",
  seller: "SELLER_VERIFIED",
};

if (!roleArg || !validRoles[roleArg] || !email) {
  console.error("Usage: node scripts/promote.js admin|seller <email>");
  process.exit(1);
}

const dbRole = validRoles[roleArg];
const dbPath = path.resolve(__dirname, "../dev.db");

try {
  const result = execSync(
    `sqlite3 "${dbPath}" "UPDATE User SET role='${dbRole}' WHERE email='${email}'; SELECT changes();"`,
    { encoding: "utf8" },
  ).trim();

  const changed = parseInt(result, 10);
  if (changed === 0) {
    console.error(`No user found with email: ${email}`);
    console.log("Existing users:");
    const users = execSync(
      `sqlite3 "${dbPath}" "SELECT email, role FROM User;"`,
      {
        encoding: "utf8",
      },
    );
    console.log(users);
    process.exit(1);
  }

  console.log(`✓ ${email} promoted to ${dbRole}`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
