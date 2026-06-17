import { useRef, useState } from "react";

export default function Dropzone({ onFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      className={`dropzone${drag ? " drag" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          if (e.target.files.length) onFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <div className="dz-inner">
        <div className="dz-circle">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
          </svg>
        </div>
        <div className="dz-text">
          <strong>Click to upload</strong> or drag &amp; drop an image
        </div>
      </div>
    </div>
  );
}
