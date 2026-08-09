import React from "react";
import { useNavigate } from "react-router-dom";
import { MdEdit, MdVisibility } from "react-icons/md";

export default function QuotationModeToggle({ quotationId, mode = "edit", canEdit = true, className = "" }) {
  const navigate = useNavigate();
  if (!quotationId) return null;

  const base =
    "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border transition-colors";
  const active = "bg-gov-blue text-white border-gov-blue";
  const idle = "bg-white text-gray-600 border-gov-border hover:bg-gray-50";

  return (
    <div className={`inline-flex border border-gov-border ${className}`} role="group" aria-label="Quotation mode">
      {canEdit && (
        <button
          type="button"
          disabled={mode === "edit"}
          onClick={() => navigate(`/dashboard/quotes/${quotationId}`)}
          className={`${base} border-r-0 ${mode === "edit" ? active : idle} disabled:cursor-default`}
          title="Edit quotation"
        >
          <MdEdit className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
      <button
        type="button"
        disabled={mode === "view"}
        onClick={() => navigate(`/dashboard/quotes/${quotationId}/view`)}
        className={`${base} ${mode === "view" ? active : idle} disabled:cursor-default`}
        title="View quotation"
      >
        <MdVisibility className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">View</span>
      </button>
    </div>
  );
}
