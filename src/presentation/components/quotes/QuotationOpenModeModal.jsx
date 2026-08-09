import React from "react";
import { MdEdit, MdVisibility } from "react-icons/md";

export default function QuotationOpenModeModal({ open, quoteLabel, canEdit, busy, onClose, onEdit, onView }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md" onClick={() => !busy && onClose()} />
      <div className="w-full max-w-md bg-white border border-gov-border p-6 space-y-5 relative z-10">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-gov-blue">Open quotation</h2>
          <p className="text-xs text-gray-500">
            Choose how to open <strong className="text-gov-blue">{quoteLabel || "this quotation"}</strong>.
          </p>
        </div>

        <div className={`grid gap-3 ${canEdit ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
          {canEdit && (
            <button
              type="button"
              disabled={busy}
              onClick={onEdit}
              className="flex flex-col items-start gap-2 p-4 border border-gov-border bg-white hover:border-gov-blue hover:bg-gov-blue-light/20 text-left transition-colors disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gov-blue">
                <MdEdit className="w-5 h-5" />
                Edit mode
              </span>
              <span className="text-[11px] text-gray-500 leading-relaxed">
                Full quotation editor — change items, pricing, and customer details.
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onView}
            className="flex flex-col items-start gap-2 p-4 border border-gov-border bg-white hover:border-gov-blue hover:bg-gov-blue-light/20 text-left transition-colors disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold text-gov-blue">
              <MdVisibility className="w-5 h-5" />
              View mode
            </span>
            <span className="text-[11px] text-gray-500 leading-relaxed">
              Read-only overview — browse line items and production details.
            </span>
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="w-full py-2 text-[11px] font-semibold text-gray-500 hover:text-gov-blue uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
