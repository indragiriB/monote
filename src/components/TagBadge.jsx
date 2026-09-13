export default function TagBadge({ tag, color = '#999999', onRemove, active = false }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2.5 py-1 md:px-2 md:py-0.5 text-xs md:text-[11px] uppercase tracking-wide"
      style={{
        borderColor: color,
        backgroundColor: active ? color : 'transparent',
        color: active ? '#ffffff' : 'inherit',
      }}
    >
      <span
        className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: active ? '#ffffff' : color }}
      />
      {tag}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(tag)
          }}
          className="ml-0.5 opacity-70 hover:opacity-100 text-sm md:text-xs leading-none"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
