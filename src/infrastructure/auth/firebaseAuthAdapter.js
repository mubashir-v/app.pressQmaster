/**
 * Firebase Auth adapter (web SDK will be wired later).
 *
 * Presentation should not import Firebase directly; call use-cases instead.
 */

function notConfigured(feature) {
  return new Error(`Firebase auth is not configured yet (${feature}).`);
}

export async function signInWithGoogle() {
  throw notConfigured("Google sign-in");
}

export async function signInWithEmailPassword(_email, _password) {
  throw notConfigured("Email/password sign-in");
}

export async function signUpWithEmailPassword(_email, _password, _displayName) {
  throw notConfigured("Email/password sign-up");
}
