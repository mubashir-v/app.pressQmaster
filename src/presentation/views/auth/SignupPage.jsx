import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signUpWithEmailPassword } from "../../../application/use-cases/auth/signUpWithEmailPassword.js";
import { signUpWithGoogle } from "../../../application/use-cases/auth/signUpWithGoogle.js";
import AuthShellLayout from "../../layouts/AuthShellLayout.jsx";
import { Divider, GoogleButton, PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import BrandLogo from "../../components/logo/BrandLogo.jsx";

// Illustration is governed natively by AuthShellLayout

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 1 &&
      orgName.trim().length > 1 &&
      email.trim().length > 3 &&
      password.length >= 6
    );
  }, [email, fullName, orgName, password]);

  async function onGoogle() {
    setBusy(true);
    try {
      await signUpWithGoogle();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Google sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onEmailPassword() {
    setBusy(true);
    try {
      const displayName = `${fullName.trim()} (${orgName.trim()})`;
      await signUpWithEmailPassword({ email, password, displayName });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShellLayout>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3">
          <BrandLogo className="w-10 h-10 shadow-[0_4px_14px_0_rgba(24,61,57,0.39)] rounded-[12px]" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-brand-navy">Press Master</div>
          </div>
        </Link>


        <div className="mt-8 rounded-[2rem] border border-brand-navy/5 bg-white p-6 sm:p-8 shadow-xl shadow-brand-navy/5">
          <div className="grid gap-4">
            <GoogleButton disabled={busy} onClick={onGoogle}>
              Sign up with Google
            </GoogleButton>
            <Divider />

            <TextField label="Full name" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextField
              label="Organization name"
              placeholder="Your printing press name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
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
              Create account
            </PrimaryButton>
          </div>

          <div className="mt-6 text-center text-sm text-brand-navy/70">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand-teal hover:text-brand-teal-dark hover:underline">
              Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-brand-navy/50 text-center">
          By signing up you agree to organization-based access. The first user becomes the organization owner.
        </p>
      </div>
    </AuthShellLayout>
  );
}

