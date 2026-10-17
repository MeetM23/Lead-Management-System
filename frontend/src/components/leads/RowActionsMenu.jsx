import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { computeMenuPosition } from '../../utils/menuPosition';

// The "three dots" menu of a table row. The menu is drawn on the page itself (a portal), not inside the table,
// so the table's scrolling and rounded-corner clipping can never cut it off. It is placed next to its button and kept
// inside the window; it closes on an outside click, on Escape, and when the page or window scrolls or resizes.
//   actions: [{ key, label, icon: Icon, onSelect, danger }]
const RowActionsMenu = ({ label, actions }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Measure the menu once it is on the page, then place it
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !buttonRef.current) return;
    const menu = menuRef.current.getBoundingClientRect();
    setPosition(computeMenuPosition(
      buttonRef.current.getBoundingClientRect(),
      { width: menu.width, height: menu.height },
      { width: window.innerWidth, height: window.innerHeight },
    ));
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onMouseDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(true);
    };
    const onViewportChange = () => close();

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true); // also scrolling inside the table
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, close]);

  // Keyboard users land on the first item
  useEffect(() => {
    if (position) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [position]);

  const moveFocus = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement);
    const keys = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    items[(keys[e.key] + items.length) % items.length].focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={moveFocus}
          // Hidden until measured, so it never flashes in the wrong place
          style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
          className="w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-[100]"
        >
          {actions.map(({ key, label: itemLabel, icon: Icon, onSelect, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => { close(); onSelect(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm focus:outline-none focus:bg-gray-100 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {React.createElement(Icon, { size: 15, className: danger ? '' : key === 'view' ? 'text-blue-500' : 'text-amber-500' })}
              {itemLabel}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

export default RowActionsMenu;
