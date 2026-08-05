import React from "react";
import { MdClose } from "react-icons/md";

/**
 * Full-height right-side form drawer — same shell as Layout/Composition Inspection.
 */
export default function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  footer,
  children,
  maxWidth = "max-w-xl",
  disableClose = false,
  zIndex = "z-[100]",
}) {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex justify-end animate-fade-in`}>
      <div
        className="absolute inset-0 bg-brand-navy/50"
        onClick={() => !disableClose && onClose?.()}
        aria-hidden
      />
      <div
        className={`relative w-full ${maxWidth} bg-white shadow-2xl h-full flex flex-col animate-slide-left border-l border-gov-border`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-drawer-title"
      >
        <div className="px-3 py-2 border-b border-gov-border bg-gray-50 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {icon && (
                <div className="w-8 h-8 bg-gov-blue text-white flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 id="form-drawer-title" className="text-sm font-bold text-gov-blue leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => !disableClose && onClose?.()}
              disabled={disableClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gov-blue hover:bg-white border border-transparent hover:border-gov-border shrink-0 disabled:opacity-40"
              aria-label="Close"
            >
              <MdClose className="w-5 h-5" />
            </button>
          </div>
          {headerExtra && <div className="mt-2">{headerExtra}</div>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">{children}</div>

        {footer && (
          <div className="px-3 py-2 border-t border-gov-border bg-gray-50 flex justify-end gap-2 shrink-0 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
