import { signInWithEmailPassword } from "../../../infrastructure/auth/firebaseAuthAdapter.js";

export async function loginWithEmailPassword({ email, password }) {
  return await signInWithEmailPassword(email, password);
}
