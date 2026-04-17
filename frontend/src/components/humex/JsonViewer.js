import React, { useState, useCallback } from "react";

function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text).catch(() => fallback(text));
  }
  return fallback(text);
}
function fallback(text) {
  return new Promise((resolve) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch { /* noop */ }
    document.body.removeChild(ta);
    resolve();
  });
}

export default function JsonViewer({ value, copyable = true, label, testId }) {
  const [done, setDone] = useState(false);

  const isString = typeof value === "string";
  const rendered = isString ? value : JSON.stringify(value ?? {}, null, 2);

  const onCopy = useCallback(() => {
    copyText(rendered).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    });
  }, [rendered]);

  return (
    <div className="k-code-wrap" data-testid={testId}>
      {copyable && (
        <button
          type="button"
          className={`k-copy-btn ${done ? "done" : ""}`}
          onClick={onCopy}
          data-testid={testId ? `${testId}-copy` : "json-copy-btn"}
        >
          {done ? "✓ Copied!" : `Copy ${label || ""}`.trim()}
        </button>
      )}
      <pre className="k-code">{rendered}</pre>
    </div>
  );
}
