import React, { useState } from "react";
import Navigation from "./Navigation";
import Mood1Analysis from "./Mood1Analysis";
import Mood2Analysis from "./Mood2Analysis";
import "./MoodSensing.css";

function MoodSensing() {
  const [activeTab, setActiveTab] = useState("mood1");

  const tabs = [
    { id: "mood1", name: "가칭1" },
    { id: "mood2", name: "가칭2" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "mood1":
        return <Mood1Analysis />;
      case "mood2":
        return <Mood2Analysis />;
      default:
        return null;
    }
  };

  return (
    <div className="mood-sensing">
      <Navigation />
      <div className="mood-sensing-container">
        <div className="sidebar">
          <h3>무드 센싱</h3>
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

export default MoodSensing;
