export default function SourceBadge({ filename, page, score }) {
  // Only show relevance when it's meaningful (score < 0.9 = at least ~10% relevant).
  // Scores >= 0.9 would display 0–10% which is misleading — better to omit.
  const relevancePct = (score > 0 && score < 0.9)
    ? Math.round((1 - score) * 100)
    : null;

  return (
    <div className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs max-w-xs">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <div className="min-w-0">
        <p className="text-gray-700 font-medium truncate leading-tight">{filename}</p>
        <div className="flex items-center gap-1.5 text-gray-400 mt-0.5">
          <span>p.{page}</span>
          {relevancePct !== null && (
            <>
              <span className="text-gray-300">·</span>
              <span className={
                relevancePct >= 60 ? "text-emerald-600" :
                relevancePct >= 30 ? "text-amber-600" : "text-gray-400"
              }>
                {relevancePct}% match
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
