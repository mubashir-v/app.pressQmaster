/** @typedef {"OWNER" | "MANAGER" | "STAFF"} MembershipRole */

/** @type {ReadonlyArray<MembershipRole>} */
export const MEMBERSHIP_ROLES = Object.freeze(["OWNER", "MANAGER", "STAFF"]);

/**
 * @param {unknown} role
 * @returns {role is MembershipRole}
 */
export function isMembershipRole(role) {
  return typeof role === "string" && MEMBERSHIP_ROLES.includes(/** @type {any} */ (role));
}
