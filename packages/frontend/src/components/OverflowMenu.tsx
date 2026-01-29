/**
 * OverflowMenu - three-dot menu for secondary actions.
 * Toggle dropdown, close on outside click and Escape, keyboard accessible.
 *
 * @see ADR-019: QR Mobile Navigation
 * @see .agents/artifacts/designer/designs/qr-mobile-navigation-design.md
 */

import type React from 'react';
import { useRef, useState, useEffect } from 'react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface OverflowMenuProps {
  items: MenuItem[];
}

export function OverflowMenu({ items }: OverflowMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleClickOutside = (e: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleItemClick = (item: MenuItem): void => {
    item.onClick();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
      >
        ⋮
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 py-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(item)}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
