export function normalizeCognitoGroupName(group: string): string {
  return group
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .toUpperCase();
}

export function readCognitoGroupsFromPayload(
  payload: Record<string, unknown>,
): string[] {
  const rawGroups = payload["cognito:groups"];

  if (!rawGroups) {
    return [];
  }

  if (Array.isArray(rawGroups)) {
    return rawGroups.filter(
      (group): group is string => typeof group === "string" && group.trim() !== "",
    );
  }

  if (typeof rawGroups === "string" && rawGroups.trim()) {
    return [rawGroups];
  }

  return [];
}

export function getNormalizedCognitoGroups(
  payload: Record<string, unknown>,
): string[] {
  const groups = readCognitoGroupsFromPayload(payload);

  return Array.from(
    new Set(groups.map((group) => normalizeCognitoGroupName(group))),
  );
}
