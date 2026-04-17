/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt ISO string
 */

/**
 * @param {{id: string, name: string, createdAt?: string}} input
 * @returns {Organization}
 */
export function createOrganization({ id, name, createdAt = new Date().toISOString() }) {
  return { id, name, createdAt };
}
