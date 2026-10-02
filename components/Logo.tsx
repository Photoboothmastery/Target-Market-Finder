export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const titleSize = size === "lg" ? "1.6rem" : "1.05rem";
  const subSize = size === "lg" ? "0.85rem" : "0.65rem";
  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: titleSize,
          letterSpacing: "0.04em",
          color: "var(--ink)",
          textTransform: "uppercase",
        }}
      >
        Target Market Finder
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginTop: "0.15rem",
        }}
      >
        <span style={{ width: "1.25rem", height: "1px", background: "var(--rule)" }} />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: subSize,
            color: "var(--steel)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
          }}
        >
          by Photo Booth Mastery
        </span>
        <span style={{ width: "1.25rem", height: "1px", background: "var(--rule)" }} />
      </div>
    </div>
  );
}
