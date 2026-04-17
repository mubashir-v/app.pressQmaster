import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";
import AuthShellLayout from "../../layouts/AuthShellLayout.jsx";
import { Divider, GoogleButton, PrimaryButton, TextField } from "../../components/auth/AuthFormPrimitives.jsx";
import BrandLogo from "../../components/logo/BrandLogo.jsx";

// Illustration is governed natively by AuthShellLayout

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
     e.preventDefault();
     login("admin"); // Mock logging in as admin
     navigate("/dashboard");
  };

  return (
    <AuthShellLayout>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3">
          <BrandLogo className="w-10 h-10 shadow-[0_4px_14px_0_rgba(24,61,57,0.39)] rounded-[12px]" />
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight text-brand-navy">Press Master</div>
          </div>
        </Link>

        <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-3xl">Welcome back</h1>

        <div className="mt-8 rounded-[2rem] border border-brand-navy/5 bg-white p-6 sm:p-8 shadow-xl shadow-brand-navy/5">
          <div className="grid gap-4">
            <GoogleButton>Continue with Google</GoogleButton>
          </div>

          <Divider />

          <form className="mt-6 grid gap-4">
            <div className="grid gap-4">
              <TextField
                label="Email"
                type="email"
                placeholder="you@company.com"
              />
              <TextField
                label="Password"
                type="password"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 text-sm">
              <label className="inline-flex items-center gap-2 text-brand-navy/70 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-brand-navy/20 text-brand-teal focus:ring-brand-teal/20" />
                Remember me
              </label>
              <button type="button" className="font-semibold text-brand-teal hover:text-brand-teal-dark hover:underline">
                Forgot password?
              </button>
            </div>

            <PrimaryButton onClick={handleLogin}>
              Log In
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-sm text-brand-navy/60">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-brand-teal hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthShellLayout>
  );
}
