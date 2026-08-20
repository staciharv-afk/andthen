import { Component } from "react";

// React only supports catching render errors via a class component — no
// hook equivalent exists. Without this, an uncaught error anywhere in the
// tree unmounts the whole app, leaving a blank white page with no way for
// someone to tell what happened (this is exactly what a bug in the Admin
// page's GA4 report parsing did before this existed). Catches once, at the
// root, so any page's bug degrades to this instead of a blank screen.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#FDFAF5", textAlign: "center" }}>
          <div>
            <h1 style={{ fontFamily: "Lora, serif", color: "#2D2118", marginBottom: 12 }}>Something went wrong.</h1>
            <p style={{ color: "#7A5C42", marginBottom: 24 }}>Please try reloading the page.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#B85C2C", color: "#fff", border: "none", borderRadius: 4, padding: "12px 24px", fontSize: 15, cursor: "pointer" }}
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
