// Shows first, last and the pages either side of the current one.
const pagesAround = (current, total) =>
  [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

export const Pagination = ({ page, totalPages, total, limit, onChange }) => {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = pagesAround(page, totalPages);

  return (
    <div className="pager">
      <span className="pager-info">
        <b>{from}</b>–<b>{to}</b> of <b>{total}</b> students
      </span>

      <div className="pager-nav">
        <button className="pg" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        {pages.map((p, i) => (
          <span key={p} style={{ display: 'contents' }}>
            {i > 0 && p - pages[i - 1] > 1 && <span className="pg-gap">…</span>}
            <button
              className={`pg ${p === page ? 'is-current' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </span>
        ))}
        <button className="pg" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};
