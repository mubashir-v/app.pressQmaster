import { signInWithGoogle } from "../../../infrastructure/auth/firebaseAuthAdapter.js";

export async function loginWithGoogle() {
  return await signInWithGoogle();
}
