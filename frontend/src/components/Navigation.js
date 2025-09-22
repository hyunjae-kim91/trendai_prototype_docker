import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navigation.css";

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => navigate("/")}>
          TrendAI
        </div>
        <div className="nav-menu">
          <button
            className={`nav-item ${isActive("/item-sensing") ? "active" : ""}`}
            onClick={() => navigate("/item-sensing")}
          >
            아이템 센싱
          </button>
          <button
            className={`nav-item ${isActive("/mood-sensing") ? "active" : ""}`}
            onClick={() => navigate("/mood-sensing")}
          >
            무드 센싱
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
