import { useState } from "react";

// Shared "Your CV" box, used by CV review AND Job fit.
// The parent keeps the CV in state as: { mode: "upload" | "paste", file, text }
export const EMPTY_CV = { mode: "upload", file: null, text: "" };

const MAX_FILE_MB = 4;
const ALLOWED = [".pdf", ".docx", ".txt", ".md"];

// Returns an error message, or "" if the CV is ready to send
export function checkCV(cv) {
  if (cv.mode === "upload" && !cv.file) return "Choose a CV file first.";
  if (cv.mode === "paste" && !cv.text.trim()) return "Paste your CV text first.";
  return "";
}

// Puts the CV into a FormData: the file OR the pasted text (the backend reads either)
export function addCVToForm(form, cv) {
  if (cv.mode === "upload") form.append("file", cv.file);
  else form.append("cv_text", cv.text);
}

export default function CVInput({ value, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  // Change one part of the CV state, keep the rest
  function update(changes) {
    onChange({ ...value, ...changes });
  }

  // Check a file before we accept it (used by click AND drag & drop)
  function acceptFile(chosen) {
    setFileError("");
    if (!chosen) return;
    if (!ALLOWED.some((ext) => chosen.name.toLowerCase().endsWith(ext))) {
      return setFileError("Use a PDF, Word (.docx) or text file.");
    }
    if (chosen.size > MAX_FILE_MB * 1024 * 1024) {
      return setFileError(`This file is over ${MAX_FILE_MB} MB. Upload a smaller file or paste the text.`);
    }
    update({ file: chosen });
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="field">
      <div className="field-row">
        <span className="label">Your CV</span>
        <div className="switch" role="group" aria-label="How to add your CV">
          <button className={value.mode === "upload" ? "on" : ""} onClick={() => update({ mode: "upload" })}>Upload</button>
          <button className={value.mode === "paste" ? "on" : ""} onClick={() => update({ mode: "paste" })}>Paste text</button>
        </div>
      </div>

      {value.mode === "upload" ? (
        <label
          className={`drop ${dragging ? "dragging" : ""} ${value.file ? "has-file" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" accept={ALLOWED.join(",")} onChange={(e) => acceptFile(e.target.files[0])} />
          {value.file ? (
            <>
              <strong>{value.file.name}</strong>
              <span>{(value.file.size / 1024).toFixed(0)} KB. Click to choose another file.</span>
            </>
          ) : (
            <>
              <strong>Drop your CV here or click to choose</strong>
              <span>PDF, Word or text, up to {MAX_FILE_MB} MB</span>
            </>
          )}
        </label>
      ) : (
        <textarea
          rows={10}
          aria-label="CV text"
          value={value.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Paste the full text of your CV"
        />
      )}

      {fileError && <p className="error">{fileError}</p>}
    </div>
  );
}
