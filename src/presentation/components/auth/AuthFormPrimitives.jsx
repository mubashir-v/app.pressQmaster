import { FaGooglePlusG } from "react-icons/fa6";
import { MdKeyboardArrowDown, MdSearch, MdCheck, MdInfo } from "react-icons/md";
import React, { useState, useRef, useEffect } from "react";

const InfoTooltip = ({ content }) => {
  return (
    <div className="group/itooltip relative flex items-center ml-1.5">
      <MdInfo className="w-3.5 h-3.5 text-gray-500 cursor-help hover:text-gov-blue transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gov-blue text-[10px] font-semibold text-white leading-relaxed opacity-0 group-hover/itooltip:opacity-100 pointer-events-none transition-all z-[110] border border-gov-border">
        {content}
      </div>
    </div>
  );
};

export const TextField = React.forwardRef(({ label, type = "text", placeholder, value, onChange, onKeyDown, error, info, disabled, required }, ref) => {
  return (
    <label className="block">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <span className={`text-sm font-medium text-gray-700 ${required ? "gov-required" : ""}`}>{label}</span>
          {info && <InfoTooltip content={info} />}
        </div>
        {error && <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider animate-shake">{error}</span>}
      </div>
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={`gov-input ${error ? "border-red-400" : ""} ${disabled ? "bg-gov-disabled" : ""}`}
      />
    </label>
  );
});

export function SelectField({ label, options, value, onChange, disabled, children, info, required }) {
  return (
    <label className="block">
      <div className="flex items-center mb-1">
        <span className={`text-sm font-medium text-gray-700 ${required ? "gov-required" : ""}`}>{label}</span>
        {info && <InfoTooltip content={info} />}
      </div>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`gov-input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat ${disabled ? "bg-gov-disabled" : ""}`}
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

export const SearchableSelect = React.forwardRef(({ label, options, value, onChange, disabled, placeholder = "Search...", onSearch, onKeyDown, info, required }, ref) => {
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
      const timer = setTimeout(() => onSearch(query), 300);
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
      {label && (
        <div className="flex items-center mb-1">
          <span className={`text-sm font-medium text-gray-700 ${required ? "gov-required" : ""}`}>{label}</span>
          {info && <InfoTooltip content={info} />}
        </div>
      )}
      <div
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`relative w-full border transition-colors cursor-pointer bg-white outline-none ${isOpen ? "border-gov-blue" : "border-gov-border hover:border-gray-400 focus:border-gov-blue"} ${disabled ? "bg-gov-disabled cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between px-3 py-2 min-h-[38px]">
          <span className={`text-sm overflow-hidden text-ellipsis whitespace-nowrap ${!selectedOption ? "text-gray-400" : "text-gray-800"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <MdKeyboardArrowDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-0 w-full bg-white border border-gov-border shadow-md flex flex-col max-h-64">
          <div className="p-2 border-b border-gov-border bg-gray-50 flex items-center gap-2">
            <MdSearch className="w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Type to filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-gray-800 w-full placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredOptions.length > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ target: { value: filteredOptions[0].value } });
                  setIsOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-gray-400">No matches found</div>
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
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer text-sm ${value === opt.value ? "bg-blue-50 text-gov-blue font-semibold" : "hover:bg-gray-50 text-gray-800"}`}
                >
                  <span>{opt.label}</span>
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

export function PrimaryButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`gov-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
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
      className="gov-btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FaGooglePlusG className="w-5 h-5 text-gov-blue" />
      {children}
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-gov-border" />
      <span className="text-xs font-medium text-gray-400">or</span>
      <div className="h-px flex-1 bg-gov-border" />
    </div>
  );
}
