import React, { useState } from "react";
import { colorData } from "../data/colorData";
import "./ColorAnalysis.css";

function ColorAnalysis() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    followers: 0,
  });

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const formatFollowers = (value) => {
    if (value === 0) return "전체";
    if (value < 1000) return `${value}`;
    if (value < 1000000) return `${(value / 1000).toFixed(0)}K`;
    return `${(value / 1000000).toFixed(1)}M`;
  };
  const renderTable = (data, title, type) => (
    <div className="color-table-container">
      <h3 className={`table-title ${type}`}>{title}</h3>
      <div className="table-wrapper">
        <table className="color-table">
          <thead>
            <tr>
              <th>No</th>
              <th>키워드</th>
              <th>비중</th>
              <th>전월대비</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.no}>
                <td className="no-cell">{item.no}</td>
                <td className="keyword-cell">{item.keyword}</td>
                <td className="weight-cell">{item.weight}%</td>
                <td className={`change-cell ${type}`}>{item.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="color-analysis">
      <div className="analysis-header">
        <h2>Color Analysis</h2>
        <p>색상 트렌드 분석 결과</p>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label className="filter-label">시작 날짜</label>
          <input
            type="date"
            className="filter-date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">종료 날짜</label>
          <input
            type="date"
            className="filter-date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
          />
        </div>

        <div className="filter-group slider-group">
          <label className="filter-label">팔로워수</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="1000000"
              step="1000"
              value={filters.followers}
              onChange={(e) =>
                handleFilterChange("followers", parseInt(e.target.value))
              }
              className="filter-slider"
            />
            <div className="slider-labels">
              <span>0</span>
              <span>1K</span>
              <span>10K</span>
              <span>100K</span>
              <span>1M</span>
            </div>
          </div>
        </div>

        <div className="filter-info">
          <span className="filter-text">
            {filters.startDate && filters.endDate
              ? `${formatDate(filters.startDate)} ~ ${formatDate(
                  filters.endDate
                )}`
              : "날짜를 선택해주세요"}{" "}
            • {formatFollowers(filters.followers)} 팔로워
          </span>
        </div>
      </div>

      <div className="tables-container">
        {renderTable(colorData.rising, "상승", "rising")}
        {renderTable(colorData.stable, "유지", "stable")}
        {renderTable(colorData.falling, "하락", "falling")}
      </div>
    </div>
  );
}

export default ColorAnalysis;
