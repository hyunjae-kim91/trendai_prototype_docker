import React, { useState, useEffect } from "react";
import "./Mood1Analysis.css";

function Mood1Analysis() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 상태
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // 카테고리 옵션
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  // 차트 데이터
  const [moodCategoryData, setMoodCategoryData] = useState([]);
  const [moodLookData, setMoodLookData] = useState([]);
  const [patternData, setPatternData] = useState([]);
  const [colorData, setColorData] = useState([]);
  const [detail1Data, setDetail1Data] = useState([]);

  // 선택된 mood_category와 mood_look
  const [selectedMoodCategory, setSelectedMoodCategory] = useState(null);
  const [selectedMoodLook, setSelectedMoodLook] = useState(null);
  const [isMoodLookMode, setIsMoodLookMode] = useState(false);

  // 이미지 갤러리 데이터
  const [filteredImages, setFilteredImages] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // selectedMoodCategory나 selectedMoodLook이 변경될 때마다 데이터 처리
  useEffect(() => {
    if (data.length > 0) {
      processChartData(data);
    }
  }, [selectedMoodCategory, selectedMoodLook]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8001/api/mood-rate");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setMainCategories(result.categories_main);
        setSubCategories(result.categories_sub);
        processChartData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
      console.error("데이터 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData) => {
    // 필터링된 데이터
    const filteredData = rawData.filter((item) => {
      const dateMatch =
        (!startDate || item.date_posted >= startDate) &&
        (!endDate || item.date_posted <= endDate);
      const mainMatch =
        !selectedMainCategory || item.category_main === selectedMainCategory;
      const subMatch =
        !selectedSubCategory || item.category_sub === selectedSubCategory;

      return dateMatch && mainMatch && subMatch;
    });

    // mood_category 데이터 처리 (항상 실행)
    const moodCategoryCounts = {};
    filteredData.forEach((item) => {
      // null, undefined, 빈 문자열 제외
      if (
        item.mood_category &&
        item.mood_category !== null &&
        item.mood_category !== "null" &&
        item.mood_category.trim() !== ""
      ) {
        const category = item.mood_category;
        moodCategoryCounts[category] = (moodCategoryCounts[category] || 0) + 1;
      }
    });

    const moodCategoryArray = Object.entries(moodCategoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    setMoodCategoryData(moodCategoryArray);

    // mood_look 데이터 처리 (selectedMoodCategory 필터링 적용)
    console.log("Mood Look 데이터 처리");
    console.log("필터링된 데이터 개수:", filteredData.length);

    const moodLookCounts = {};
    let matchingItems = 0;

    // selectedMoodCategory가 있으면 해당 카테고리만 필터링
    let moodLookData = filteredData;
    if (selectedMoodCategory) {
      moodLookData = filteredData.filter(
        (item) => item.mood_category === selectedMoodCategory
      );
      console.log("Mood Category로 필터링된 데이터:", moodLookData.length);
    }

    moodLookData.forEach((item) => {
      // null, undefined, 빈 문자열 제외
      if (
        item.mood_look &&
        item.mood_look !== null &&
        item.mood_look !== "null" &&
        item.mood_look.trim() !== ""
      ) {
        matchingItems++;
        const look = item.mood_look;
        moodLookCounts[look] = (moodLookCounts[look] || 0) + 1;
      }
    });

    console.log("매칭되는 아이템 개수:", matchingItems);
    console.log("Mood Look 원시 데이터:", moodLookCounts);

    const moodLookArray = Object.entries(moodLookCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    console.log("Mood Look 최종 데이터:", moodLookArray);
    console.log("Mood Look 배열 길이:", moodLookArray.length);
    setMoodLookData(moodLookArray);

    // 서브 차트 데이터 처리 - 선택된 mood_category와 mood_look에 따라 필터링
    const patternCounts = {};
    const colorCounts = {};
    const detail1Counts = {};

    let dataForSubCharts = filteredData;

    if (selectedMoodCategory) {
      console.log("Mood Category 필터링 전:", dataForSubCharts.length);
      dataForSubCharts = dataForSubCharts.filter(
        (item) => item.mood_category === selectedMoodCategory
      );
      console.log("Mood Category 필터링 후:", dataForSubCharts.length);
    }

    if (selectedMoodLook) {
      console.log("Mood Look 필터링 전:", dataForSubCharts.length);
      dataForSubCharts = dataForSubCharts.filter(
        (item) => item.mood_look === selectedMoodLook
      );
      console.log("Mood Look 필터링 후:", dataForSubCharts.length);
    }

    dataForSubCharts.forEach((item) => {
      // null, undefined, 빈 문자열 제외
      if (
        item.pattern &&
        item.pattern !== null &&
        item.pattern !== "null" &&
        item.pattern.trim() !== ""
      ) {
        patternCounts[item.pattern] = (patternCounts[item.pattern] || 0) + 1;
      }
      if (
        item.color &&
        item.color !== null &&
        item.color !== "null" &&
        item.color.trim() !== ""
      ) {
        colorCounts[item.color] = (colorCounts[item.color] || 0) + 1;
      }
      if (
        item.detail1 &&
        item.detail1 !== null &&
        item.detail1 !== "null" &&
        item.detail1.trim() !== ""
      ) {
        detail1Counts[item.detail1] = (detail1Counts[item.detail1] || 0) + 1;
      }
    });

    // 작은 값들을 "기타"로 그룹화하는 함수
    const groupSmallValues = (counts, threshold = 0, maxItems = null) => {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

      // maxItems가 설정되어 있으면 상위 항목들만 선택
      let topItems, remainingItems;
      if (maxItems && maxItems > 0) {
        topItems = entries.slice(0, maxItems);
        remainingItems = entries.slice(maxItems);
      } else {
        topItems = entries;
        remainingItems = [];
      }

      const result = [...topItems];

      // 나머지 항목들을 "기타"로 묶기
      if (remainingItems.length > 0) {
        const othersTotal = remainingItems.reduce(
          (sum, [name, value]) => sum + value,
          0
        );
        if (othersTotal > 0) {
          result.push(["기타", othersTotal]);
        }
      }

      // threshold가 0이면 모든 항목 표시
      if (threshold === 0) {
        return result;
      }

      // 임계값 미만의 항목들도 "기타"로 묶기
      const smallItems = result.filter(([name, value]) => value < threshold);
      const mainItems = result.filter(([name, value]) => value >= threshold);

      if (smallItems.length > 0) {
        const smallTotal = smallItems.reduce(
          (sum, [name, value]) => sum + value,
          0
        );
        return [...mainItems, ["기타", smallTotal]];
      }

      return result;
    };

    // 필터링된 차트는 작은 값들을 "기타"로 그룹화
    const isFiltered = selectedMoodCategory || selectedMoodLook;

    if (isFiltered) {
      const patternGrouped = groupSmallValues(patternCounts);
      const colorGrouped = groupSmallValues(colorCounts);
      const detail1Grouped = groupSmallValues(detail1Counts);

      setPatternData(
        patternGrouped
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setColorData(
        colorGrouped
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setDetail1Data(
        detail1Grouped
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
    } else {
      setPatternData(
        Object.entries(patternCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setColorData(
        Object.entries(colorCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setDetail1Data(
        Object.entries(detail1Counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
    }

    // 이미지 갤러리는 서브 차트 클릭 시에만 표시되도록 여기서는 처리하지 않음
  };

  const handleFilterChange = () => {
    processChartData(data);
  };

  const handleMoodCategoryClick = (categoryName) => {
    console.log("클릭된 Mood Category:", categoryName);
    setSelectedMoodCategory(categoryName);
    setSelectedMoodLook(null); // Mood Look 선택 초기화
    setIsMoodLookMode(true);
    setFilteredImages([]); // 이미지 갤러리 초기화
    // processChartData는 useEffect에서 처리됨
  };

  const handleMoodLookClick = (lookName) => {
    console.log("클릭된 Mood Look:", lookName);
    setSelectedMoodLook(lookName);
    setFilteredImages([]); // 이미지 갤러리 초기화
    // processChartData는 useEffect에서 처리됨
  };

  // 현재 적용된 필터들로 필터링된 데이터를 가져오는 함수
  const getCurrentFilteredData = () => {
    let filteredData = data;

    // 날짜 필터 적용
    if (startDate || endDate) {
      filteredData = filteredData.filter((item) => {
        if (!item.date_posted) return false;
        const itemDate = new Date(item.date_posted);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const dateMatch =
          (!start || itemDate >= start) && (!end || itemDate <= end);
        return dateMatch;
      });
    }

    // 대분류 필터 적용
    if (selectedMainCategory) {
      filteredData = filteredData.filter(
        (item) => item.category_main === selectedMainCategory
      );
    }

    // 소분류 필터 적용
    if (selectedSubCategory) {
      filteredData = filteredData.filter(
        (item) => item.category_sub === selectedSubCategory
      );
    }

    return filteredData;
  };

  const handlePatternClick = (patternName) => {
    console.log("클릭된 Pattern:", patternName);

    // 3가지 필터 모두 적용: 날짜/카테고리 필터 + Mood Category/Look + Pattern
    let filteredData = getCurrentFilteredData();

    // Mood Category 필터 적용
    if (selectedMoodCategory) {
      filteredData = filteredData.filter(
        (item) => item.mood_category === selectedMoodCategory
      );
    }

    // Mood Look 필터 적용
    if (selectedMoodLook) {
      filteredData = filteredData.filter(
        (item) => item.mood_look === selectedMoodLook
      );
    }

    // Pattern 필터 적용
    const patternFilteredImages = filteredData.filter(
      (item) =>
        item.pattern === patternName &&
        item.thumbnail_s3_url &&
        item.thumbnail_s3_url !== null &&
        item.thumbnail_s3_url !== "null" &&
        item.thumbnail_s3_url.trim() !== ""
    );

    // 중복 제거 (thumbnail_s3_url 기준)
    const uniqueImages = patternFilteredImages.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.thumbnail_s3_url === item.thumbnail_s3_url)
    );

    setFilteredImages(uniqueImages);
  };

  const handleColorClick = (colorName) => {
    console.log("클릭된 Color:", colorName);

    // 3가지 필터 모두 적용: 날짜/카테고리 필터 + Mood Category/Look + Color
    let filteredData = getCurrentFilteredData();

    // Mood Category 필터 적용
    if (selectedMoodCategory) {
      filteredData = filteredData.filter(
        (item) => item.mood_category === selectedMoodCategory
      );
    }

    // Mood Look 필터 적용
    if (selectedMoodLook) {
      filteredData = filteredData.filter(
        (item) => item.mood_look === selectedMoodLook
      );
    }

    // Color 필터 적용
    const colorFilteredImages = filteredData.filter(
      (item) =>
        item.color === colorName &&
        item.thumbnail_s3_url &&
        item.thumbnail_s3_url !== null &&
        item.thumbnail_s3_url !== "null" &&
        item.thumbnail_s3_url.trim() !== ""
    );

    // 중복 제거 (thumbnail_s3_url 기준)
    const uniqueImages = colorFilteredImages.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.thumbnail_s3_url === item.thumbnail_s3_url)
    );

    setFilteredImages(uniqueImages);
  };

  const handleDetail1Click = (detailName) => {
    console.log("클릭된 Detail1:", detailName);

    // 3가지 필터 모두 적용: 날짜/카테고리 필터 + Mood Category/Look + Detail1
    let filteredData = getCurrentFilteredData();

    // Mood Category 필터 적용
    if (selectedMoodCategory) {
      filteredData = filteredData.filter(
        (item) => item.mood_category === selectedMoodCategory
      );
    }

    // Mood Look 필터 적용
    if (selectedMoodLook) {
      filteredData = filteredData.filter(
        (item) => item.mood_look === selectedMoodLook
      );
    }

    // Detail1 필터 적용
    const detailFilteredImages = filteredData.filter(
      (item) =>
        item.detail1 === detailName &&
        item.thumbnail_s3_url &&
        item.thumbnail_s3_url !== null &&
        item.thumbnail_s3_url !== "null" &&
        item.thumbnail_s3_url.trim() !== ""
    );

    // 중복 제거 (thumbnail_s3_url 기준)
    const uniqueImages = detailFilteredImages.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.thumbnail_s3_url === item.thumbnail_s3_url)
    );

    setFilteredImages(uniqueImages);
  };

  const resetToMoodCategory = () => {
    setSelectedMoodCategory(null);
    setSelectedMoodLook(null);
    setIsMoodLookMode(false);
    setFilteredImages([]); // 이미지 갤러리 초기화
    processChartData(data);
  };

  const renderDonutChart = (
    chartData,
    title,
    onClick = null,
    isFiltered = false
  ) => {
    console.log(`차트 렌더링 - ${title}:`, chartData);
    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    // 필터링된 차트 디버깅
    if (isFiltered) {
      console.log(`필터링된 차트 - ${title}:`, {
        chartData,
        total,
        isFiltered,
        selectedMoodCategory,
        selectedMoodLook,
      });
    }
    const colors = [
      "#667eea",
      "#f093fb",
      "#4facfe",
      "#43e97b",
      "#fa709a",
      "#a8edea",
      "#ff9a9e",
      "#ffecd2",
      "#a18cd1",
      "#fad0c4",
    ];

    if (chartData.length === 0) {
      console.log(`${title} - 데이터 없음`);
      return (
        <div className="chart-container">
          <h4>{title}</h4>
          <div className="no-data">데이터가 없습니다.</div>
        </div>
      );
    }

    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>{title}</h4>
          <span className="chart-total">총 {total}개</span>
        </div>
        <div className={`donut-chart ${isFiltered ? "filtered" : ""}`}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {chartData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const isSelected =
                selectedMoodCategory === item.name ||
                selectedMoodLook === item.name;

              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;

              const startAngleRad = (startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (endAngle - 90) * (Math.PI / 180);

              const x1 = centerX + radius * Math.cos(startAngleRad);
              const y1 = centerY + radius * Math.sin(startAngleRad);
              const x2 = centerX + radius * Math.cos(endAngleRad);
              const y2 = centerY + radius * Math.sin(endAngleRad);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                "Z",
              ].join(" ");

              return (
                <path
                  key={item.name}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="2"
                  className={`donut-segment ${onClick ? "clickable" : ""} ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={onClick ? () => onClick(item.name) : null}
                  style={{ cursor: onClick ? "pointer" : "default" }}
                />
              );
            })}
          </svg>

          {/* 범례 */}
          <div className="donut-legend">
            {chartData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const isSelected =
                selectedMoodCategory === item.name ||
                selectedMoodLook === item.name;

              return (
                <div
                  key={item.name}
                  className={`legend-item ${onClick ? "clickable" : ""} ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={onClick ? () => onClick(item.name) : null}
                >
                  <div
                    className="legend-color"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div className="legend-text">
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-value">
                      {item.value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mood1-analysis">
        <div className="loading">데이터를 로딩중입니다...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mood1-analysis">
        <div className="error">오류가 발생했습니다: {error}</div>
      </div>
    );
  }

  return (
    <div className="mood1-analysis">
      <div className="analysis-header">
        <h2>무드 센싱 분석</h2>
        <p>날짜와 카테고리별 무드 분석을 확인하세요</p>
      </div>

      {/* 필터 섹션 */}
      <div className="filter-section">
        <div className="filter-controls">
          <div className="filter-group">
            <label>시작 날짜:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>끝 날짜:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>대분류:</label>
            <select
              value={selectedMainCategory}
              onChange={(e) => {
                setSelectedMainCategory(e.target.value);
                setSelectedSubCategory("");
              }}
              className="filter-select"
            >
              <option value="">전체</option>
              {mainCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>중분류:</label>
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="filter-select"
              disabled={!selectedMainCategory}
            >
              <option value="">전체</option>
              {subCategories
                .filter(
                  (category) =>
                    !selectedMainCategory ||
                    data.some(
                      (item) =>
                        item.category_main === selectedMainCategory &&
                        item.category_sub === category
                    )
                )
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <button
              className="apply-filter-button"
              onClick={handleFilterChange}
            >
              필터 적용
            </button>
          </div>

          {selectedMoodCategory && (
            <div className="filter-group">
              <button
                className="reset-mode-button"
                onClick={resetToMoodCategory}
              >
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="charts-section">
        <div className="main-chart">
          {/* Mood Category 차트 - 항상 표시 */}
          {renderDonutChart(
            moodCategoryData,
            "Mood Category 비중",
            handleMoodCategoryClick
          )}

          {/* Mood Look 차트 - 항상 표시 */}
          {renderDonutChart(
            moodLookData,
            "Mood Look 비중",
            handleMoodLookClick
          )}
        </div>

        <div className="sub-charts">
          {renderDonutChart(
            patternData,
            "Pattern 비중",
            handlePatternClick,
            selectedMoodCategory || selectedMoodLook
          )}
          {renderDonutChart(
            colorData,
            "Color 비중",
            handleColorClick,
            selectedMoodCategory || selectedMoodLook
          )}
          {renderDonutChart(
            detail1Data,
            "Detail1 비중",
            handleDetail1Click,
            selectedMoodCategory || selectedMoodLook
          )}
        </div>
      </div>

      {/* 이미지 갤러리 섹션 */}
      {filteredImages.length > 0 && (
        <div className="image-gallery-section">
          <h3>필터링된 이미지 갤러리</h3>
          <div className="image-gallery">
            {filteredImages.map((item, index) => (
              <div key={index} className="gallery-item">
                <img
                  src={item.thumbnail_s3_url}
                  alt={`Mood: ${item.mood_category} - ${item.mood_look}`}
                  className="gallery-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div className="gallery-info">
                  <div className="gallery-mood">{item.mood_category}</div>
                  <div className="gallery-look">{item.mood_look}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Mood1Analysis;
