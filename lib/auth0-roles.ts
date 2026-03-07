type SessionLikeUser = Record<string, unknown> & {
  roles?: unknown;
  app_metadata?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function getAuth0Roles(user: SessionLikeUser | undefined | null): string[] {
  if (!user) return [];

  const appMetadataRoles =
    user.app_metadata && typeof user.app_metadata === "object"
      ? asStringArray((user.app_metadata as Record<string, unknown>).roles)
      : [];

  const namespacedCandidates = [
    user["https://deedscan.us.auth0.com/roles"],
    user["https://deedscan.us/roles"],
    user["https://deedscan.com/roles"],
    user.roles,
    appMetadataRoles
  ];

  const merged = namespacedCandidates.flatMap((candidate) => asStringArray(candidate));
  return [...new Set(merged.map((role) => role.toLowerCase()))];
}

export function hasAuth0AdminRole(user: SessionLikeUser | undefined | null): boolean {
  return getAuth0Roles(user).includes("admin");
}
