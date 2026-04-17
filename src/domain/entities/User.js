/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 */

/**
 * @param {{id: string, email: string, displayName: string}} input
 * @returns {User}
 */
export function createUser({ id, email, displayName }) {
  return { id, email, displayName };
}
