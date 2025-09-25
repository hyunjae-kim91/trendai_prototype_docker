import React, { useState, useEffect } from "react";
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
  const [availableCategories, setAvailableCategories] = useState([]);
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
      // 메타데이터와 대분류 목록을 동시에 가져오기
      const [metaResponse, categoriesResponse] = await Promise.all([
        fetch("http://localhost:8001/api/item-type-meta"),
        fetch("http://localhost:8001/api/item-type-categories"),
      ]);

      const metaResult = await metaResponse.json();
      const categoriesResult = await categoriesResponse.json();

      if (metaResult.success) {
        setAvailableYears(metaResult.years);
        setAvailableMonths(metaResult.months);
        setFilteredMonths(metaResult.months);
        setRawData(metaResult.data);
      }

      if (categoriesResult.success) {
        setAvailableCategories(
          categoriesResult.data.map((item) => item.category_l1)
        );
      }

      // 기본값을 "전체"로 설정
      setFilters((prev) => ({
        ...prev,
        year: "",
        month: "",
      }));
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
    // 대분류 체크를 먼저 수행
    if (!filters.mainCategory || filters.mainCategory === "") {
      setError("대분류를 선택해주세요.");
      return;
    }

    setAppliedFilters({ ...filters });
    // 현재 filters 값을 직접 사용하여 키워드 조회
    fetchKeywordsWithFilters({ ...filters });
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

  // 아이템 키워드 조회 (현재 appliedFilters 사용)
  const fetchKeywords = async () => {
    fetchKeywordsWithFilters(appliedFilters);
  };

  // 아이템 키워드 조회 (필터 값 직접 전달)
  const fetchKeywordsWithFilters = async (filterValues) => {
    try {
      setLoading(true);
      setError("");

      console.log("filterValues:", filterValues);
      console.log("mainCategory:", filterValues.mainCategory);

      const params = new URLSearchParams({
        category_l1: filterValues.mainCategory,
      });

      if (filterValues.year && filterValues.year !== "") {
        params.append("post_year", filterValues.year);
      }
      if (filterValues.month && filterValues.month !== "") {
        params.append("post_month", filterValues.month);
      }
      if (filterValues.followers > 0) {
        params.append("follower_count", filterValues.followers);
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
            {availableCategories.map((category, index) => (
              <option key={index} value={category}>
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
        <div className="results-container">
          <div className="keywords-section">
            <h3>아이템 키워드 상위 10개</h3>
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>키워드</th>
                    <th>빈도</th>
                    <th>전월대비</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((keyword, index) => (
                    <tr
                      key={index}
                      className={`keyword-row ${
                        selectedKeyword === keyword.category_l3
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleKeywordClick(keyword.category_l3)}
                    >
                      <td className="rank-cell">{index + 1}</td>
                      <td className="keyword-cell">{keyword.category_l3}</td>
                      <td className="count-cell">{keyword.count}</td>
                      <td
                        className="change-cell"
                        style={{
                          color: getChangeRateColor(keyword.change_rate),
                        }}
                      >
                        {getChangeRateIcon(keyword.change_rate)}{" "}
                        {Math.abs(keyword.change_rate)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="item-types-section">
            <h3>
              {selectedKeyword
                ? `선택된 아이템: ${selectedKeyword}`
                : "아이템 유형 상위 10개"}
            </h3>
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>유형</th>
                    <th>빈도</th>
                    <th>전월대비</th>
                  </tr>
                </thead>
                <tbody>
                  {itemTypes.length > 0 ? (
                    itemTypes.map((item, index) => (
                      <tr key={index} className="item-type-row">
                        <td className="rank-cell">{index + 1}</td>
                        <td className="keyword-cell">{item.item_type}</td>
                        <td className="count-cell">{item.count}</td>
                        <td
                          className="change-cell"
                          style={{
                            color: getChangeRateColor(item.change_rate),
                          }}
                        >
                          {getChangeRateIcon(item.change_rate)}{" "}
                          {Math.abs(item.change_rate)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-cell">
                        키워드를 선택해주세요
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TypeAnalysis;
