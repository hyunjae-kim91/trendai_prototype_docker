import React from "react";
import { useNavigate } from "react-router-dom";
import "./MainSelection.css";

function MainSelection() {
  const navigate = useNavigate();

  const handleItemSensing = () => {
    navigate("/item-sensing");
  };

  const handleMoodSensing = () => {
    navigate("/mood-sensing");
  };

  return (
    <div className="main-selection">
      <div className="selection-container">
        <h1 className="main-title">TrendAI Prototype</h1>
        <p className="main-subtitle">AI 트렌드 분석 플랫폼</p>

        <div className="selection-options">
          <div className="selection-card item-card" onClick={handleItemSensing}>
            <h2>아이템 센싱</h2>
            <p>상품 및 아이템 트렌드 분석</p>
          </div>

          <div className="selection-card mood-card" onClick={handleMoodSensing}>
            <h2>무드 센싱</h2>
            <p>감정 및 무드 트렌드 분석</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainSelection;
