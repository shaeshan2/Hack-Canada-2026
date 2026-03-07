type SessionLikeUser = Record<string, unknown> & {
  roles?: unknown;
  app_metadata?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function getAuth0Roles(
  user: SessionLikeUser | undefined | null,
): string[] {
  if (!user) return [];

  const appMetadataRoles =
    user.app_metadata && typeof user.app_metadata === "object"
      ? asStringArray((user.app_metadata as Record<string, unknown>).roles)
      : [];

  const auth0Domain = process.env.AUTH0_DOMAIN ?? "";
  const namespacedCandidates = [
    user[`https://${auth0Domain}/roles`],
    user.roles,
    appMetadataRoles,
  ];

  const merged = namespacedCandidates.flatMap((candidate) =>
    asStringArray(candidate),
  );
  return [...new Set(merged.map((role) => role.toLowerCase()))];
}

export function hasAuth0AdminRole(
  user: SessionLikeUser | undefined | null,
): boolean {
  return getAuth0Roles(user).includes("admin");
}
