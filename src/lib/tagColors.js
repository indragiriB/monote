// A small curated palette so tags stay visually distinct without turning
// the whole (otherwise strictly B&W) UI into a rainbow. Colors are only
// ever used as a thin accent — a dot and a badge border — never a fill
// behind text.
export const TAG_PALETTE = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
  '#78716C', // stone (neutral fallback)
]

/** Deterministically assign the next unused-looking color for a new tag. */
export function nextTagColor(existingCount) {
  return TAG_PALETTE[existingCount % TAG_PALETTE.length]
}
