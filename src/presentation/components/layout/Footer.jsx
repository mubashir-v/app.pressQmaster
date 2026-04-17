import { FaTwitter, FaLinkedin, FaFacebook } from "react-icons/fa6";
import BrandLogo from "../logo/BrandLogo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-brand-navy/10 bg-white py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-8 px-4 sm:px-5 md:flex-row md:items-start">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-8 h-8 rounded-[8px] shadow-sm shadow-brand-navy/10" />
          <div className="text-lg font-bold text-brand-navy">Press Master</div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy">Solutions</h4>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Offset Presses</a>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Digital Printers</a>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Packaging Brands</a>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy">Company</h4>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">About Us</a>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Careers</a>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Contact</a>
          </div>
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy">Legal</h4>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Privacy Policy</a>
            <a href="#" className="text-xs text-brand-navy/60 hover:text-brand-teal">Terms of Service</a>
          </div>
        </div>

        <div className="flex gap-4">
          <a href="#" className="text-brand-navy/60 hover:text-brand-teal"><FaTwitter size={18}/></a>
          <a href="#" className="text-brand-navy/60 hover:text-brand-teal"><FaLinkedin size={18}/></a>
          <a href="#" className="text-brand-navy/60 hover:text-brand-teal"><FaFacebook size={18}/></a>
        </div>
      </div>
      
      <div className="mx-auto mt-12 w-full max-w-6xl text-center text-xs text-brand-navy/40">
        © {new Date().getFullYear()} Press Master CRM. All rights reserved.
      </div>
    </footer>
  );
}
