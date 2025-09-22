import React, { useState } from "react";
import Navigation from "./Navigation";
import ColorAnalysis from "./ColorAnalysis";
import PatternAnalysis from "./PatternAnalysis";
import DetailAnalysis from "./DetailAnalysis";
import "./ItemSensing.css";

function ItemSensing() {
  const [activeTab, setActiveTab] = useState("color");

  const tabs = [
    { id: "color", name: "Color" },
    { id: "pattern", name: "Pattern" },
    { id: "detail", name: "Detail" },
    { id: "type", name: "Type" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "color":
        return <ColorAnalysis />;
      case "pattern":
        return <PatternAnalysis />;
      case "detail":
        return <DetailAnalysis />;
      case "type":
        return (
          <div className="tab-content">
            <h2>Type Analysis</h2>
            <p>타입 트렌드 분석 기능이 여기에 구현됩니다.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="item-sensing">
      <Navigation />
      <div className="item-sensing-container">
        <div className="sidebar">
          <h3>아이템 센싱</h3>
          <div className="tab-list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
        <div className="main-content">{renderTabContent()}</div>
      </div>
    </div>
  );
}

export default ItemSensing;
