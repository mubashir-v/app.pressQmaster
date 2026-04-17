import { FaGooglePlusG } from "react-icons/fa6";
export function TextField({ label, type = "text", placeholder, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-navy/80">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-brand-navy placeholder:text-brand-navy/40 outline-none focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/10 transition-shadow"
      />
    </label>
  );
}

export function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-xl bg-brand-teal px-4 py-2.5 font-semibold text-white shadow-[0_4px_14px_0_rgba(42,142,158,0.39)] hover:bg-brand-teal-dark hover:shadow-[0_6px_20px_rgba(42,142,158,0.23)] active:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200"
    >
      {children}
    </button>
  );
}

export function GoogleButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 font-semibold text-brand-navy hover:bg-brand-mint/50 active:bg-brand-mint/80 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
    >
      <FaGooglePlusG className="w-6 h-6 text-brand-teal" />
      {children}
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-brand-navy/10" />
      <span className="text-xs font-medium text-brand-navy/50">or</span>
      <div className="h-px flex-1 bg-brand-navy/10" />
    </div>
  );
}
