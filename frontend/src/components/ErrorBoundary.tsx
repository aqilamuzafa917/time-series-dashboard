import React from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();
  console.error("Route error:", error);

  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  return (
    <div className="loader-container" style={{ minHeight: "100vh", padding: "2rem" }}>
      <div className="card" style={{ maxWidth: "600px", width: "100%", borderTop: "4px solid hsl(var(--color-critical))" }}>
        <h2 className="page-title" style={{ color: "hsl(var(--color-critical))", marginBottom: "1rem" }}>
          <i className="ri-error-warning-line" style={{ marginRight: "0.5rem" }}></i>
          Application Error
        </h2>
        <p className="page-subtitle" style={{ marginBottom: "1.5rem" }}>
          We encountered an unexpected error while loading this page.
        </p>
        
        <div className="error-alert" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", fontSize: "0.85rem" }}>
          {errorMessage}
        </div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = "/"}
          >
            <i className="ri-home-line"></i> Go to Dashboard
          </button>
          <button 
            className="btn btn-ghost"
            onClick={() => window.location.reload()}
          >
            <i className="ri-refresh-line"></i> Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
