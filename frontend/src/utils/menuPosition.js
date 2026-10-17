// Where to put a pop-up menu next to its button so it is always fully inside the window.
// button: { top, bottom, left, right } (from getBoundingClientRect)   menu: { width, height }   viewport: { width, height }
// The menu opens below the button, or above it when there is not enough room below and more room above.
// It is right-aligned with the button, then pulled back inside the window if it would stick out.

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const computeMenuPosition = (button, menu, viewport, { gap = 4, margin = 8 } = {}) => {
  const spaceBelow = viewport.height - button.bottom - margin;
  const spaceAbove = button.top - margin;
  const opensUp = menu.height + gap > spaceBelow && spaceAbove > spaceBelow;

  const wantedTop = opensUp ? button.top - gap - menu.height : button.bottom + gap;
  const top = clamp(wantedTop, margin, Math.max(margin, viewport.height - menu.height - margin));
  const left = clamp(button.right - menu.width, margin, Math.max(margin, viewport.width - menu.width - margin));

  return { top, left, opensUp };
};
