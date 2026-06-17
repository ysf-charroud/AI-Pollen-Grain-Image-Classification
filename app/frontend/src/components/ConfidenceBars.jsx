export default function ConfidenceBars({ topK }) {
  return (
    <div className="bars">
      {topK.map((t, i) => {
        const pct = (t.confidence * 100).toFixed(1);
        return (
          <div className={`bar-row${i === 0 ? " top" : ""}`} key={t.label}>
            <span className="bar-label">{t.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
