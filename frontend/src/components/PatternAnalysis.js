import React, { useState, useEffect } from "react";
import { clothingCategories } from "../data/clothingCategories";
import "./PatternAnalysis.css";

function PatternAnalysis() {
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    followers: 0,
    mainCategory: "",
    subCategory: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    year: "",
    month: "",
    followers: 0,
    mainCategory: "",
    subCategory: "",
  });

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredMonths, setFilteredMonths] = useState([]);

  // 데이터 로딩
  useEffect(() => {
    fetchPatternData();
  }, []);

  const fetchPatternData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8001/api/item-pattern");
      const result = await response.json();

      if (result.success) {
        setRawData(result.data);

        // 사용 가능한 연도/월 추출 (post_year, post_month 컬럼 사용)
        const years = [...new Set(result.data.map((item) => item.post_year))]
          .filter((year) => year != null)
          .sort();

        const months = [...new Set(result.data.map((item) => item.post_month))]
          .filter((month) => month != null)
          .sort((a, b) => a - b);

        setAvailableYears(years);
        setAvailableMonths(months);
        setFilteredMonths(months); // 초기에는 모든 월 표시

        // 기본값을 "전체"로 설정
        setFilters((prev) => ({
          ...prev,
          year: "",
          month: "",
        }));
      }
    } catch (error) {
      console.error("패턴 데이터 로딩 오류:", error);
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

      // 대분류가 변경되면 소분류 초기화
      if (filterType === "mainCategory") {
        newFilters.subCategory = "";
      }

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
  };

  const handleResetFilters = () => {
    const resetFilters = {
      year: "",
      month: "",
      followers: 0,
      mainCategory: "",
      subCategory: "",
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
  };

  // 데이터 분석 및 처리
  const processPatternData = () => {
    if (!rawData.length) return { rising: [], stable: [], falling: [] };

    // 필터 적용 (post_year, post_month 컬럼 사용)
    const filteredData = rawData.filter((item) => {
      return (
        (!appliedFilters.year ||
          item.post_year === parseInt(appliedFilters.year)) &&
        (!appliedFilters.month ||
          item.post_month === parseInt(appliedFilters.month)) &&
        (!appliedFilters.mainCategory ||
          item.category_l1 === appliedFilters.mainCategory) &&
        (!appliedFilters.subCategory ||
          item.category_l3 === appliedFilters.subCategory) &&
        (!appliedFilters.followers ||
          item.follower_count >= appliedFilters.followers)
      );
    });

    // 패턴별 집계
    const patternStats = {};
    filteredData.forEach((item) => {
      if (item.pattern && item.pattern.trim()) {
        const pattern = item.pattern.trim();
        if (!patternStats[pattern]) {
          patternStats[pattern] = { current: 0, previous: 0 };
        }
        patternStats[pattern].current++;
      }
    });

    // 전월 데이터 계산 (post_year, post_month 컬럼 사용)
    const currentYear = appliedFilters.year
      ? parseInt(appliedFilters.year)
      : null;
    const currentMonth = appliedFilters.month
      ? parseInt(appliedFilters.month)
      : null;

    let previousData = [];
    if (currentYear && currentMonth) {
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      previousData = rawData.filter((item) => {
        return (
          item.post_year === previousYear &&
          item.post_month === previousMonth &&
          (!appliedFilters.mainCategory ||
            item.category_l1 === appliedFilters.mainCategory) &&
          (!appliedFilters.subCategory ||
            item.category_l3 === appliedFilters.subCategory) &&
          (!appliedFilters.followers ||
            item.follower_count >= appliedFilters.followers)
        );
      });
    }

    // 전월 패턴별 집계
    previousData.forEach((item) => {
      if (item.pattern && item.pattern.trim()) {
        const pattern = item.pattern.trim();
        if (!patternStats[pattern]) {
          patternStats[pattern] = { current: 0, previous: 0 };
        }
        patternStats[pattern].previous++;
      }
    });

    // 디버깅 로그
    console.log("현재 월 데이터 수:", filteredData.length);
    console.log("전월 데이터 수:", previousData.length);
    console.log("패턴 통계:", patternStats);

    // 상승/유지/하락 분류
    const results = Object.entries(patternStats).map(([pattern, stats]) => {
      // 현재 월 총합
      const currentTotal = Object.values(patternStats).reduce(
        (sum, s) => sum + s.current,
        0
      );
      // 전월 총합
      const previousTotal = Object.values(patternStats).reduce(
        (sum, s) => sum + s.previous,
        0
      );

      // 현재 월 비중
      const currentPercent =
        currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;
      // 전월 비중
      const previousPercent =
        previousTotal > 0 ? (stats.previous / previousTotal) * 100 : 0;

      // 전월대비 변화율 계산
      let changePercent = 0;
      if (previousPercent > 0) {
        changePercent =
          ((currentPercent - previousPercent) / previousPercent) * 100;
      } else if (currentPercent > 0) {
        // 전월에 없었던 패턴이 현재 월에 나타난 경우
        changePercent = 100;
      }

      return {
        pattern,
        currentPercent: Math.round(currentPercent * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        current: stats.current,
        previous: stats.previous,
      };
    });

    // 분류 및 정렬
    const rising = results
      .filter((item) => item.changePercent > 5)
      .sort((a, b) => b.currentPercent - a.currentPercent)
      .slice(0, 10);

    const stable = results
      .filter((item) => item.changePercent >= -5 && item.changePercent <= 5)
      .sort((a, b) => b.currentPercent - a.currentPercent)
      .slice(0, 10);

    const falling = results
      .filter((item) => item.changePercent < -5)
      .sort((a, b) => b.currentPercent - a.currentPercent)
      .slice(0, 10);

    return { rising, stable, falling };
  };

  const { rising, stable, falling } = processPatternData();

  const formatFollowers = (value) => {
    if (value === 0) return "전체";
    if (value < 1000) return `${value}`;
    if (value < 1000000) return `${(value / 1000).toFixed(0)}K`;
    return `${(value / 1000000).toFixed(1)}M`;
  };

  const renderTable = (data, title, type) => (
    <div className="pattern-table-container">
      <h3 className={`table-title ${type}`}>{title}</h3>
      <div className="table-wrapper">
        <table className="pattern-table">
          <thead>
            <tr>
              <th>No</th>
              <th>키워드</th>
              <th>비중</th>
              <th>전월대비</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.pattern}>
                <td className="no-cell">{index + 1}</td>
                <td className="keyword-cell">{item.pattern}</td>
                <td className="weight-cell">{item.currentPercent}%</td>
                <td className={`change-cell ${type}`}>
                  {item.changePercent > 0 ? "+" : ""}
                  {item.changePercent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="pattern-analysis">
        <div className="loading">
          <h2>데이터 로딩 중...</h2>
          <p>잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pattern-analysis">
      <div className="analysis-header">
        <h2>Pattern Analysis</h2>
        <p>패턴 트렌드 분석 결과</p>
      </div>

      <div className="filter-section">
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
          <label className="filter-label">소분류</label>
          <select
            className="filter-select"
            value={filters.subCategory}
            onChange={(e) => handleFilterChange("subCategory", e.target.value)}
            disabled={!filters.mainCategory}
          >
            <option value="">전체</option>
            {filters.mainCategory &&
              clothingCategories[filters.mainCategory]?.map((subCategory) => (
                <option key={subCategory} value={subCategory}>
                  {subCategory}
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
              : "연도/월을 선택해주세요"}{" "}
            • {formatFollowers(appliedFilters.followers)} 팔로워
            {appliedFilters.mainCategory && (
              <>
                {" "}
                • {appliedFilters.mainCategory}
                {appliedFilters.subCategory &&
                  ` - ${appliedFilters.subCategory}`}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="tables-container">
        {renderTable(rising, "상승", "rising")}
        {renderTable(stable, "유지", "stable")}
        {renderTable(falling, "하락", "falling")}
      </div>
    </div>
  );
}

export default PatternAnalysis;
