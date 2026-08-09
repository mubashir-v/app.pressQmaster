import { Link, useLocation } from "react-router-dom";

const ROUTE_LABELS = {
  dashboard: "Dashboard",
  customers: "Customers",
  quotes: "Quotations",
  new: "New Quote",
  users: "Users",
  printers: "Printer & Plates",
  papers: "Paper & Stock",
  "size-charts": "Size Charts",
  "organization-settings": "Organization Settings",
  organizations: "Organizations",
  jobs: "Jobs",
  quotation: "Create job",
  support: "Support",
};

function buildCrumbs(pathname) {
  const segments = pathname.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];

  let accumulated = "/dashboard";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accumulated += `/${seg}`;

    // MongoDB ObjectId → contextual label
    if (/^[a-f0-9]{24}$/.test(seg)) {
      const prev = segments[i - 1];
      let label = "Detail";
      if (prev === "quotation") label = "Quotation detail";
      else if (prev === "quotes") label = "Edit Quote";
      else if (prev === "jobs") label = "Job detail";
      crumbs.push({ label, href: accumulated });
      continue;
    }

    crumbs.push({
      label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      href: accumulated,
    });
  }

  return crumbs;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="gov-breadcrumb border-b border-gov-border bg-white px-4 py-1">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="gov-breadcrumb-sep">&gt;</span>}
            {isLast ? (
              <span className="font-semibold text-gray-800">{crumb.label}</span>
            ) : (
              <Link to={crumb.href}>{crumb.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
