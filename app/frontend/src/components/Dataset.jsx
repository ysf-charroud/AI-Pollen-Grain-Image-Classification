export default function Dataset({ stats, error }) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="kicker">02 / Dataset</span>
        <h2 className="card-title">Retraining dataset</h2>
        <p className="card-sub">Every confirmed label below feeds the next training round.</p>
      </div>
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
