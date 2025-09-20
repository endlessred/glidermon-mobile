import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; info?: any }> {
  state = { hasError: false, info: null };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { this.setState({ info }); console.error("ErrorBoundary", error, info); }
  render() {
    if (this.state.hasError) return <div style={{ padding: 16, color: "#fff", background: "#b91c1c" }}>Something went wrong.</div>;
    return this.props.children as any;
  }
}