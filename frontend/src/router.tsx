import React from "react";
import { createBrowserRouter, Outlet, NavLink } from "react-router-dom";
import StatusPage from "./pages/StatusPage";
import DashboardPage from "./pages/DashboardPage";
import ExplorerPage from "./pages/ExplorerPage";
import IngestionPage from "./pages/IngestionPage";
import SourcesPage from "./pages/SourcesPage";
import ThresholdsPage from "./pages/ThresholdsPage";
import HistoryPage from "./pages/HistoryPage";
import IngestPage from "./pages/IngestPage";
import DetailPage from "./pages/DetailPage";
import ReportPage from "./pages/ReportPage";

const Layout = () => {
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

          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-history-line"></i></span>
            History
          </NavLink>

          <NavLink to="/ingest" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-file-upload-line"></i></span>
            Ingest
          </NavLink>

          <NavLink to="/report" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon"><i className="ri-file-chart-line"></i></span>
            Report
          </NavLink>
        </nav>
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
    children: [
      { path: "", element: <StatusPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "explorer", element: <ExplorerPage /> },
      { path: "ingestion", element: <IngestionPage /> },
      { path: "sources", element: <SourcesPage /> },
      { path: "thresholds", element: <ThresholdsPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "ingest", element: <IngestPage /> },
      { path: "detail/:source_id/:metric", element: <DetailPage /> },
      { path: "report", element: <ReportPage /> },
    ],
  },
]);
