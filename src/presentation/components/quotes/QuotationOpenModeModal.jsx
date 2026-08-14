import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MdEdit, MdVisibility } from "react-icons/md";

const VIEWPORT_PAD = 10;
const CURSOR_OFFSET = 12;

function clampPosition(anchor, size) {
  if (!anchor) return { top: 0, left: 0 };

  let left = anchor.x + CURSOR_OFFSET;
  let top = anchor.y + CURSOR_OFFSET;

  if (left + size.width > window.innerWidth - VIEWPORT_PAD) {
    left = anchor.x - size.width - CURSOR_OFFSET;
  }
  if (top + size.height > window.innerHeight - VIEWPORT_PAD) {
    top = anchor.y - size.height - CURSOR_OFFSET;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - size.width - VIEWPORT_PAD));
  top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - size.height - VIEWPORT_PAD));

  return { top, left };
}

export default function QuotationOpenModeModal({
  open,
  anchor,
  quoteLabel,
  canEdit,
  busy,
  onClose,
  onEdit,
  onView,
}) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchor || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    setPosition(clampPosition(anchor, { width: rect.width, height: rect.height }));
  }, [open, anchor, canEdit, quoteLabel]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    const onScroll = () => {
      if (!busy) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close open mode menu"
        className="fixed inset-0 z-[59] cursor-default bg-transparent"
        onClick={() => !busy && onClose()}
      />

      <div
        ref={popoverRef}
        role="menu"
        aria-label="Open quotation"
        className="fixed z-[60] min-w-[11rem] max-w-[14rem] border border-gov-border bg-white shadow-lg shadow-brand-navy/10"
        style={{ top: position.top, left: position.left }}
        onClick={(event) => event.stopPropagation()}
      >
        {quoteLabel && (
          <div className="px-3 py-2 border-b border-gov-border bg-gray-50">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Open</p>
            <p className="text-[11px] font-bold text-gov-blue truncate">{quoteLabel}</p>
          </div>
        )}

        <div className="py-1">
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={onEdit}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-gov-blue hover:bg-gov-blue-light/30 transition-colors disabled:opacity-50"
            >
              <MdEdit className="w-4 h-4 shrink-0" />
              Edit mode
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={onView}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-gov-blue hover:bg-gov-blue-light/30 transition-colors disabled:opacity-50"
          >
            <MdVisibility className="w-4 h-4 shrink-0" />
            View mode
          </button>
        </div>
      </div>
    </>
  );
}
