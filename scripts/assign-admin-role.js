#!/usr/bin/env node
/**
 * Usage: node scripts/assign-admin-role.js <email>
 *
 * Ensures an "Admin" role with admin:review permission exists in Auth0,
 * then assigns it to the given user.
 */
require("dotenv").config();
const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_M2M_CLIENT_ID;
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
const audience = process.env.AUTH0_AUDIENCE; // e.g. http://localhost:3000
const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/assign-admin-role.js <email>");
  process.exit(1);
}

async function mgmt(token, path, method = "GET", body) {
  const res = await fetch(`https://${domain}/api/v2${path}`, {
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

async function main() {
  // 1. Get M2M token
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
  if (error) {
    console.error("Token error:", error);
    process.exit(1);
  }

  // 2. Find user
  const users = await mgmt(
    access_token,
    `/users?q=email%3A${encodeURIComponent(email)}&search_engine=v3`,
  );
  if (!Array.isArray(users) || users.length === 0) {
    console.error("User not found:", email);
    process.exit(1);
  }
  const userId = users[0].user_id;
  console.log("Found user:", userId);

  // 3. Find or create "Admin" role
  const allRoles = await mgmt(access_token, "/roles");
  const roleList = Array.isArray(allRoles) ? allRoles : (allRoles.roles ?? []);
  // Role names in Auth0 are case-sensitive — match any casing of "admin"
  let adminRole = roleList.find((r) => r.name.toLowerCase() === "admin");
  if (!adminRole) {
    console.log("Creating admin role...");
    adminRole = await mgmt(access_token, "/roles", "POST", {
      name: "admin",
      description: "DeedScan admin — can review sellers and fraud flags",
    });
  }
  console.log("Admin role ID:", adminRole.id);

  // 4. Ensure admin:review permission is on the role
  // Find the resource server ID for AUTH0_AUDIENCE
  const apis = await mgmt(access_token, "/resource-servers");
  const apiList = Array.isArray(apis) ? apis : (apis.resource_servers ?? []);
  const api = apiList.find((a) => a.identifier === audience);
  if (!api) {
    console.error(
      `Could not find resource server with identifier "${audience}". Check AUTH0_AUDIENCE.`,
    );
    process.exit(1);
  }
  const existingPerms = await mgmt(
    access_token,
    `/roles/${adminRole.id}/permissions`,
  );
  const permList = Array.isArray(existingPerms)
    ? existingPerms
    : (existingPerms.permissions ?? []);
  const hasAdminReview = permList.some(
    (p) => p.permission_name === "admin:review",
  );
  if (!hasAdminReview) {
    console.log("Adding admin:review permission to Admin role...");
    await mgmt(access_token, `/roles/${adminRole.id}/permissions`, "POST", {
      permissions: [
        {
          resource_server_identifier: audience,
          permission_name: "admin:review",
        },
      ],
    });
  } else {
    console.log("admin:review already on role ✓");
  }

  // 5. Assign role to user
  await mgmt(
    access_token,
    `/users/${encodeURIComponent(userId)}/roles`,
    "POST",
    {
      roles: [adminRole.id],
    },
  );
  console.log(`✓ Assigned Admin role to ${email}`);
  console.log("Log out and back in at localhost:3000 to get a fresh token.");
}

main().catch(console.error);
