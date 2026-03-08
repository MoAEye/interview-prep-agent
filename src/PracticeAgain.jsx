export default function PracticeAgain({ onRedoFull, onRedoWeak, onNewInterview, onHome }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "500px", width: "100%" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎯</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "0.5rem" }}>Great effort, Aria is proud!</h1>
        <p style={{ color: "#888", marginBottom: "2.5rem", fontSize: "1.1rem" }}>What would you like to do next?</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button onClick={onRedoFull} style={{ padding: "1rem 2rem", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", fontSize: "1.1rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}>
            🔁 Redo Full Interview
          </button>
          <button onClick={onRedoWeak} style={{ padding: "1rem 2rem", borderRadius: "14px", border: "2px solid #6c63ff", background: "white", color: "#6c63ff", fontSize: "1.1rem", fontWeight: "700", cursor: "pointer" }}>
            💪 Practice Weak Questions
          </button>
          <button onClick={onNewInterview} style={{ padding: "1rem 2rem", borderRadius: "14px", border: "2px solid #4ecdc4", background: "white", color: "#4ecdc4", fontSize: "1.1rem", fontWeight: "700", cursor: "pointer" }}>
            📄 Upload New Resume
          </button>
          <button onClick={onHome} style={{ padding: "0.75rem 2rem", borderRadius: "14px", border: "none", background: "transparent", color: "#888", fontSize: "1rem", cursor: "pointer" }}>
            🏠 Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
