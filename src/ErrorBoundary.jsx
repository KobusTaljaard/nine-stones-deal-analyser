import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Deal Analyser crashed:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#f8f4ec", color: "#002147", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            maxWidth: 420, background: "#fff", border: "1px solid #e6ded2",
            borderTop: "3px solid #d93a3a", borderRadius: 14, padding: 26,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#d93a3a", marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13.5, color: "#6b7a89", lineHeight: 1.6, marginBottom: 18 }}>
              The app hit an unexpected error. Your saved deals are safe — reloading usually fixes this.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#002147", color: "#fff", border: "none", borderRadius: 9,
                padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
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
