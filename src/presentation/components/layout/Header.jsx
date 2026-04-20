import { Link } from "react-router-dom";
import BrandLogo from "../logo/BrandLogo.jsx";

const NAV_LINKS = [
  { label: "Quotation Engine", href: "#quotation" },
  { label: "Job Tracking", href: "#tracking" },
  { label: "Billing", href: "#billing" },
  { label: "Features", href: "#features" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-navy/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
        <a href="/" className="flex items-center gap-3">
          <BrandLogo className="w-8 h-8 rounded-lg shadow-sm" />
          <div className="leading-tight">
            <div className="text-lg font-bold text-brand-navy tracking-tight">printQ</div>
          </div>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-brand-dark hover:text-brand-teal transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/15 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-mint/50 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-dark active:bg-brand-teal transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
