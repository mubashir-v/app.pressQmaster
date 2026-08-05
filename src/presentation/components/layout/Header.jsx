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
    <header className="sticky top-0 z-10 border-b border-gov-border bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-5">
        <a href="/" className="flex items-center gap-3">
          <BrandLogo className="w-8 h-8" />
          <div className="leading-tight">
            <div className="text-lg font-bold text-gov-blue tracking-tight">printQ</div>
          </div>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-700 hover:text-gov-blue transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 border border-gov-border bg-white px-4 py-2 text-sm font-semibold text-gov-blue hover:bg-gray-50 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 bg-gov-blue px-5 py-2 text-sm font-semibold text-white hover:bg-gov-blue-dark transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
