import React, { useState, useEffect } from "react";
import { clothingCategories } from "../data/clothingCategories";
import "./TypeAnalysis.css";

function TypeAnalysis() {
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    followers: 0,
    mainCategory: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    year: "",
    month: "",
    followers: 0,
    mainCategory: "",
  });

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredMonths, setFilteredMonths] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [itemTypes, setItemTypes] = useState([]);
  const [error, setError] = useState("");

  // 데이터 로딩
  useEffect(() => {
    fetchTypeData();
  }, []);

  const fetchTypeData = async () => {
    setLoading(true);
    try {
      // 연도/월 데이터를 가져오기 위해 메타데이터 API 호출
      const response = await fetch("http://localhost:8001/api/item-type-meta");
      const result = await response.json();

      if (result.success) {
        setAvailableYears(result.years);
        setAvailableMonths(result.months);
        setFilteredMonths(result.months);

        // rawData 설정 (연도별 월 필터링을 위해)
        setRawData(result.data);

        // 기본값을 "전체"로 설정
        setFilters((prev) => ({
          ...prev,
          year: "",
          month: "",
        }));
      }
    } catch (error) {
      console.error("타입 데이터 로딩 오류:", error);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [filterType]: value,
      };

      // 연도가 변경되면 해당 연도의 월만 표시
      if (filterType === "year") {
        if (value) {
          const selectedYearMonths = rawData
            .filter((item) => item.post_year === parseInt(value))
            .map((item) => item.post_month)
            .filter((month) => month != null);
          const uniqueMonths = [...new Set(selectedYearMonths)].sort(
            (a, b) => a - b
          );
          setFilteredMonths(uniqueMonths);
          newFilters.month = ""; // 월 선택 초기화
        } else {
          setFilteredMonths(availableMonths); // 전체 월 표시
          newFilters.month = "";
        }
      }

      return newFilters;
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    fetchKeywords();
  };

  const handleResetFilters = () => {
    const resetFilters = {
      year: "",
      month: "",
      followers: 0,
      mainCategory: "",
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setKeywords([]);
    setSelectedKeyword("");
    setItemTypes([]);
  };

  // 아이템 키워드 조회
  const fetchKeywords = async () => {
    if (!appliedFilters.mainCategory || appliedFilters.mainCategory === "") {
      setError("대분류를 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        category_l1: appliedFilters.mainCategory,
      });

      if (appliedFilters.year && appliedFilters.year !== "") {
        params.append("post_year", appliedFilters.year);
      }
      if (appliedFilters.month && appliedFilters.month !== "") {
        params.append("post_month", appliedFilters.month);
      }
      if (appliedFilters.followers > 0) {
        params.append("follower_count", appliedFilters.followers);
      }

      const response = await fetch(
        `http://localhost:8001/api/item-type-keywords?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setKeywords(data.data);
        setSelectedKeyword("");
        setItemTypes([]);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("아이템 키워드를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 아이템 유형 조회
  const fetchItemTypes = async (keyword) => {
    if (!keyword) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        category_l3: keyword,
        category_l1: appliedFilters.mainCategory,
      });

      if (appliedFilters.year) {
        params.append("post_year", appliedFilters.year);
      }
      if (appliedFilters.month) {
        params.append("post_month", appliedFilters.month);
      }
      if (appliedFilters.followers > 0) {
        params.append("follower_count", appliedFilters.followers);
      }

      const response = await fetch(
        `http://localhost:8001/api/item-type-items?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setItemTypes(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("아이템 유형을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordClick = (keyword) => {
    setSelectedKeyword(keyword);
    fetchItemTypes(keyword);
  };

  const formatFollowers = (value) => {
    if (value === 0) return "전체";
    if (value < 1000) return `${value}`;
    if (value < 1000000) return `${(value / 1000).toFixed(0)}K`;
    return `${(value / 1000000).toFixed(1)}M`;
  };

  const getChangeRateColor = (rate) => {
    if (rate > 0) return "#4CAF50"; // 녹색 (상승)
    if (rate < 0) return "#F44336"; // 빨간색 (하락)
    return "#9E9E9E"; // 회색 (변화없음)
  };

  const getChangeRateIcon = (rate) => {
    if (rate > 0) return "↗";
    if (rate < 0) return "↘";
    return "→";
  };

  if (loading) {
    return (
      <div className="type-analysis">
        <div className="loading">
          <h2>데이터 로딩 중...</h2>
          <p>잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="type-analysis">
      <div className="analysis-header">
        <h2>Type Analysis</h2>
        <p>아이템 타입 트렌드 분석 결과</p>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label className="filter-label">대분류</label>
          <select
            className="filter-select"
            value={filters.mainCategory}
            onChange={(e) => handleFilterChange("mainCategory", e.target.value)}
          >
            <option value="">전체</option>
            {Object.keys(clothingCategories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">연도</label>
          <select
            className="filter-select"
            value={filters.year}
            onChange={(e) => handleFilterChange("year", e.target.value)}
          >
            <option value="">전체</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">월</label>
          <select
            className="filter-select"
            value={filters.month}
            onChange={(e) => handleFilterChange("month", e.target.value)}
          >
            <option value="">전체</option>
            {filteredMonths.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
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

        <div className="filter-buttons">
          <button className="apply-button" onClick={handleApplyFilters}>
            필터 적용
          </button>
          <button className="reset-button" onClick={handleResetFilters}>
            초기화
          </button>
        </div>

        <div className="filter-info">
          <span className="filter-text">
            {appliedFilters.year && appliedFilters.month
              ? `${appliedFilters.year}년 ${appliedFilters.month}월`
              : appliedFilters.year
              ? `${appliedFilters.year}년`
              : "전체 기간"}{" "}
            • {formatFollowers(appliedFilters.followers)} 팔로워
            {appliedFilters.mainCategory && (
              <> • {appliedFilters.mainCategory}</>
            )}
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {keywords.length > 0 && (
        <div className="keywords-section">
          <h3>아이템 키워드 상위 10개</h3>
          <div className="keywords-grid">
            {keywords.map((keyword, index) => (
              <div
                key={index}
                className={`keyword-card ${
                  selectedKeyword === keyword.category_l3 ? "selected" : ""
                }`}
                onClick={() => handleKeywordClick(keyword.category_l3)}
              >
                <div className="keyword-rank">#{index + 1}</div>
                <div className="keyword-name">{keyword.category_l3}</div>
                <div className="keyword-count">빈도: {keyword.count}</div>
                <div
                  className="keyword-change"
                  style={{ color: getChangeRateColor(keyword.change_rate) }}
                >
                  {getChangeRateIcon(keyword.change_rate)}{" "}
                  {Math.abs(keyword.change_rate)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {itemTypes.length > 0 && (
        <div className="item-types-section">
          <h3>선택된 아이템: {selectedKeyword}</h3>
          <div className="item-types-grid">
            {itemTypes.map((item, index) => (
              <div key={index} className="item-type-card">
                <div className="item-type-rank">#{index + 1}</div>
                <div className="item-type-name">{item.item_type}</div>
                <div className="item-type-count">빈도: {item.count}</div>
                <div
                  className="item-type-change"
                  style={{ color: getChangeRateColor(item.change_rate) }}
                >
                  {getChangeRateIcon(item.change_rate)}{" "}
                  {Math.abs(item.change_rate)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TypeAnalysis;
