import React from "react";
  import { createBrowserRouter, Outlet, NavLink } from "react-router-dom";
  import StatusPage from "./pages/StatusPage";
  import DashboardPage from "./pages/DashboardPage";
  import ExplorerPage from "./pages/ExplorerPage";

  const Layout = () => {
    return (
      <div className="app-container">
        <aside className="sidebar">
          <div className="brand-section">
            <span className="brand-icon">📈</span>
            <h1 className="brand-title">InfluxDB Monitor</h1>
          </div>
          
          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">⚡</span>
              Status
            </NavLink>
            
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">📊</span>
              Dashboard
            </NavLink>
            
            <NavLink to="/explorer" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">🔍</span>
              Explorer
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
      ],
    },
  ]);
