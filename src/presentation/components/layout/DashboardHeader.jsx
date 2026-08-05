import { Link } from "react-router-dom";
import BrandLogo from "../logo/BrandLogo.jsx";
import UserProfileDrawer from "./UserProfileDrawer.jsx";

export default function DashboardHeader() {
  return (
    <header className="flex h-11 items-center justify-between border-b border-gov-border bg-white px-4 no-print">
      <Link to="/dashboard" className="flex items-center gap-2">
        <BrandLogo className="h-7 w-7" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-gov-blue tracking-tight">printQ</div>
        </div>
      </Link>

      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
          <span className="hover:text-gov-blue cursor-pointer">Help</span>
          <span className="text-gov-border">|</span>
          <span className="hover:text-gov-blue cursor-pointer">English</span>
        </div>

        <UserProfileDrawer variant="header" />
      </div>
    </header>
  );
}
