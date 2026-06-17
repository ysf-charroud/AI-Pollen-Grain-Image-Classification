// Same-origin in production (served by FastAPI); proxied to :8000 in dev.
const API = "";

export async function getClasses() {
  const res = await fetch(`${API}/api/classes`);
  if (!res.ok) throw new Error("Could not load classes.");
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API}/api/stats`);
  if (!res.ok) throw new Error("Could not load stats.");
  return res.json();
}

export async function predict(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/api/predict`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Prediction failed.");
  }
  return res.json();
}

export async function submitCorrection({ sampleId, trueClass, confirmed }) {
  const res = await fetch(`${API}/api/correct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sample_id: sampleId,
      true_class: trueClass,
      confirmed,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Could not save.");
  }
  return res.json();
}
