import { signInWithGoogle } from "../../../infrastructure/auth/firebaseAuthAdapter.js";

export async function signUpWithGoogle() {
  // Firebase typically uses the same OAuth popup for sign-in/up; we’ll refine naming when SDK is wired.
  return await signInWithGoogle();
}
