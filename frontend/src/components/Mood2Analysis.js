import React, { useState, useEffect } from "react";
import "./Mood2Analysis.css";

function Mood2Analysis() {
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CSV 데이터를 파싱하여 키워드별로 그룹화
    parseCSVData();
  }, []);

  const parseCSVData = async () => {
    try {
      const response = await fetch("/data/temp_style.csv");
      const csvText = await response.text();
      const lines = csvText.split("\n");

      console.log("총 라인 수:", lines.length);
      console.log("첫 번째 라인:", lines[0]);
      console.log("두 번째 라인:", lines[1]);

      const keywordMap = new Map();
      let processedCount = 0;
      let errorCount = 0;

      // 헤더 제외하고 데이터 처리
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 더 강력한 CSV 파싱 - 쉼표로 분리하되 따옴표 안의 쉼표는 무시
        const parts = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              // 이스케이프된 따옴표
              current += '"';
              j++; // 다음 따옴표 건너뛰기
            } else {
              // 따옴표 시작/끝
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            // 쉼표로 분리
            parts.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        parts.push(current); // 마지막 부분 추가

        if (parts.length >= 2) {
          const imageUrl = parts[0];
          const descStyle = parts[1];

          // desc_style에서 키워드 추출
          try {
            const keywords = JSON.parse(descStyle);
            if (Array.isArray(keywords)) {
              keywords.forEach((keyword) => {
                if (typeof keyword === "string" && keyword.trim()) {
                  if (!keywordMap.has(keyword)) {
                    keywordMap.set(keyword, []);
                  }
                  keywordMap.get(keyword).push(imageUrl);
                }
              });
              processedCount++;
            }
          } catch (e) {
            errorCount++;
            if (errorCount <= 5) {
              // 처음 5개 오류만 로그
              console.error("JSON 파싱 오류:", e, "데이터:", descStyle);
            }
          }
        }
      }

      console.log("처리된 라인 수:", processedCount);
      console.log("오류 수:", errorCount);
      console.log("추출된 키워드 수:", keywordMap.size);

      // 키워드를 빈도수 순으로 정렬
      const sortedKeywords = Array.from(keywordMap.entries())
        .map(([keyword, images]) => ({
          keyword,
          count: images.length,
          images,
        }))
        .sort((a, b) => b.count - a.count);

      console.log("정렬된 키워드 수:", sortedKeywords.length);
      if (sortedKeywords.length > 0) {
        console.log("상위 5개 키워드:", sortedKeywords.slice(0, 5));
      }

      setKeywords(sortedKeywords);
      setLoading(false);
    } catch (error) {
      console.error("CSV 데이터 로딩 오류:", error);
      setLoading(false);
    }
  };

  const handleKeywordClick = (keywordData) => {
    setSelectedKeyword(keywordData);
    setImages(keywordData.images);
  };

  const handleDeselect = () => {
    setSelectedKeyword(null);
    setImages([]);
  };

  if (loading) {
    return (
      <div className="mood2-analysis">
        <div className="loading">데이터를 로딩중입니다...</div>
      </div>
    );
  }

  return (
    <div className="mood2-analysis">
      <div className="analysis-header">
        <h2>스타일 키워드 갤러리</h2>
        <p>키워드를 클릭하여 관련 이미지를 확인하세요</p>
      </div>

      <div className="keywords-section">
        <div className="keywords-header">
          <h3>전체 키워드 목록</h3>
          <div className="keywords-info">
            <span className="filter-text">필터</span>
            <span className="count-text">
              {keywords.length} / {keywords.length}개 표시
            </span>
          </div>
        </div>

        <div className="keywords-grid">
          {keywords.map((keywordData, index) => (
            <div
              key={keywordData.keyword}
              className={`keyword-item ${
                selectedKeyword?.keyword === keywordData.keyword
                  ? "selected"
                  : ""
              }`}
              onClick={() => handleKeywordClick(keywordData)}
            >
              <span className="keyword-text">{keywordData.keyword}</span>
              <span className="keyword-count">{keywordData.count}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedKeyword && (
        <div className="gallery-section">
          <div className="gallery-header">
            <h3>
              "{selectedKeyword.keyword}" 키워드 이미지 ({selectedKeyword.count}
              개)
            </h3>
            <button className="deselect-button" onClick={handleDeselect}>
              X 선택 해제
            </button>
          </div>

          <div className="images-grid">
            {images.map((imageUrl, index) => (
              <div key={index} className="image-item">
                <img
                  src={imageUrl}
                  alt={`${selectedKeyword.keyword} 이미지 ${index + 1}`}
                  onError={(e) => {
                    // 이미지 로딩 실패 시 예시 이미지로 대체
                    e.target.src = `https://via.placeholder.com/300x300/667eea/ffffff?text=Image+${
                      index + 1
                    }`;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Mood2Analysis;
