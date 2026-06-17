const API = ""; // same-origin (served by FastAPI)

const dropzone   = document.getElementById("dropzone");
const fileInput  = document.getElementById("file");
const resultBox  = document.getElementById("result");
const resultImg  = document.getElementById("resultImg");
const sampleIdEl = document.getElementById("sampleId");
const predClass  = document.getElementById("predClass");
const predConf   = document.getElementById("predConf");
const barsEl     = document.getElementById("bars");
const trueClass  = document.getElementById("trueClass");
const confirmBtn = document.getElementById("confirmBtn");
const correctBtn = document.getElementById("correctBtn");
const saveMsg    = document.getElementById("saveMsg");
const statsEl    = document.getElementById("stats");

let currentSampleId = null;
let currentTopPrediction = null;

// ── Init: load classes + stats ──────────────────────────────────────────────
async function loadClasses() {
  const res = await fetch(`${API}/api/classes`);
  const classes = await res.json();
  trueClass.innerHTML =
    `<option value="">— choose true species —</option>` +
    classes.map(c => `<option value="${c}">${c}</option>`).join("");
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const rows = await res.json();
    if (!rows.length) {
      statsEl.innerHTML = `<div class="stats-empty">No confirmed samples yet — be the first to feed the dataset.</div>`;
      return;
    }
    statsEl.innerHTML = rows
      .map(r => `<div class="stat-pill"><span class="lbl">${r.label}</span><span class="val">${r.count}</span></div>`)
      .join("");
  } catch (e) {
    statsEl.innerHTML = `<div class="stats-empty">Could not load stats.</div>`;
  }
}

loadClasses();
loadStats();

// ── Dropzone wiring ─────────────────────────────────────────────────────────
dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

// ── Predict ─────────────────────────────────────────────────────────────────
async function handleFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  // Show local preview immediately
  resultImg.src = URL.createObjectURL(file);
  resultBox.hidden = false;
  predClass.textContent = "thinking…";
  predConf.textContent = "—";
  barsEl.innerHTML = "";
  hideSaveMsg();

  try {
    const res = await fetch(`${API}/api/predict`, { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Prediction failed.");
    }
    const data = await res.json();

    currentSampleId = data.sample_id;
    currentTopPrediction = data.predicted_class;
    sampleIdEl.textContent = `#${data.sample_id}`;
    predClass.textContent = data.predicted_class;
    predConf.textContent = `${(data.confidence * 100).toFixed(1)}%`;
    renderBars(data.top_k);

    trueClass.value = data.predicted_class;
  } catch (e) {
    predClass.textContent = "error";
    predConf.textContent = "—";
    showSaveMsg(e.message, true);
  }
}

function renderBars(topK) {
  barsEl.innerHTML = topK
    .map((t, i) => {
      const pct = (t.confidence * 100).toFixed(1);
      return `
        <div class="bar-row ${i === 0 ? "top" : ""}">
          <span class="bar-label">${t.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="bar-pct">${pct}%</span>
        </div>`;
    })
    .join("");
}

// ── Confirm / correct ───────────────────────────────────────────────────────
confirmBtn.addEventListener("click", () => {
  if (!currentSampleId || !currentTopPrediction) return;
  submitCorrection(currentTopPrediction, true);
});

correctBtn.addEventListener("click", () => {
  if (!currentSampleId) return;
  const chosen = trueClass.value;
  if (!chosen) {
    showSaveMsg("Pick the correct species from the dropdown first.", true);
    return;
  }
  submitCorrection(chosen, chosen === currentTopPrediction);
});

async function submitCorrection(label, isConfirm) {
  confirmBtn.disabled = true;
  correctBtn.disabled = true;
  try {
    const res = await fetch(`${API}/api/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sample_id: currentSampleId,
        true_class: label,
        confirmed: isConfirm,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Could not save.");
    }
    showSaveMsg(
      isConfirm
        ? `Saved — confirmed as ${label}. Thank you for verifying.`
        : `Saved — labeled as ${label}. This will improve the next training round.`,
      false
    );
    loadStats();
  } catch (e) {
    showSaveMsg(e.message, true);
  } finally {
    confirmBtn.disabled = false;
    correctBtn.disabled = false;
  }
}

function showSaveMsg(text, isError) {
  saveMsg.textContent = text;
  saveMsg.className = "save-msg" + (isError ? " error" : "");
  saveMsg.hidden = false;
}

function hideSaveMsg() {
  saveMsg.hidden = true;
}
