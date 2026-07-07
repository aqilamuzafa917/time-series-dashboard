import React, { useState, useEffect } from "react";
import { createBrowserRouter, Outlet, NavLink } from "react-router-dom";
import StatusPage from "./pages/StatusPage";
import DashboardPage from "./pages/DashboardPage";
import ExplorerPage from "./pages/ExplorerPage";
import IngestionPage from "./pages/IngestionPage";
import SourcesPage from "./pages/SourcesPage";
import ThresholdsPage from "./pages/ThresholdsPage";
import IngestPage from "./pages/IngestPage";
import DetailPage from "./pages/DetailPage";
import ErrorBoundary from "./components/ErrorBoundary";

const Layout = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUTC = (date: Date) => {
    const formatDate = date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
    const format24 = date.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false });
    const format12 = date.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: true });
    return { formatDate, format24, format12 };
  };

  const { formatDate, format24, format12 } = formatUTC(time);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand-section">
          <span className="brand-icon"><i className="ri-line-chart-line"></i></span>
          <h1 className="brand-title">Time Series Dashboard</h1>
        </div>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-flashlight-line"></i></span>
            Status
          </NavLink>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-dashboard-line"></i></span>
            Dashboard
          </NavLink>

          <NavLink to="/explorer" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-search-eye-line"></i></span>
            Explorer
          </NavLink>

          <NavLink to="/ingestion" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-database-2-line"></i></span>
            Ingestion
          </NavLink>

          <NavLink to="/sources" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-server-line"></i></span>
            Sources
          </NavLink>

          <NavLink to="/thresholds" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-alert-line"></i></span>
            Thresholds
          </NavLink>


          <NavLink to="/ingest" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-file-upload-line"></i></span>
            Manual Ingest
          </NavLink>
        </nav>
        
        <div style={{
          marginTop: "auto",
          padding: "1.5rem",
          color: "hsl(var(--text-muted))",
          fontSize: "0.75rem",
          opacity: 0.6
        }}>
          <div style={{ marginBottom: "0.4rem", fontWeight: 600 }}>{formatDate}</div>
          <div>UTC: {format24}</div>
          <div style={{ marginTop: "0.2rem", fontSize: "0.65rem" }}>{format12}</div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "", element: <StatusPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "explorer", element: <ExplorerPage /> },
      { path: "ingestion", element: <IngestionPage /> },
      { path: "sources", element: <SourcesPage /> },
      { path: "thresholds", element: <ThresholdsPage /> },
      { path: "ingest", element: <IngestPage /> },
      { path: "detail/:source_id/:metric", element: <DetailPage /> },
    ],
  },
]);
