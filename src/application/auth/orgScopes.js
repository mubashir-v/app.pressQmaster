/** Shared org-scope checks for the frontend (mirrors api OrgScope helpers). */

export function hasAnyOrgScope(scopes, tokens) {
  if (scopes?.includes("all_scope")) return true;
  return tokens.some((token) => scopes?.includes(token));
}

export function getActiveOrgMembership(user) {
  if (!user?.activeOrganizationId || !user?.organizations) return null;
  return (
    user.organizations.find(
      (org) => (org.organizationId || org.id) === user.activeOrganizationId,
    ) ?? null
  );
}

export function getActiveOrgRole(user) {
  return getActiveOrgMembership(user)?.role ?? null;
}

function isOrgLeadershipRole(role) {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
}

/** OWNER/ADMIN may change member roles, scopes, and suspension (matches API). */
export function canManageOrganizationMembers(user) {
  const role = getActiveOrgRole(user);
  return role === "OWNER" || role === "ADMIN";
}

/** Only owners may invite new members (matches API). */
export function canInviteOrganizationMembers(user) {
  return getActiveOrgRole(user) === "OWNER";
}

/** May open the team roster in read-only mode. */
export function canViewOrganizationMembers(user) {
  const role = getActiveOrgRole(user);
  if (role === "OWNER" || role === "ADMIN") return true;
  return hasAnyOrgScope(user?.scopes, ["view_users", "edit_users", "manage_users"]);
}

export function canEditQuotes(scopes, user = null) {
  if (isOrgLeadershipRole(getActiveOrgRole(user))) return true;
  return hasAnyOrgScope(scopes, ["edit_quotes", "manage_quotes"]);
}

export function canViewQuotes(scopes, user = null) {
  if (isOrgLeadershipRole(getActiveOrgRole(user))) return true;
  return hasAnyOrgScope(scopes, ["view_quotes", "edit_quotes", "manage_quotes"]);
}

export function canEditCustomers(scopes) {
  return hasAnyOrgScope(scopes, ["edit_customers", "manage_customers"]);
}

export function canEditStocks(scopes) {
  return hasAnyOrgScope(scopes, ["edit_stocks", "manage_stocks"]);
}

export function canEditPrinters(scopes) {
  return hasAnyOrgScope(scopes, ["edit_printers", "manage_printers"]);
}

export function canEditSizeCharts(scopes) {
  return hasAnyOrgScope(scopes, ["edit_sizeChart", "manage_sizeChart", "edit_stocks", "manage_stocks"]);
}

export function canDeleteSizeCharts(scopes) {
  return hasAnyOrgScope(scopes, ["manage_sizeChart", "manage_stocks"]);
}

export function canViewJobs(scopes, user = null) {
  if (isOrgLeadershipRole(getActiveOrgRole(user))) return true;
  return (
    hasAnyOrgScope(scopes, ["view_jobs", "edit_jobs", "manage_jobs", "view_production"]) ||
    canViewQuotes(scopes, user)
  );
}

export function canEditJobs(scopes, user = null) {
  if (isOrgLeadershipRole(getActiveOrgRole(user))) return true;
  return hasAnyOrgScope(scopes, ["edit_jobs", "manage_jobs"]);
}

/**
 * Quote amounts in the jobs module.
 * Hidden only for production-only users (job edit without quote access and not leadership).
 */
export function canShowQuoteAmountsInJobsContext(scopes, user = null) {
  if (isOrgLeadershipRole(getActiveOrgRole(user))) return true;
  if (canViewQuotes(scopes, user)) return true;
  return false;
}
