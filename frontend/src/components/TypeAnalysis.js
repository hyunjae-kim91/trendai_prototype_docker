import React, { useState, useEffect } from "react";
import API_ENDPOINTS, { apiCall } from "../config/api";
import ImageModal from "./ImageModal";
import "./TypeAnalysis.css";

function TypeAnalysis() {
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    followersMin: 10000,
    followersMax: 200000,
    mainCategory: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    year: "",
    month: "",
    followersMin: 10000,
    followersMax: 200000,
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
  const [selectedItemType, setSelectedItemType] = useState("");
  const [coordiData, setCoordiData] = useState({ left: [], right: [] });
  const [showCoordi, setShowCoordi] = useState(false);
  const [coordiLoading, setCoordiLoading] = useState(false);
  const [selectedCoordiItem, setSelectedCoordiItem] = useState("");
  const [coordiImages, setCoordiImages] = useState([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");

  // 전체 선택 경로 추적을 위한 상태
  const [selectedPath, setSelectedPath] = useState({
    mainCategory: "",
    keyword: "",
    itemType: "",
    coordiItem: "",
  });

  // 정렬 상태 관리
  const [sortConfig, setSortConfig] = useState({
    keywords: { key: null, direction: "asc" },
    itemTypes: { key: null, direction: "asc" },
  });

  // 데이터 로딩
  useEffect(() => {
    fetchTypeData();
  }, []);

  const fetchTypeData = async () => {
    setLoading(true);
    try {
      // 메타데이터와 대분류 목록을 동시에 가져오기
      const [metaResult, categoriesResult] = await Promise.all([
        apiCall(API_ENDPOINTS.ITEM_TYPE_META),
        apiCall(API_ENDPOINTS.ITEM_TYPE_CATEGORIES),
      ]);

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
    // 선택 경로 초기화
    setSelectedPath({
      mainCategory: filters.mainCategory,
      keyword: "",
      itemType: "",
      coordiItem: "",
    });
    // 현재 filters 값을 직접 사용하여 키워드 조회
    fetchKeywordsWithFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const resetFilters = {
      year: "",
      month: "",
      followersMin: 10000,
      followersMax: 200000,
      mainCategory: "",
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setKeywords([]);
    setSelectedKeyword("");
    setItemTypes([]);
    setSelectedItemType("");
    setCoordiData({ left: [], right: [] });
    setShowCoordi(false);
    setSelectedCoordiItem("");
    setCoordiImages([]);
    setShowImageGallery(false);
    setSelectedPath({
      mainCategory: "",
      keyword: "",
      itemType: "",
      coordiItem: "",
    });
    setError(""); // Clear error on reset
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
      if (filterValues.followersMin > 0) {
        params.append("follower_count", filterValues.followersMin);
      }

      const data = await apiCall(`${API_ENDPOINTS.ITEM_TYPE_KEYWORDS}?${params}`);

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
      if (appliedFilters.followersMin > 0) {
        params.append("follower_count", appliedFilters.followersMin);
      }

      const data = await apiCall(`${API_ENDPOINTS.ITEM_TYPE_ITEMS}?${params}`);

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
    setSelectedItemType("");
    setShowCoordi(false);
    setCoordiData({ left: [], right: [] });
    setSelectedPath((prev) => ({
      ...prev,
      keyword: keyword,
      itemType: "",
      coordiItem: "",
    }));
    fetchItemTypes(keyword);
  };

  // 코디 조합 조회
  const fetchCoordiCombination = async (itemType) => {
    try {
      setCoordiLoading(true);
      setError("");

      const params = new URLSearchParams({
        item_type: itemType,
        main_category: appliedFilters.mainCategory,
      });

      if (appliedFilters.year && appliedFilters.year !== "") {
        params.append("post_year", appliedFilters.year);
      }
      if (appliedFilters.month && appliedFilters.month !== "") {
        params.append("post_month", appliedFilters.month);
      }
      if (appliedFilters.followersMin > 0) {
        params.append("follower_count", appliedFilters.followersMin);
      }

      const data = await apiCall(`${API_ENDPOINTS.COORDI_COMBINATION}?${params}`);

      if (data.success) {
        setCoordiData(data.data);
        setShowCoordi(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("코디 조합을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setCoordiLoading(false);
    }
  };

  const handleItemTypeClick = (itemType) => {
    setSelectedItemType(itemType);
    setSelectedCoordiItem("");
    setShowImageGallery(false);
    setCoordiImages([]);
    setSelectedPath((prev) => ({
      ...prev,
      itemType: itemType,
      coordiItem: "",
    }));
    fetchCoordiCombination(itemType);
  };

  // 이미지 갤러리 조회
  const fetchCoordiImages = async (itemType, category) => {
    try {
      setImageLoading(true);
      setError("");

      const params = new URLSearchParams({
        item_type: itemType,
        main_category: category,
      });

      // 코디 조합 필터링: 선택된 상의 + 클릭한 코디 아이템
      if (selectedItemType && appliedFilters.mainCategory) {
        params.append("coordi_main_category", appliedFilters.mainCategory);
        params.append("coordi_item_type", selectedItemType);
      }

      if (appliedFilters.year && appliedFilters.year !== "") {
        params.append("post_year", appliedFilters.year);
      }
      if (appliedFilters.month && appliedFilters.month !== "") {
        params.append("post_month", appliedFilters.month);
      }
      if (appliedFilters.followersMin > 0) {
        params.append("follower_count", appliedFilters.followersMin);
      }

      params.append("limit", "20");

      const data = await apiCall(`${API_ENDPOINTS.COORDI_IMAGES}?${params}`);

      if (data.success) {
        setCoordiImages(data.data);
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

  const handleCoordiItemClick = (itemType, category) => {
    setSelectedCoordiItem(itemType);
    setSelectedPath((prev) => ({
      ...prev,
      coordiItem: itemType,
    }));
    fetchCoordiImages(itemType, category);
  };

  // 이미지 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);

  // 이미지 클릭 핸들러
  const handleImageClick = (imageData) => {
    const modalData = {
      ...imageData,
      imageUrl: imageData.s3_key,
      // 기본 정보 매핑
      mood_category: imageData.mood_category || null,
      mood_look: imageData.mood_look || null,
      pattern: imageData.pattern || null,
      color: imageData.color || null,
      category_main: imageData.category_l1 || null,
      category_sub: imageData.category_l3 || null,
      date_posted: imageData.post_date || null,
    };
    setSelectedImageData(modalData);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImageData(null);
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
      let aVal, bVal;

      if (config.key === "count") {
        aVal = a.count;
        bVal = b.count;
      } else if (config.key === "change_rate") {
        aVal = a.change_rate;
        bVal = b.change_rate;
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
              : appliedFilters.year
              ? `${appliedFilters.year}년`
              : "전체 기간"}{" "}
            • {formatFollowers(appliedFilters.followersMin)} ~{" "}
            {formatFollowers(appliedFilters.followersMax)} 팔로워
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
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("keywords", "count")}
                      style={{ cursor: "pointer" }}
                    >
                      빈도 {getSortIcon("keywords", "count")}
                    </th>
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("keywords", "change_rate")}
                      style={{ cursor: "pointer" }}
                    >
                      전월대비 {getSortIcon("keywords", "change_rate")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedData(keywords, "keywords").map((keyword, index) => (
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
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("itemTypes", "count")}
                      style={{ cursor: "pointer" }}
                    >
                      빈도 {getSortIcon("itemTypes", "count")}
                    </th>
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("itemTypes", "change_rate")}
                      style={{ cursor: "pointer" }}
                    >
                      전월대비 {getSortIcon("itemTypes", "change_rate")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemTypes.length > 0 ? (
                    getSortedData(itemTypes, "itemTypes").map((item, index) => (
                      <tr
                        key={index}
                        className={`item-type-row ${
                          selectedItemType === item.item_type ? "selected" : ""
                        }`}
                        onClick={() => handleItemTypeClick(item.item_type)}
                      >
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

      {/* 코디 조합 섹션 */}
      {(coordiLoading || showCoordi) && (
        <div className={`coordi-container ${showCoordi ? "show" : ""}`}>
          {coordiLoading ? (
            <div className="coordi-loading">
              <div className="loading-spinner"></div>
              <h3>코디 조합 분석 중...</h3>
              <p>잠시만 기다려주세요.</p>
            </div>
          ) : (
            <div className="coordi-results">
              <h3>{selectedItemType && <>{selectedItemType} 코디 조합</>}</h3>
              <div className="coordi-tables">
                <div className="coordi-left">
                  <h4>
                    {appliedFilters.mainCategory === "상의"
                      ? "아우터"
                      : appliedFilters.mainCategory === "아우터"
                      ? "상의"
                      : "상의"}
                  </h4>
                  <div className="table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>번호</th>
                          <th>유형</th>
                          <th>빈도</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordiData.left.length > 0 ? (
                          coordiData.left.map((item, index) => (
                            <tr
                              key={index}
                              className={`coordi-row ${
                                selectedCoordiItem === item.item_type
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                handleCoordiItemClick(
                                  item.item_type,
                                  appliedFilters.mainCategory === "상의"
                                    ? "아우터"
                                    : "상의"
                                )
                              }
                            >
                              <td className="rank-cell">{index + 1}</td>
                              <td className="keyword-cell">{item.item_type}</td>
                              <td className="count-cell">{item.count}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="empty-cell">
                              데이터 없음
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="coordi-right">
                  <h4>
                    {appliedFilters.mainCategory === "상의"
                      ? "하의"
                      : appliedFilters.mainCategory === "아우터"
                      ? "하의"
                      : "아우터"}
                  </h4>
                  <div className="table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>번호</th>
                          <th>유형</th>
                          <th>빈도</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coordiData.right.length > 0 ? (
                          coordiData.right.map((item, index) => (
                            <tr
                              key={index}
                              className={`coordi-row ${
                                selectedCoordiItem === item.item_type
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                handleCoordiItemClick(
                                  item.item_type,
                                  appliedFilters.mainCategory === "상의"
                                    ? "하의"
                                    : appliedFilters.mainCategory === "아우터"
                                    ? "하의"
                                    : "아우터"
                                )
                              }
                            >
                              <td className="rank-cell">{index + 1}</td>
                              <td className="keyword-cell">{item.item_type}</td>
                              <td className="count-cell">{item.count}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="empty-cell">
                              데이터 없음
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                {selectedCoordiItem && <>{selectedCoordiItem} 이미지 갤러리</>}
              </h3>
              <div className="image-grid">
                {coordiImages.length > 0 ? (
                  coordiImages.map((image, index) => (
                    <div
                      key={index}
                      className="image-item"
                      onClick={() => handleImageClick(image)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={image.s3_key}
                        alt={`${image.item_type} 이미지`}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="image-info">
                        <span className="follower-count">
                          {formatFollowers(image.follower_count)} 팔로워
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

      {/* 이미지 모달 */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        imageData={selectedImageData}
      />
    </div>
  );
}

export default TypeAnalysis;
