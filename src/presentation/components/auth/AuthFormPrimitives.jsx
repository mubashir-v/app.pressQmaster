import { FaGooglePlusG } from "react-icons/fa6";
import { MdKeyboardArrowDown, MdSearch, MdCheck } from "react-icons/md";
import React, { useState, useRef, useEffect } from "react";

export const TextField = React.forwardRef(({ label, type = "text", placeholder, value, onChange, onKeyDown, error }, ref) => {
  return (
    <label className="block">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-brand-navy/80">{label}</span>
        {error && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-shake">{error}</span>}
      </div>
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-brand-navy placeholder:text-brand-navy/40 outline-none transition-all ${error ? 'border-red-300 ring-4 ring-red-500/10' : 'border-brand-navy/15 focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/10 shadow-sm'}`}
      />
    </label>
  );
});

export function SelectField({ label, options, value, onChange, disabled, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-navy/80">{label}</span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="mt-2 w-full rounded-xl border border-brand-navy/15 bg-white px-4 py-2.5 text-brand-navy outline-none focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/10 transition-shadow appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
      >
        {options ? options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )) : children}
      </select>
    </label>
  );
}


export const SearchableSelect = React.forwardRef(({ label, options, value, onChange, disabled, placeholder = "Search...", onSearch, onKeyDown }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const localRef = useRef(null);
  const compositeRef = ref || localRef;

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = onSearch ? options : options.filter(opt => 
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (compositeRef.current && !compositeRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [compositeRef]);

  useEffect(() => {
    if (onSearch) {
      const timer = setTimeout(() => {
        onSearch(query);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query, onSearch]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full" ref={compositeRef}>
      {label && <span className="text-sm font-medium text-brand-navy/80">{label}</span>}
      <div 
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`mt-2 relative w-full rounded-xl border transition-all cursor-pointer bg-white group outline-none ${isOpen ? 'border-brand-teal/40 ring-4 ring-brand-teal/10' : 'border-brand-navy/15 hover:border-brand-navy/30 focus:border-brand-teal/40 focus:ring-4 focus:ring-brand-teal/10'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between px-4 py-2.5 min-h-[46px]">
          <span className={`text-brand-navy overflow-hidden text-ellipsis whitespace-nowrap ${!selectedOption ? 'text-brand-navy/40' : 'font-medium'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <MdKeyboardArrowDown className={`w-5 h-5 text-brand-navy/40 transition-transform ${isOpen ? 'rotate-180 text-brand-teal' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-brand-navy/10 overflow-hidden animate-slide-up flex flex-col max-h-64">
          <div className="p-3 border-b border-brand-navy/5 bg-zinc-50/50 flex items-center gap-2">
            <MdSearch className="w-5 h-5 text-brand-navy/20" />
            <input 
              autoFocus
              type="text" 
              placeholder="Type to filter..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium text-brand-navy w-full placeholder:text-brand-navy/20"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredOptions.length > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  const firstOpt = filteredOptions[0];
                  onChange({ target: { value: firstOpt.value } });
                  setIsOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>
          <div className="overflow-y-auto no-scrollbar py-2">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs font-bold text-brand-navy/40 uppercase tracking-widest">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${value === opt.value ? 'bg-brand-teal/5 text-brand-teal' : 'hover:bg-zinc-50 text-brand-navy'}`}
                >
                  <span className={`text-sm ${value === opt.value ? 'font-semibold' : 'font-medium'}`}>
                    {opt.label}
                  </span>
                  {value === opt.value && <MdCheck className="w-4 h-4" />}
                </div>
              ))
            )}
          </div>
        </div>

      )}
    </div>
  );
});



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
