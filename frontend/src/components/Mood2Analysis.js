import React, { useState, useEffect } from "react";
import API_ENDPOINTS, { apiCall } from "../config/api";
import ImageModal from "./ImageModal";
import "./Mood2Analysis.css";

function Mood2Analysis() {
  const [keywords, setKeywords] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage] = useState(20); // 페이지당 이미지 개수

  // 이미지 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);

  // 무드 센싱 필터 상태
  const [moodCategories, setMoodCategories] = useState({});
  const [selectedCate1, setSelectedCate1] = useState("");
  const [selectedCate2, setSelectedCate2] = useState("");
  const [filteredKeywords, setFilteredKeywords] = useState([]);
  const [showMoodFilter, setShowMoodFilter] = useState(false);
  const [displayKeywords, setDisplayKeywords] = useState([]);

  useEffect(() => {
    // DB 데이터를 가져와서 키워드별로 그룹화
    fetchStyleData();
    // 무드 센싱 데이터 가져오기
    fetchMoodCategories();
  }, []);

  // 무드 센싱 카테고리 데이터 가져오기
  const fetchMoodCategories = async () => {
    try {
      console.log("무드 카테고리 API 호출 시작...");
      const result = await apiCall(API_ENDPOINTS.MOOD_KEYWORDS);
      console.log("API 응답 데이터:", result);

      if (result.success) {
        setMoodCategories(result.categories);
        console.log("무드 카테고리 설정 완료:", result.categories);
      } else {
        console.error("API 응답 실패:", result.message);
      }
    } catch (error) {
      console.error("무드 카테고리 조회 오류:", error);
      console.error("오류 상세:", error.message);
    }
  };

  const fetchStyleData = async () => {
    try {
      console.log("무드 스타일 API 호출 시작...");
      const result = await apiCall(API_ENDPOINTS.MOOD_STYLE);
      console.log("API 응답 데이터:", result);

      if (result.success) {
        const keywordMap = new Map();
        let processedCount = 0;
        let errorCount = 0;

        // DB 데이터에서 키워드 추출
        result.data.forEach((item) => {
          const imageUrl = item.s3_thumbnail_key;
          const descStyle = item.desc_style;

          // desc_style에서 키워드 추출
          try {
            let keywords;

            // descStyle이 이미 배열인지 확인
            if (Array.isArray(descStyle)) {
              // 이미 배열 형태
              keywords = descStyle;
            } else if (typeof descStyle === "string") {
              // 문자열 형태인 경우
              if (descStyle.startsWith("[") && descStyle.endsWith("]")) {
                // JSON 배열 형태
                keywords = JSON.parse(descStyle);
              } else {
                // 쉼표로 구분된 문자열 형태
                keywords = descStyle.split(",").map((k) => k.trim());
              }
            } else {
              // 예상치 못한 타입
              console.warn(
                "예상치 못한 descStyle 타입:",
                typeof descStyle,
                descStyle
              );
              keywords = [];
            }

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
              console.error("키워드 파싱 오류:", e, "데이터:", descStyle);
            }
          }
        });

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
        setDisplayKeywords(sortedKeywords); // 초기에는 모든 키워드 표시
        setLoading(false);
      } else {
        console.error("API 응답 실패:", result.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("무드 스타일 데이터 로딩 오류:", error);
      setLoading(false);
    }
  };

  const handleKeywordClick = (keywordData) => {
    setSelectedKeyword(keywordData);
    setImages(keywordData.images);
    setCurrentPage(1); // 키워드 선택 시 첫 페이지로 이동
  };

  const handleDeselect = () => {
    setSelectedKeyword(null);
    setImages([]);
  };

  // 이미지 클릭 핸들러
  const handleImageClick = (imageUrl) => {
    // 이미지 URL에서 해당하는 이미지 데이터를 찾기
    const imageData = images.find((img) => img === imageUrl);
    if (imageData) {
      const modalData = {
        imageUrl: imageUrl,
        // 기본 정보는 선택된 키워드에서 가져오기 (키워드 데이터에는 기본 정보가 없으므로 빈 값으로 설정)
        mood_category: selectedKeyword?.mood_category || null,
        mood_look: selectedKeyword?.mood_look || null,
        pattern: selectedKeyword?.pattern || null,
        color: selectedKeyword?.color || null,
        category_main: selectedKeyword?.category_main || null,
        category_sub: selectedKeyword?.category_sub || null,
        date_posted: selectedKeyword?.date_posted || null,
        // 키워드 정보 추가
        keyword: selectedKeyword?.keyword || null,
      };
      setSelectedImageData(modalData);
      setIsModalOpen(true);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImageData(null);
  };

  // 무드 센싱 필터 핸들러
  const handleCate1Change = (e) => {
    const value = e.target.value;
    setSelectedCate1(value);
    setSelectedCate2("");
    setFilteredKeywords([]);
    // 1차 카테고리 변경 시 모든 키워드 표시
    setDisplayKeywords(keywords);
  };

  const handleCate2Change = (e) => {
    const value = e.target.value;
    setSelectedCate2(value);

    if (value && moodCategories[selectedCate1]?.[value]) {
      const moodKeywords = moodCategories[selectedCate1][value];
      setFilteredKeywords(moodKeywords);

      // 기존 키워드 갤러리에서 무드 키워드와 매칭되는 것들만 필터링
      filterKeywordsByMood(moodKeywords);
    } else {
      setFilteredKeywords([]);
      // 필터 해제 - 모든 키워드 표시
      setDisplayKeywords(keywords);
    }
  };

  // 무드 키워드로 기존 키워드 갤러리 필터링
  const filterKeywordsByMood = (moodKeywords) => {
    const filtered = keywords.filter((keywordData) => {
      // 무드 키워드 중 하나라도 포함되면 표시
      return moodKeywords.some(
        (moodKeyword) =>
          keywordData.keyword
            .toLowerCase()
            .includes(moodKeyword.toLowerCase()) ||
          moodKeyword.toLowerCase().includes(keywordData.keyword.toLowerCase())
      );
    });
    setDisplayKeywords(filtered);
  };

  const toggleMoodFilter = () => {
    setShowMoodFilter(!showMoodFilter);
  };

  const resetMoodFilter = () => {
    setSelectedCate1("");
    setSelectedCate2("");
    setFilteredKeywords([]);
    setDisplayKeywords(keywords); // 모든 키워드 표시
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(images.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const currentImages = images.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // 이전 페이지
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 다음 페이지
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
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
            <button className="mood-filter-toggle" onClick={toggleMoodFilter}>
              {showMoodFilter ? "필터 숨기기" : "무드 필터"}
            </button>
            <span className="count-text">
              {displayKeywords.length > 0
                ? displayKeywords.length
                : keywords.length}{" "}
              / {keywords.length}개 표시
            </span>
          </div>
        </div>

        {showMoodFilter && (
          <div className="mood-filter-section">
            <div className="mood-filter-controls">
              <div className="filter-group">
                <label>1차 카테고리:</label>
                <select
                  value={selectedCate1}
                  onChange={handleCate1Change}
                  className="filter-select"
                >
                  <option value="">선택하세요</option>
                  {Object.keys(moodCategories).map((cate1) => (
                    <option key={cate1} value={cate1}>
                      {cate1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>2차 카테고리:</label>
                <select
                  value={selectedCate2}
                  onChange={handleCate2Change}
                  className="filter-select"
                  disabled={!selectedCate1}
                >
                  <option value="">선택하세요</option>
                  {selectedCate1 &&
                    moodCategories[selectedCate1] &&
                    Object.keys(moodCategories[selectedCate1]).map((cate2) => (
                      <option key={cate2} value={cate2}>
                        {cate2}
                      </option>
                    ))}
                </select>
              </div>

              <div className="filter-group">
                <button
                  className="reset-filter-button"
                  onClick={resetMoodFilter}
                  disabled={!selectedCate1 && !selectedCate2}
                >
                  필터 초기화
                </button>
              </div>
            </div>

            {filteredKeywords.length > 0 && (
              <div className="mood-keywords-preview">
                <h5>선택된 무드 키워드 ({filteredKeywords.length}개)</h5>
                <div className="mood-keywords-grid">
                  {filteredKeywords.map((keyword, index) => (
                    <div key={index} className="mood-keyword-tag">
                      {keyword}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="keywords-grid">
          {(displayKeywords.length > 0 ? displayKeywords : keywords).map(
            (keywordData, index) => (
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
            )
          )}
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
            {currentImages.map((imageUrl, index) => (
              <div
                key={startIndex + index}
                className="image-item"
                onClick={() => handleImageClick(imageUrl)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={imageUrl}
                  alt={`${selectedKeyword.keyword} 이미지 ${
                    startIndex + index + 1
                  }`}
                  onLoad={(e) => {
                    // 이미지 로딩 성공 시 부모 요소에 성공 클래스 추가
                    e.target.parentElement.classList.add("image-loaded");
                  }}
                  onError={(e) => {
                    // 이미지 로딩 실패 시 부모 요소에 실패 클래스 추가
                    e.target.parentElement.classList.add("image-error");
                    // 실패한 이미지는 숨기거나 placeholder 표시
                    e.target.style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>

          {/* 페이지네이션 UI */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                <span>
                  {startIndex + 1}-{Math.min(endIndex, images.length)} /{" "}
                  {images.length}개 이미지
                </span>
                <span className="page-info">
                  페이지 {currentPage} / {totalPages}
                </span>
              </div>

              <div className="pagination-controls">
                <button
                  className="pagination-btn prev-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  이전
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNumber) => {
                      // 페이지 번호 표시 로직 (최대 5개 페이지 번호만 표시)
                      const showPage =
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 2 &&
                          pageNumber <= currentPage + 2);

                      if (!showPage) {
                        // 생략된 페이지들 사이에 "..." 표시
                        if (
                          pageNumber === currentPage - 3 ||
                          pageNumber === currentPage + 3
                        ) {
                          return (
                            <span key={pageNumber} className="page-ellipsis">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNumber}
                          className={`page-number ${
                            currentPage === pageNumber ? "active" : ""
                          }`}
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  className="pagination-btn next-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  다음
                </button>
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

export default Mood2Analysis;
