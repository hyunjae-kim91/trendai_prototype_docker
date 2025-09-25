import React, { useState, useEffect } from "react";
import { clothingCategories } from "../data/clothingCategories";
import "./ColorAnalysis.css";

function ColorAnalysis() {
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    followersMin: 10000,
    followersMax: 200000,
    mainCategory: "",
    subCategory: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    year: "",
    month: "",
    followersMin: 10000,
    followersMax: 200000,
    mainCategory: "",
    subCategory: "",
  });

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredMonths, setFilteredMonths] = useState([]);

  // 이미지 갤러리 관련 상태
  const [selectedColor, setSelectedColor] = useState("");
  const [colorImages, setColorImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");

  // 정렬 상태 관리
  const [sortConfig, setSortConfig] = useState({
    rising: { key: null, direction: "asc" },
    stable: { key: null, direction: "asc" },
    falling: { key: null, direction: "asc" },
  });

  // 데이터 로딩
  useEffect(() => {
    fetchColorData();
  }, []);

  const fetchColorData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8001/api/item-color");
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
      console.error("컬러 데이터 로딩 오류:", error);
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
      followersMin: 10000,
      followersMax: 200000,
      mainCategory: "",
      subCategory: "",
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setSelectedColor("");
    setColorImages([]);
    setShowImageGallery(false);
    setError("");
  };

  // 컬러 이미지 조회 함수
  const fetchColorImages = async (color) => {
    try {
      setImageLoading(true);
      setError("");

      const params = new URLSearchParams({
        color: color,
      });

      if (appliedFilters.mainCategory) {
        params.append("category_l1", appliedFilters.mainCategory);
      }
      if (appliedFilters.subCategory) {
        params.append("category_l3", appliedFilters.subCategory);
      }
      if (appliedFilters.year) {
        params.append("post_year", appliedFilters.year);
      }
      if (appliedFilters.month) {
        params.append("post_month", appliedFilters.month);
      }
      if (appliedFilters.followersMin > 0) {
        params.append("follower_count", appliedFilters.followersMin);
      }

      params.append("limit", "20");

      const response = await fetch(
        `http://localhost:8001/api/color-images?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setColorImages(data.data);
        setShowImageGallery(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("이미지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setImageLoading(false);
    }
  };

  // 컬러 클릭 핸들러
  const handleColorClick = (color) => {
    setSelectedColor(color);
    setShowImageGallery(false);
    setColorImages([]);
    setError("");
    fetchColorImages(color);
  };

  // 데이터 분석 및 처리
  const processColorData = () => {
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
        item.follower_count &&
        parseInt(item.follower_count) >= appliedFilters.followersMin &&
        parseInt(item.follower_count) <= appliedFilters.followersMax
      );
    });

    // 컬러별 집계
    const colorStats = {};
    filteredData.forEach((item) => {
      if (item.color && item.color.trim()) {
        const color = item.color.trim();
        if (!colorStats[color]) {
          colorStats[color] = { current: 0, previous: 0 };
        }
        colorStats[color].current++;
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
          item.follower_count &&
          parseInt(item.follower_count) >= appliedFilters.followersMin &&
          parseInt(item.follower_count) <= appliedFilters.followersMax
        );
      });
    }

    // 전월 컬러별 집계
    previousData.forEach((item) => {
      if (item.color && item.color.trim()) {
        const color = item.color.trim();
        if (!colorStats[color]) {
          colorStats[color] = { current: 0, previous: 0 };
        }
        colorStats[color].previous++;
      }
    });

    // 디버깅 로그
    console.log("현재 월 데이터 수:", filteredData.length);
    console.log("전월 데이터 수:", previousData.length);
    console.log("컬러 통계:", colorStats);
    console.log("총 컬러 종류 수:", Object.keys(colorStats).length);

    // 상승/유지/하락 분류
    const results = Object.entries(colorStats).map(([color, stats]) => {
      // 현재 월 총합 (비중 계산용)
      const currentTotal = Object.values(colorStats).reduce(
        (sum, s) => sum + s.current,
        0
      );

      // 현재 월 비중
      const currentPercent =
        currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;

      // 전월대비 변화율 계산 (빈도 기준)
      let changePercent = 0;
      if (stats.previous > 0) {
        changePercent =
          ((stats.current - stats.previous) / stats.previous) * 100;
      } else if (stats.current > 0) {
        // 전월에 없었던 컬러가 현재 월에 나타난 경우
        changePercent = 100;
      }

      return {
        color,
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

    return { rising, stable, falling, totalFilteredData: filteredData.length };
  };

  const processedData = processColorData();
  const { rising, stable, falling, totalFilteredData } = processedData;

  const formatFollowers = (value) => {
    if (value === 0) return "전체";
    if (value < 1000) return `${value}`;
    return `${(value / 1000).toFixed(0)}K`;
  };

  // 정렬 함수
  const handleSort = (type, key) => {
    setSortConfig((prev) => ({
      ...prev,
      [type]: {
        key: key,
        direction:
          prev[type].key === key && prev[type].direction === "asc"
            ? "desc"
            : "asc",
      },
    }));
  };

  // 정렬된 데이터 반환 함수
  const getSortedData = (data, type) => {
    const config = sortConfig[type];
    if (!config.key) return data;

    return [...data].sort((a, b) => {
      let aVal = a[config.key];
      let bVal = b[config.key];

      if (config.key === "currentPercent") {
        aVal = a.currentPercent;
        bVal = b.currentPercent;
      } else if (config.key === "changePercent") {
        aVal = a.changePercent;
        bVal = b.changePercent;
      }

      if (aVal < bVal) {
        return config.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return config.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // 정렬 아이콘 반환 함수
  const getSortIcon = (type, key) => {
    const config = sortConfig[type];
    if (config.key !== key) return "↕";
    return config.direction === "asc" ? "↑" : "↓";
  };
  const renderTable = (data, title, type) => {
    const sortedData = getSortedData(data, type);

    return (
      <div className="color-table-container">
        <h3 className={`table-title ${type}`}>{title}</h3>
        <div className="table-wrapper">
          <table className="color-table">
            <thead>
              <tr>
                <th>No</th>
                <th>키워드</th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort(type, "currentPercent")}
                  style={{ cursor: "pointer" }}
                >
                  비중 {getSortIcon(type, "currentPercent")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort(type, "changePercent")}
                  style={{ cursor: "pointer" }}
                >
                  전월대비 {getSortIcon(type, "changePercent")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr
                  key={item.color}
                  className={`color-row ${
                    selectedColor === item.color ? "selected" : ""
                  }`}
                  onClick={() => handleColorClick(item.color)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="no-cell">{index + 1}</td>
                  <td className="keyword-cell">{item.color}</td>
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
  };

  if (loading) {
    return (
      <div className="color-analysis">
        <div className="loading">
          <h2>데이터 로딩 중...</h2>
          <p>잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="color-analysis">
      <div className="analysis-header">
        <h2>Color Analysis</h2>
        <p>색상 트렌드 분석 결과</p>
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
            <div className="range-slider-wrapper">
              <div className="range-slider">
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="1000"
                  value={filters.followersMin}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value <= filters.followersMax) {
                      handleFilterChange("followersMin", value);
                    }
                  }}
                  className="range-input range-input-min"
                />
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="1000"
                  value={filters.followersMax}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= filters.followersMin) {
                      handleFilterChange("followersMax", value);
                    }
                  }}
                  className="range-input range-input-max"
                />
                <div className="range-track">
                  <div
                    className="range-progress"
                    style={{
                      left: `${
                        ((filters.followersMin - 10000) / (200000 - 10000)) *
                        100
                      }%`,
                      width: `${
                        ((filters.followersMax - filters.followersMin) /
                          (200000 - 10000)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="slider-labels">
              <span>10K</span>
              <span>50K</span>
              <span>100K</span>
              <span>150K</span>
              <span>200K</span>
            </div>
            <div className="slider-values">
              <span>{formatFollowers(filters.followersMin)}</span>
              <span>~</span>
              <span>{formatFollowers(filters.followersMax)}</span>
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
            • {formatFollowers(appliedFilters.followersMin)} ~{" "}
            {formatFollowers(appliedFilters.followersMax)} 팔로워
            {appliedFilters.mainCategory && (
              <>
                {" "}
                • {appliedFilters.mainCategory}
                {appliedFilters.subCategory &&
                  ` - ${appliedFilters.subCategory}`}
              </>
            )}{" "}
            • 총 {totalFilteredData}개 데이터
          </span>
        </div>
      </div>

      <div className="tables-container">
        {renderTable(rising, "상승", "rising")}
        {renderTable(stable, "유지", "stable")}
        {renderTable(falling, "하락", "falling")}
      </div>

      {/* 이미지 갤러리 섹션 */}
      {(imageLoading || showImageGallery) && (
        <div
          className={`image-gallery-container ${
            showImageGallery ? "show" : ""
          }`}
        >
          {imageLoading ? (
            <div className="image-loading">
              <div className="loading-spinner"></div>
              <h3>이미지 로딩 중...</h3>
              <p>잠시만 기다려주세요.</p>
            </div>
          ) : (
            <div className="image-gallery-results">
              <h3>
                {selectedColor && <>{selectedColor} 컬러 이미지 갤러리</>}
              </h3>
              <div className="image-grid">
                {colorImages.length > 0 ? (
                  colorImages.map((image, index) => (
                    <div key={index} className="image-item">
                      <img
                        src={image.s3_key}
                        alt={`${selectedColor} 컬러 이미지`}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="image-info">
                        <span className="follower-count">
                          {formatFollowers(image.follower_count)} 팔로워
                        </span>
                        <span className="category-info">
                          {image.category_l1} - {image.category_l3}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-images">
                    <p>표시할 이미지가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default ColorAnalysis;
