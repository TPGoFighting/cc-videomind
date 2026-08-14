import type { ReactElement } from "react";

export function ShareImage(): ReactElement {
  return (
    <div
      style={{
        alignItems: "stretch",
        background: "#080b0f",
        color: "#f5f8fb",
        display: "flex",
        height: "100%",
        padding: "64px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at 78% 28%, rgba(109, 184, 255, 0.22), transparent 42%)",
          display: "flex",
          inset: 0,
          position: "absolute",
        }}
      />

      <div
        style={{
          border: "1px solid rgba(166, 190, 214, 0.24)",
          borderRadius: "30px",
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "50px 54px",
            width: "60%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", fontSize: 25, fontWeight: 700 }}>
            <span
              style={{
                background: "#8fc6ff",
                borderRadius: "50%",
                display: "flex",
                height: 14,
                marginRight: 14,
                width: 14,
              }}
            />
            Teach Player
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#8fc6ff", fontSize: 23, letterSpacing: "0.08em" }}>
              YOUTUBE / LEARNING
            </span>
            <span style={{ fontSize: 60, fontWeight: 750, letterSpacing: "-0.045em", lineHeight: 1.08 }}>
              Turn one video into
            </span>
            <span style={{ fontSize: 60, fontWeight: 750, letterSpacing: "-0.045em", lineHeight: 1.08 }}>
              knowledge you can keep.
            </span>
          </div>

          <span style={{ color: "#a6bed6", fontSize: 24 }}>
            Bilingual transcripts / traceable insights / review
          </span>
        </div>

        <div
          style={{
            background: "rgba(16, 24, 33, 0.9)",
            borderLeft: "1px solid rgba(166, 190, 214, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            justifyContent: "center",
            padding: "44px",
            width: "40%",
          }}
        >
          {["04:31  Focus on systems, not only goals.", "04:37  The system is what stays with you.", "04:44  Make the next action obvious."].map(
            (line, index) => (
              <div
                key={line}
                style={{
                  background: index === 1 ? "rgba(143, 198, 255, 0.13)" : "rgba(255, 255, 255, 0.035)",
                  border: index === 1 ? "1px solid rgba(143, 198, 255, 0.45)" : "1px solid rgba(255, 255, 255, 0.07)",
                  borderRadius: 16,
                  color: index === 1 ? "#f5f8fb" : "#a6bed6",
                  display: "flex",
                  fontSize: 19,
                  lineHeight: 1.4,
                  padding: "20px 22px",
                }}
              >
                {line}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
