import { useState } from "react";
import Dropzone from "./Dropzone.jsx";
import ConfidenceBars from "./ConfidenceBars.jsx";
import { predict, submitCorrection } from "../api.js";

export default function Predictor({ classes, onSaved }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null); // { sample_id, predicted_class, confidence, top_k }
  const [status, setStatus] = useState("idle"); // idle | thinking | done | error
  const [chosen, setChosen] = useState("");
  const [saveMsg, setSaveMsg] = useState(null); // { text, error }
  const [saving, setSaving] = useState(false);

  async function handleFile(file) {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setResult(null);
    setStatus("thinking");
    setSaveMsg(null);
    setChosen("");

    try {
      const data = await predict(file);
      setResult(data);
      setChosen(data.predicted_class);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setSaveMsg({ text: e.message, error: true });
    }
  }

  async function save(label, confirmed) {
    if (!result) return;
    setSaving(true);
    try {
      await submitCorrection({ sampleId: result.sample_id, trueClass: label, confirmed });
      setSaveMsg({
        text: confirmed
          ? `Saved — confirmed as ${label}. Thank you for verifying.`
          : `Saved — labeled as ${label}. This will improve the next training round.`,
        error: false,
      });
      onSaved?.();
    } catch (e) {
      setSaveMsg({ text: e.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  function onConfirm() {
    if (!result) return;
    save(result.predicted_class, true);
  }

  function onCorrect() {
    if (!result) return;
    if (!chosen) {
      setSaveMsg({ text: "Pick the correct species from the dropdown first.", error: true });
      return;
    }
    save(chosen, chosen === result.predicted_class);
  }

  const predClass =
    status === "thinking" ? "thinking…" : status === "error" ? "error" : result?.predicted_class ?? "—";
  const predConf = result ? `${(result.confidence * 100).toFixed(1)}%` : "—";

  return (
    <section className="card">
      <h2 className="h2">Try it — upload a microscope image</h2>
      <p className="muted">
        Drop a 224×224 (or any size — we'll resize) PNG/JPG of a pollen grain. The model
        will guess the species and tell you how confident it is.
      </p>

      <Dropzone onFile={handleFile} />

      {status !== "idle" && (
        <div className="result">
          <div className="result-grid">
            <div className="result-image">
              {previewUrl && <img src={previewUrl} alt="uploaded pollen" />}
              <div className="result-meta">
                sample <span>{result ? `#${result.sample_id}` : "—"}</span>
              </div>
            </div>

            <div className="result-info">
              <div className="result-eyebrow">THE ANSWER</div>
              <div className="result-class">{predClass}</div>
              <div className="result-conf">
                <span className="result-conf-label">confidence</span>
                <span className="result-conf-val">{predConf}</span>
              </div>

              {result && <ConfidenceBars topK={result.top_k} />}

              <hr className="rule" />

              <div className="correction">
                <div className="correction-eyebrow">DOES THIS LOOK RIGHT?</div>
                <p className="muted small">
                  If the prediction is wrong, pick the correct species. Your label is stored
                  and will be used to retrain the model.
                </p>
                <div className="correction-row">
                  <select
                    id="trueClass"
                    value={chosen}
                    onChange={(e) => setChosen(e.target.value)}
                  >
                    <option value="">— choose true species —</option>
                    {classes.map((c) => (
                      <option value={c} key={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button className="btn" onClick={onConfirm} disabled={saving || !result}>
                    Confirm prediction
                  </button>
                  <button className="btn btn-orange" onClick={onCorrect} disabled={saving || !result}>
                    Save correction
                  </button>
                </div>
                {saveMsg && (
                  <div className={`save-msg${saveMsg.error ? " error" : ""}`}>{saveMsg.text}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
