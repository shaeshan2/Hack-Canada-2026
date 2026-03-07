/**
 * Auth0 Phase 1 Sanity Test
 *
 * Checks four things in sequence:
 *   Part 1 — M2M creds work + all required roles exist in Auth0 tenant
 *   Part 2 — /api/auth/register creates user, sets cookie, and assigns role in Auth0
 *   Part 3 — DB user exists (only present after first login callback — notes if missing)
 *   Part 4 — blockAuth0User correctly sets blocked:true in Auth0
 *
 * Usage:
 *   node scripts/test-auth.js
 *   node scripts/test-auth.js --base-url=http://localhost:3000
 *
 * Requirements:
 *   - .env file with AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET, DATABASE_URL
 *   - Dev server running for Part 2 (npm run dev)
 *   - M2M app must have: read:users, read:roles, update:users, create:users, delete:users, assign_roles scopes
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const Database = require("better-sqlite3");
const path = require("path");

const BASE_URL =
  process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1] ??
  "http://localhost:3000";

const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_M2M_CLIENT_ID;
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
const audience = process.env.AUTH0_M2M_AUDIENCE ?? `https://${domain}/api/v2/`;
const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ❌  ${label}${detail ? `\n      → ${detail}` : ""}`);
  failed++;
}

function info(msg) {
  console.log(`  ℹ️   ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getManagementToken() {
  const r = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });
  if (!r.ok) throw new Error(`M2M token request failed: ${await r.text()}`);
  const payload = await r.json();
  if (!payload.access_token) throw new Error("No access_token in response");
  return payload.access_token;
}

function openDb() {
  const filePath = dbUrl.replace(/^file:/, "");
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, "..", filePath);
  return new Database(resolved, { readonly: true });
}

// ── Part 1: M2M creds + role existence ───────────────────────────────────────

async function part1_m2mAndRoles(token) {
  console.log("\n📋  Part 1: Auth0 M2M credentials & role existence\n");

  pass("M2M token obtained");

  const r = await fetch(`https://${domain}/api/v2/roles?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    fail(
      "List Auth0 roles",
      `${r.status} — check M2M app has read:roles scope`,
    );
    return;
  }
  const roles = await r.json();
  const roleNames = Array.isArray(roles)
    ? roles.map((ro) => ro.name.toLowerCase())
    : [];

  const required = [
    "buyer",
    "seller",
    "seller_pending",
    "seller_verified",
    "admin",
  ];
  for (const name of required) {
    if (roleNames.includes(name)) pass(`Role "${name}" exists in Auth0`);
    else
      fail(
        `Role "${name}" missing`,
        "Create it in Dashboard → User Management → Roles",
      );
  }
}

// ── Part 2: Register endpoint ─────────────────────────────────────────────────

async function part2_register(token) {
  console.log(`\n📋  Part 2: Registration flow  (dev server: ${BASE_URL})\n`);

  // Check server is up
  try {
    const ping = await fetch(`${BASE_URL}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });
    if (ping.status > 0) pass("Dev server is reachable");
  } catch {
    fail(
      "Dev server not reachable",
      `Run \`npm run dev\` in another terminal, then re-run this script`,
    );
    return null;
  }

  const testEmail = `test-sanity-${Date.now()}@test.invalid`;
  const testPassword = "TestP@ss_2026!";

  // Register as buyer
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: "Sanity Test Buyer",
      role: "buyer",
    }),
  });

  if (!regRes.ok) {
    const body = await regRes.json().catch(() => ({}));
    fail(
      "POST /api/auth/register",
      `HTTP ${regRes.status}: ${body.error ?? "(no message)"}`,
    );
    return null;
  }

  const regBody = await regRes.json().catch(() => ({}));
  if (regBody.ok === true) pass("POST /api/auth/register → ok: true");
  else fail("Register response missing ok:true", JSON.stringify(regBody));

  const cookieHeader = regRes.headers.get("set-cookie") ?? "";
  if (cookieHeader.includes("signup_intent=buyer"))
    pass("signup_intent=buyer cookie present");
  else
    fail(
      "signup_intent cookie",
      `Expected 'buyer', got: ${cookieHeader || "(none)"}`,
    );

  if (regBody.redirect?.includes("/api/auth/login"))
    pass("Redirect points to /api/auth/login");
  else fail("Redirect URL", regBody.redirect ?? "(missing)");

  // Wait for async fire-and-forget role assignment in register.ts
  info("Waiting 3 s for async Auth0 role assignment…");
  await sleep(3000);

  // Verify user exists in Auth0
  const searchRes = await fetch(
    `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(testEmail)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const users = await searchRes.json();
  if (!Array.isArray(users) || users.length === 0) {
    fail("User found in Auth0 after register", `Email not found: ${testEmail}`);
    return null;
  }
  const auth0User = users[0];
  pass(`User exists in Auth0  (id: ${auth0User.user_id})`);

  // Verify role was assigned in Auth0
  const rolesRes = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(auth0User.user_id)}/roles`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const assignedRoles = await rolesRes.json();
  const assignedNames = Array.isArray(assignedRoles)
    ? assignedRoles.map((ro) => ro.name.toLowerCase())
    : [];

  if (assignedNames.includes("buyer"))
    pass(`Auth0 role "buyer" assigned to registered user`);
  else
    fail(
      `Auth0 role "buyer" not found`,
      `Assigned roles: [${assignedNames.join(", ") || "none"}]  — ensure M2M app has assign_roles scope`,
    );

  return { auth0UserId: auth0User.user_id, email: testEmail };
}

// ── Part 3: Database check ────────────────────────────────────────────────────

function part3_db(email) {
  console.log("\n📋  Part 3: SQLite database check\n");

  let db;
  try {
    db = openDb();
  } catch (e) {
    fail("Open SQLite DB", e.message);
    return;
  }

  const user = db
    .prepare(`SELECT id, auth0Id, email, role FROM "User" WHERE email = ?`)
    .get(email);

  db.close();

  if (!user) {
    info(
      "User not in DB yet — this is expected. DB row is created on first Auth0 login " +
        "callback (ensureDbUser), not on /api/auth/register. " +
        "Complete login in the browser to create the row, then re-run.",
    );
    return;
  }

  pass(`User found in DB  (id: ${user.id})`);
  if (user.role === "BUYER") pass("DB role is BUYER");
  else fail("DB role", `Expected BUYER, got ${user.role}`);
  if (user.auth0Id?.startsWith("auth0|"))
    pass(`auth0Id format OK  (${user.auth0Id})`);
  else fail("auth0Id format", `Got: ${user.auth0Id ?? "(null)"}`);
}

// ── Part 4: blockAuth0User ────────────────────────────────────────────────────

async function part4_block(token) {
  console.log("\n📋  Part 4: blockAuth0User\n");

  // Create a throw-away user directly in Auth0
  const testEmail = `test-block-${Date.now()}@test.invalid`;
  const createRes = await fetch(`https://${domain}/api/v2/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: "TestBlk_2026!",
      connection: "Username-Password-Authentication",
      email_verified: false,
      name: "Block Test User",
    }),
  });

  if (!createRes.ok) {
    fail(
      "Create block-test user in Auth0",
      `${createRes.status}: ${await createRes.text()} — check M2M has create:users scope`,
    );
    return null;
  }
  const created = await createRes.json();
  pass(`Block-test user created in Auth0  (${created.user_id})`);

  // Block the user (same logic as blockAuth0User() in auth0-management.ts)
  const blockRes = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(created.user_id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blocked: true }),
    },
  );
  if (!blockRes.ok) {
    fail(
      "PATCH blocked:true",
      `${blockRes.status}: ${await blockRes.text()} — check M2M has update:users scope`,
    );
    return created.user_id;
  }
  pass("blockAuth0User PATCH returned 200");

  // Verify the flag persisted
  const getRes = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(created.user_id)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const fetched = await getRes.json();
  if (fetched.blocked === true) pass("User confirmed blocked: true in Auth0");
  else
    fail(
      "User blocked state",
      `Expected true, got ${fetched.blocked ?? "(missing)"}`,
    );

  return created.user_id;
}

// ── Part 5: Resource Server (API) config ─────────────────────────────────────

async function part5_resourceServer(token) {
  console.log("\n📋  Part 5: Resource Server (DeedScan API) config\n");

  const audience = process.env.AUTH0_AUDIENCE;
  if (!audience) {
    fail(
      "AUTH0_AUDIENCE not set in .env",
      "Add AUTH0_AUDIENCE=http://localhost:3000",
    );
    return;
  }
  pass(`AUTH0_AUDIENCE is set  (${audience})`);

  // Find the resource server by identifier — fetch all and match explicitly
  const r = await fetch(
    `https://${domain}/api/v2/resource-servers?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    fail(
      "Fetch Resource Server",
      `${r.status} — check M2M has read:resource_servers scope`,
    );
    return;
  }
  const payload = await r.json();
  const allServers = Array.isArray(payload)
    ? payload
    : (payload?.resource_servers ?? []);
  const rs = allServers.find((s) => s.identifier === audience);
  if (!rs) {
    fail(
      `Resource Server "${audience}" not found`,
      "Create it in Dashboard → APIs",
    );
    return;
  }
  pass(`Resource Server found  (id: ${rs.id})`);

  if (rs.enforce_policies === true) pass("RBAC enabled on Resource Server");
  else
    fail(
      "RBAC not enabled",
      "Dashboard → APIs → DeedScan API → Settings → Enable RBAC",
    );

  if (
    rs.token_dialect === "access_token_authz" ||
    rs.token_dialect === "rfc9068_profile_authz"
  )
    pass("Permissions claim added to access token");
  else
    fail(
      "Permissions claim not in access token",
      "Dashboard → APIs → DeedScan API → Settings → Add Permissions in Access Token",
    );

  const scopes = Array.isArray(rs.scopes) ? rs.scopes.map((s) => s.value) : [];
  if (scopes.includes("admin:review"))
    pass(`Permission "admin:review" defined on API`);
  else
    fail(
      `Permission "admin:review" missing`,
      "Dashboard → APIs → DeedScan API → Permissions → add admin:review",
    );

  // Check admin role has admin:review assigned
  const rolesRes = await fetch(`https://${domain}/api/v2/roles?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const roles = await rolesRes.json();
  const adminRole = Array.isArray(roles)
    ? roles.find((ro) => ro.name.toLowerCase() === "admin")
    : null;

  if (!adminRole) {
    fail("admin role not found (needed for permission check)");
    return;
  }

  const permRes = await fetch(
    `https://${domain}/api/v2/roles/${adminRole.id}/permissions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const perms = await permRes.json();
  const permValues = Array.isArray(perms)
    ? perms.map((p) => p.permission_name)
    : [];
  if (permValues.includes("admin:review"))
    pass(`"admin:review" permission assigned to admin role`);
  else
    fail(
      `"admin:review" not assigned to admin role`,
      "Dashboard → User Management → Roles → admin → Permissions → assign admin:review",
    );
}

// ── Part 6: Post-Login Action deployed and bound to Login flow ────────────────

async function part6_loginAction(token) {
  console.log("\n📋  Part 6: Post-Login Action in Login flow\n");

  // Check action exists and is deployed
  const actionsRes = await fetch(
    `https://${domain}/api/v2/actions/actions?triggerId=post-login&per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!actionsRes.ok) {
    fail(
      "Fetch post-login actions",
      `${actionsRes.status}: ${await actionsRes.text()}`,
    );
    return;
  }
  const actionsPayload = await actionsRes.json();
  const actions = Array.isArray(actionsPayload)
    ? actionsPayload
    : (actionsPayload.actions ?? []);

  const injectAction = actions.find((a) =>
    a.name.toLowerCase().includes("inject roles"),
  );
  if (!injectAction) {
    fail(
      '"Inject Roles into Tokens" action not found',
      "Check Auth0 Dashboard → Actions → Library",
    );
    return;
  }
  pass(`Action found: "${injectAction.name}"  (id: ${injectAction.id})`);

  if (injectAction.all_changes_deployed) pass("Action is deployed");
  else
    fail(
      "Action has undeployed changes",
      "Dashboard → Actions → Library → Inject Roles into Tokens → Deploy",
    );

  // Check it is bound to the Login flow
  const bindingsRes = await fetch(
    `https://${domain}/api/v2/actions/triggers/post-login/bindings`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!bindingsRes.ok) {
    fail(
      "Fetch Login flow bindings",
      `${bindingsRes.status}: ${await bindingsRes.text()}`,
    );
    return;
  }
  const bindingsPayload = await bindingsRes.json();
  const bindings = Array.isArray(bindingsPayload)
    ? bindingsPayload
    : (bindingsPayload.bindings ?? []);

  const bound = bindings.find((b) => b.action?.id === injectAction.id);
  if (bound) pass("Action is bound to the Login flow");
  else
    fail(
      "Action not in Login flow",
      "Dashboard → Actions → Flows → Login → drag 'Inject Roles into Tokens' into the flow → Apply",
    );
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup(token, userIds) {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  console.log("\n🧹  Cleanup: removing test users from Auth0\n");
  for (const uid of ids) {
    const r = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(uid)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (r.status === 204 || r.status === 200) pass(`Deleted ${uid}`);
    else fail(`Delete ${uid}`, `HTTP ${r.status}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   Auth0 Phase 1 — Sanity Test         ║");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`  Domain  : ${domain ?? "(not set)"}`);
  console.log(`  Base URL: ${BASE_URL}\n`);

  if (!domain || !clientId || !clientSecret) {
    console.error(
      "❌  Missing env vars. Need: AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET in .env",
    );
    process.exit(1);
  }

  let token;
  try {
    token = await getManagementToken();
  } catch (e) {
    console.error(`\n❌  Cannot get M2M token: ${e.message}`);
    console.error(
      "    Check AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET, and that the M2M app has the Management API authorized.\n",
    );
    process.exit(1);
  }

  const toCleanup = [];

  await part1_m2mAndRoles(token);

  try {
    const result = await part2_register(token);
    if (result?.auth0UserId) toCleanup.push(result.auth0UserId);
    if (result?.email) part3_db(result.email);
  } catch (e) {
    fail("Part 2/3 threw an unexpected error", e.message);
  }

  try {
    const blockId = await part4_block(token);
    if (blockId) toCleanup.push(blockId);
  } catch (e) {
    fail("Part 4 threw an unexpected error", e.message);
  }

  try {
    await part5_resourceServer(token);
  } catch (e) {
    fail("Part 5 threw an unexpected error", e.message);
  }

  try {
    await part6_loginAction(token);
  } catch (e) {
    fail("Part 6 threw an unexpected error", e.message);
  }

  await cleanup(token, toCleanup);

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed,  ${failed} failed`);
  console.log("═══════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\nFatal error:", e);
  process.exit(1);
});
