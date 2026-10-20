// A small character counter under a text box, e.g. "1,240 / 20,000".
// min (optional): shows how many characters are still needed, e.g. for a job ad.
export default function CharCount({ value, max, min }) {
  const length = value.trim().length;
  const tooShort = min && length > 0 && length < min;

  if (length === 0) return null; // nothing typed yet: show nothing

  return (
    <p className={tooShort ? "char-count short" : "char-count"}>
      {tooShort
        ? `Add ${min - length} more characters`
        : `${length.toLocaleString()}${max ? ` / ${max.toLocaleString()}` : ""} characters`}
    </p>
  );
}
