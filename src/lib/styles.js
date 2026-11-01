// ── styles.js ────────────────────────────────────────────────────────────
// Shared inline style objects used by more than one component. Anything used
// by a single component stays in that component.
//
// The card *look* (surface, border, top-edge highlight, shadow) lives in the
// .om-card rule in index.css; sections add the class and supply only their
// own padding here.

// Padding presets for the card every tab section sits in.
export const cardPad = { padding: '22px 24px' }

// Variant for sections whose content bleeds to the card's edges (marquees),
// which handle their own horizontal padding per-row.
export const cardPadBleed = { padding: '22px 0 24px', overflow: 'hidden' }

// The small uppercase section heading text.
export const headingStyle = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  whiteSpace: 'nowrap',
}

// Horizontal fade mask wrapped around each marquee row.
export const marqueeMask = {
  position: 'relative',
  padding: '12px 0',
  WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
  maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
}
