import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../application/hooks/useAuth.jsx";

const MAIN_ITEMS = [
  { label: "Customers", href: "/dashboard/customers", requiredScopes: ["view_customers", "edit_customers", "manage_customers"] },
  { label: "Quotation", href: "/dashboard/quotes", requiredScopes: ["view_quotes", "edit_quotes", "manage_quotes"] },
  { label: "Users", href: "/dashboard/users", requiredScopes: ["view_users", "edit_users", "manage_users"] },
];

const INVENTORY_ITEMS = [
  { label: "Printer & Plates", href: "/dashboard/printers", requiredScopes: ["view_printers", "edit_printers", "manage_printers"] },
  { label: "Paper & Stock", href: "/dashboard/papers", requiredScopes: ["view_stocks", "edit_stocks", "manage_stocks"] },
  { label: "Size Charts", href: "/dashboard/size-charts", requiredScopes: ["view_sizeChart", "edit_sizeChart", "manage_sizeChart"] },
];

function filterByScope(items, user) {
  return items.filter((item) => {
    if (!item.requiredScopes) return true;
    if (user?.scopes?.includes("all_scope")) return true;
    return item.requiredScopes.some((scope) => user?.scopes?.includes(scope));
  });
}

export default function TopNavBar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const mainItems = filterByScope(MAIN_ITEMS, user);
  const inventoryItems = filterByScope(INVENTORY_ITEMS, user);
  const allItems = [...mainItems, ...inventoryItems];

  const linkClass = ({ isActive }) =>
    [
      "px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2",
      isActive
        ? "text-white border-white bg-white/10"
        : "text-white/80 border-transparent hover:text-white hover:bg-white/5",
    ].join(" ");

  return (
    <nav className="flex items-stretch bg-gov-blue text-white no-print">
      <div className="flex items-stretch overflow-x-auto flex-1">
        <NavLink to="/dashboard" end className={linkClass}>
          Dashboard
        </NavLink>
        {allItems.map((item) => (
          <NavLink key={item.href} to={item.href} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center px-4 border-l border-white/20 shrink-0">
        <button
          onClick={() => navigate("/dashboard/quotes/new")}
          className="px-3 py-1 text-xs font-semibold bg-white text-gov-blue hover:bg-gray-100 transition-colors"
        >
          + New Quote
        </button>
      </div>
    </nav>
  );
}
