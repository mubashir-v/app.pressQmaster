import React, { useMemo, useState } from "react";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import { Link, useNavigate } from "react-router-dom";
import { signUpWithEmailPassword } from "../../../application/use-cases/auth/signUpWithEmailPassword.js";
import { signUpWithGoogle } from "../../../application/use-cases/auth/signUpWithGoogle.js";
import AuthShellLayout from "../../layouts/AuthShellLayout.jsx";
import { Divider, GoogleButton, PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import BrandLogo from "../../components/logo/BrandLogo.jsx";

// Illustration is governed natively by AuthShellLayout

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      password.length >= 6
    );
  }, [email, password]);

  const navigate = useNavigate();
  const { user, globalError } = useAuth();

  React.useEffect(() => {
    if (user) {
      if (user.requiresOrganizationSetup) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }
    if (globalError) {
      setBusy(false);
    }
  }, [user, globalError, navigate]);

  async function onGoogle() {
    setBusy(true);
    try {
      await signUpWithGoogle();
      // Navigation is securely handled by the useEffect once user context propagates
    } catch (e) {
      alert(e instanceof Error ? e.message : "Google sign-up failed.");
      setBusy(false);
    }
  }

  async function onEmailPassword() {
    setBusy(true);
    try {
      // Create user without generic mock display name
      await signUpWithEmailPassword({ email, password, displayName: "Loading..." });
      // Navigation is securely handled by the useEffect once user context propagates
    } catch (e) {
      alert(e instanceof Error ? e.message : "Sign-up failed.");
      setBusy(false);
    }
  }

  return (
    <AuthShellLayout>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3">
          <BrandLogo className="w-10 h-10" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-gov-blue">printQ</div>
          </div>
        </Link>


        <div className="mt-8 border border-gov-border bg-white p-6 sm:p-8">
          <div className="grid gap-4">

            {globalError && (
              <div className="bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 mb-2">
                {globalError}
              </div>
            )}

            <GoogleButton disabled={busy} onClick={onGoogle}>
              Sign up with Google
            </GoogleButton>
            <Divider />

            <TextField
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <PrimaryButton disabled={busy || !canSubmit} onClick={onEmailPassword}>
              Continue
            </PrimaryButton>
          </div>

          <div className="mt-6 text-center text-sm text-gov-blue/70">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-gov-blue hover:text-gov-blue-dark hover:underline">
              Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-gov-blue/50 text-center">
          By continuing you agree to organization-based access. The first user becomes the organization owner.
        </p>
      </div>
    </AuthShellLayout>
  );
}

