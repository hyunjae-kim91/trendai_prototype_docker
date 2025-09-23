import React, { useState, useEffect } from "react";
import "./DBTest.css";

function DBTest() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testDBConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:8001/api/test-db");
      const data = await response.json();

      setResult(data);
    } catch (err) {
      setError(err.message);
      console.error("DB 테스트 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-test">
      <h2>DB 연결 테스트</h2>

      <button
        className="test-button"
        onClick={testDBConnection}
        disabled={loading}
      >
        {loading ? "테스트 중..." : "DB 연결 테스트"}
      </button>

      {error && (
        <div className="error-message">
          <h3>❌ 오류 발생</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="result-message">
          <h3>{result.success ? "✅ 성공" : "❌ 실패"}</h3>
          {result.success ? (
            <div>
              <p>
                <strong>{result.message}</strong>
              </p>
              <p>조회된 데이터 수: {result.count}개</p>
              <div className="data-preview">
                <h4>데이터 미리보기:</h4>
                {result.data.map((item, index) => (
                  <div key={index} className="data-item">
                    <code>{JSON.stringify(item, null, 2)}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p>
                <strong>{result.message}</strong>
              </p>
              <p>오류 상세: {result.error}</p>
              {result.config && (
                <div className="config-info">
                  <h4>DB 설정 정보:</h4>
                  <code>{JSON.stringify(result.config, null, 2)}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DBTest;
