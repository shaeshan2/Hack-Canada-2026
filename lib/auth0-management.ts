const managementAudienceFromDomain = process.env.AUTH0_DOMAIN
  ? `https://${process.env.AUTH0_DOMAIN}/api/v2/`
  : undefined;

async function getManagementToken() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_M2M_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const audience =
    process.env.AUTH0_M2M_AUDIENCE ?? managementAudienceFromDomain;

  if (!domain || !clientId || !clientSecret || !audience) {
    return null;
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to get Auth0 management token: ${details}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

export async function assignAuth0RoleToUser(
  auth0UserId: string,
  roleName: string,
) {
  const token = await getManagementToken();
  const domain = process.env.AUTH0_DOMAIN;
  if (!token || !domain) {
    return {
      applied: false,
      reason: "Auth0 Management API credentials are not configured",
    };
  }

  const rolesResponse = await fetch(
    `https://${domain}/api/v2/roles?name_filter=${encodeURIComponent(roleName)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!rolesResponse.ok) {
    const details = await rolesResponse.text();
    throw new Error(`Failed to find Auth0 role '${roleName}': ${details}`);
  }

  const roles = (await rolesResponse.json()) as Array<{
    id: string;
    name: string;
  }>;
  const match = roles.find(
    (role) => role.name.toLowerCase() === roleName.toLowerCase(),
  );
  if (!match) {
    return {
      applied: false,
      reason: `Auth0 role '${roleName}' does not exist`,
    };
  }

  const assignResponse = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}/roles`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles: [match.id] }),
    },
  );

  if (!assignResponse.ok) {
    const details = await assignResponse.text();
    throw new Error(`Failed to assign Auth0 role '${roleName}': ${details}`);
  }

  return { applied: true as const };
}

export async function blockAuth0User(auth0UserId: string) {
  const token = await getManagementToken();
  const domain = process.env.AUTH0_DOMAIN;
  if (!token || !domain) {
    return {
      applied: false,
      reason: "Auth0 Management API credentials are not configured",
    };
  }

  const response = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blocked: true }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to block Auth0 user '${auth0UserId}': ${details}`);
  }

  return { applied: true as const };
}
