import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config.js";

/**
 * Firebase Auth adapter wiring into Clean Architecture.
 */

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Firebase Google Auth Error:", error);
    throw error;
  }
}

export async function signInWithEmailPassword(_email, _password) {
  throw new Error("Email/password sign-in not configured in sprint yet.");
}

export async function signUpWithEmailPassword(_email, _password, _displayName) {
  throw new Error("Email/password sign-up not configured in sprint yet.");
}
