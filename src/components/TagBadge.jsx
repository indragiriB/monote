export default function TagBadge({ tag, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 border border-hair px-2 py-0.5 text-[11px] uppercase tracking-wide">
      #{tag}
      {onRemove && (
        <button
          onClick={() => onRemove(tag)}
          className="ml-1 text-ink-500 hover:text-ink-0 dark:hover:text-ink-1000"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
