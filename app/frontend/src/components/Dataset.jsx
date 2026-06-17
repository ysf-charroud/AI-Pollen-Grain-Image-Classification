export default function Dataset({ stats, error }) {
  return (
    <section className="card">
      <h2 className="h2">Retraining dataset — what we've collected</h2>
      <p className="muted">Every confirmed label below feeds the next training round.</p>
      <div className="stats-grid">
        {error ? (
          <div className="stats-empty">Could not load stats.</div>
        ) : stats === null ? (
          <div className="muted small">Loading…</div>
        ) : stats.length === 0 ? (
          <div className="stats-empty">
            No confirmed samples yet — be the first to feed the dataset.
          </div>
        ) : (
          stats.map((r) => (
            <div className="stat-pill" key={r.label}>
              <span className="lbl">{r.label}</span>
              <span className="val">{r.count}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
