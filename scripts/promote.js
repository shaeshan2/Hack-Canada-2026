#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/promote.js admin <email>
 *   node scripts/promote.js seller <email>
 *
 * npm scripts:
 *   npm run promote:admin -- <email>
 *   npm run promote:seller -- <email>
 *
 * For admin: also assigns the Auth0 "admin" role + admin:review permission.
 * Requires AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET, AUTH0_DOMAIN, AUTH0_AUDIENCE in .env
 */
require("dotenv").config();
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

// ── 1. DB promotion ──────────────────────────────────────────────────────────
try {
  // Use parameterised query via sqlite3 -cmd to avoid injection
  const safeEmail = email.replace(/'/g, "''");
  const result = execSync(
    `sqlite3 "${dbPath}" "UPDATE User SET role='${dbRole}' WHERE email='${safeEmail}'; SELECT changes();"`,
    { encoding: "utf8" },
  ).trim();

  const changed = parseInt(result, 10);
  if (changed === 0) {
    console.error(`No user found with email: ${email}`);
    console.log("Existing users:");
    const users = execSync(
      `sqlite3 "${dbPath}" "SELECT email, role FROM User;"`,
      { encoding: "utf8" },
    );
    console.log(users);
    process.exit(1);
  }
  console.log(`✓ DB: ${email} → ${dbRole}`);
} catch (err) {
  console.error("DB promotion failed:", err.message);
  process.exit(1);
}

// ── 2. Auth0 promotion (admin only) ─────────────────────────────────────────
if (roleArg !== "admin") process.exit(0);

const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_M2M_CLIENT_ID;
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !clientId || !clientSecret || !audience) {
  console.warn(
    "⚠ Skipping Auth0 promotion: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET, AUTH0_AUDIENCE must all be set.",
  );
  process.exit(0);
}

async function mgmt(token, apiPath, method = "GET", body) {
  const res = await fetch(`https://${domain}/api/v2${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  return res.json();
}

async function promoteInAuth0() {
  // Get M2M token
  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  });
  const { access_token, error } = await tokenRes.json();
  if (error) throw new Error(`M2M token error: ${error}`);

  // Find the user in Auth0
  const users = await mgmt(
    access_token,
    `/users?q=email%3A${encodeURIComponent(email)}&search_engine=v3`,
  );
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error(`User not found in Auth0: ${email}`);
  }
  const userId = users[0].user_id;

  // Find the "admin" role
  const allRoles = await mgmt(access_token, "/roles");
  const roleList = Array.isArray(allRoles) ? allRoles : (allRoles.roles ?? []);
  const adminRole = roleList.find((r) => r.name.toLowerCase() === "admin");
  if (!adminRole) {
    throw new Error(
      'No "admin" role found in Auth0. Create it in Dashboard → User Management → Roles.',
    );
  }

  // Ensure admin:review permission is on the role
  const existingPerms = await mgmt(
    access_token,
    `/roles/${adminRole.id}/permissions`,
  );
  const permList = Array.isArray(existingPerms)
    ? existingPerms
    : (existingPerms.permissions ?? []);
  if (!permList.some((p) => p.permission_name === "admin:review")) {
    await mgmt(access_token, `/roles/${adminRole.id}/permissions`, "POST", {
      permissions: [
        {
          resource_server_identifier: audience,
          permission_name: "admin:review",
        },
      ],
    });
    console.log(
      `✓ Auth0: added admin:review permission to "${adminRole.name}" role`,
    );
  }

  // Assign the role to the user (safe to call even if already assigned)
  await mgmt(
    access_token,
    `/users/${encodeURIComponent(userId)}/roles`,
    "POST",
    {
      roles: [adminRole.id],
    },
  );
  console.log(`✓ Auth0: assigned "${adminRole.name}" role to ${email}`);
  console.log(
    "  → User must log out and back in for the new token to take effect.",
  );
}

promoteInAuth0().catch((err) => {
  console.error("Auth0 promotion failed:", err.message);
  process.exit(1);
});
