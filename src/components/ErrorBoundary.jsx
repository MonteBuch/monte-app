import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-stone-600">
          <h2 className="text-xl font-bold mb-2">Ein Fehler ist aufgetreten</h2>
          <p className="text-sm">Die App wurde wiederhergestellt.</p>
        </div>
      );
    }
    return this.props.children;
  }
}