import { Component } from "react";

const C = { bg: "#090D18", card: "#0F1623", border: "#1A2640", text: "#E2E8F0", sub: "#64748B", red: "#EF4444", blue: "#2563EB" };

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Deal Analyser crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div style={{ maxWidth: 420, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.red, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 16 }}>
              The app hit an unexpected error. Your saved deals are safe — reloading usually fixes this.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
