export type OrganizationSceneUser = {
  roles?: readonly string[] | null;
  organizations?: readonly { id: number }[] | null;
} | null;

/** Organization membership grants managers and admins read access only. */
export function canViewOrganizationScenes(
  user: OrganizationSceneUser
): boolean {
  return Boolean(
    user?.roles?.some((role) => role === "manager" || role === "admin") &&
      user.organizations?.some((organization) => organization.id > 0)
  );
}
