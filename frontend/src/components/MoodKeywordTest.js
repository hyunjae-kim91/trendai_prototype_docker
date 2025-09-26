import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "./MoodKeywordTest.css";

function MoodKeywordTest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCate1, setSelectedCate1] = useState("");
  const [selectedCate2, setSelectedCate2] = useState("");
  const [filteredKeywords, setFilteredKeywords] = useState([]);

  const fetchMoodKeywords = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiCall(API_ENDPOINTS.MOOD_KEYWORDS);
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error("무드 키워드 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodKeywords();
  }, []);

  const handleCate1Change = (e) => {
    const value = e.target.value;
    setSelectedCate1(value);
    setSelectedCate2("");
    setFilteredKeywords([]);
  };

  const handleCate2Change = (e) => {
    const value = e.target.value;
    setSelectedCate2(value);

    if (value && data?.categories?.[selectedCate1]?.[value]) {
      setFilteredKeywords(data.categories[selectedCate1][value]);
    } else {
      setFilteredKeywords([]);
    }
  };

  return (
    <div className="mood-keyword-test">
      <h2>무드 센싱 키워드 테스트</h2>

      <button
        className="test-button"
        onClick={fetchMoodKeywords}
        disabled={loading}
      >
        {loading ? "데이터 로딩 중..." : "무드 키워드 조회"}
      </button>

      {error && (
        <div className="error-message">
          <h3>❌ 오류 발생</h3>
          <p>{error}</p>
        </div>
      )}

      {data && data.success && (
        <div className="result-container">
          <div className="summary">
            <h3>✅ 데이터 조회 성공</h3>
            <p>총 {data.count}개의 키워드 데이터를 조회했습니다.</p>
          </div>

          <div className="filter-section">
            <h4>필터 선택</h4>
            <div className="filter-controls">
              <div className="filter-group">
                <label>1차 카테고리:</label>
                <select
                  value={selectedCate1}
                  onChange={handleCate1Change}
                  className="filter-select"
                >
                  <option value="">선택하세요</option>
                  {data.categories &&
                    Object.keys(data.categories).map((cate1) => (
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
                    data.categories?.[selectedCate1] &&
                    Object.keys(data.categories[selectedCate1]).map((cate2) => (
                      <option key={cate2} value={cate2}>
                        {cate2}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {filteredKeywords.length > 0 && (
            <div className="keywords-section">
              <h4>선택된 키워드 ({filteredKeywords.length}개)</h4>
              <div className="keywords-grid">
                {filteredKeywords.map((keyword, index) => (
                  <div key={index} className="keyword-tag">
                    {keyword}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="raw-data">
            <h4>원본 데이터 미리보기 (처음 10개)</h4>
            <div className="data-preview">
              {data.data.slice(0, 10).map((item, index) => (
                <div key={index} className="data-item">
                  <code>{JSON.stringify(item, null, 2)}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoodKeywordTest;
