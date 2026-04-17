import { signUpWithEmailPassword as firebaseSignUpWithEmailPassword } from "../../../infrastructure/auth/firebaseAuthAdapter.js";

export async function signUpWithEmailPassword({ email, password, displayName }) {
  return await firebaseSignUpWithEmailPassword(email, password, displayName);
}
