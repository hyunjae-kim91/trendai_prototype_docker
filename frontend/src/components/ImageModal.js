import React from "react";
import "./ImageModal.css";

function ImageModal({ isOpen, onClose, imageData }) {
  if (!isOpen || !imageData) return null;

  const {
    imageUrl,
    mood_category,
    mood_look,
    pattern,
    color,
    category_main,
    category_sub,
    date_posted,
    keyword, // 키워드 정보 추가
    // 의류별 상세 정보
    top_color,
    top_pattern,
    bottom_color,
    bottom_pattern,
    outer_color,
    outer_pattern,
    dress_color,
    dress_pattern,
    shoes_color,
    shoes_pattern,
    bag_color,
    bag_pattern,
    accessory_color,
    accessory_pattern,
  } = imageData;

  // 의류 카테고리별 정보를 정리하는 함수
  const getClothingDetails = () => {
    const details = [];

    // 상의 정보
    if (top_color || top_pattern) {
      details.push({
        category: "상의",
        color: top_color,
        pattern: top_pattern,
      });
    }

    // 하의 정보
    if (bottom_color || bottom_pattern) {
      details.push({
        category: "하의",
        color: bottom_color,
        pattern: bottom_pattern,
      });
    }

    // 아우터 정보
    if (outer_color || outer_pattern) {
      details.push({
        category: "아우터",
        color: outer_color,
        pattern: outer_pattern,
      });
    }

    // 원피스 정보
    if (dress_color || dress_pattern) {
      details.push({
        category: "원피스",
        color: dress_color,
        pattern: dress_pattern,
      });
    }

    // 신발 정보
    if (shoes_color || shoes_pattern) {
      details.push({
        category: "신발",
        color: shoes_color,
        pattern: shoes_pattern,
      });
    }

    // 가방 정보
    if (bag_color || bag_pattern) {
      details.push({
        category: "가방",
        color: bag_color,
        pattern: bag_pattern,
      });
    }

    // 액세서리 정보
    if (accessory_color || accessory_pattern) {
      details.push({
        category: "액세서리",
        color: accessory_color,
        pattern: accessory_pattern,
      });
    }

    return details;
  };

  const clothingDetails = getClothingDetails();

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="image-modal-body">
          <div className="image-modal-image">
            <img src={imageUrl} alt="상세 이미지" />
          </div>

          <div className="image-modal-info">
            <h3>이미지 상세 정보</h3>

            {/* 기본 정보 */}
            <div className="info-section">
              <h4>기본 정보</h4>
              <div className="info-grid">
                {keyword && (
                  <div className="info-item">
                    <span className="info-label">키워드:</span>
                    <span className="info-value">{keyword}</span>
                  </div>
                )}
                {mood_category && (
                  <div className="info-item">
                    <span className="info-label">무드 카테고리:</span>
                    <span className="info-value">{mood_category}</span>
                  </div>
                )}
                {mood_look && (
                  <div className="info-item">
                    <span className="info-label">무드 룩:</span>
                    <span className="info-value">{mood_look}</span>
                  </div>
                )}
                {pattern && (
                  <div className="info-item">
                    <span className="info-label">패턴:</span>
                    <span className="info-value">{pattern}</span>
                  </div>
                )}
                {color && (
                  <div className="info-item">
                    <span className="info-label">컬러:</span>
                    <span className="info-value">{color}</span>
                  </div>
                )}
                {category_main && (
                  <div className="info-item">
                    <span className="info-label">대분류:</span>
                    <span className="info-value">{category_main}</span>
                  </div>
                )}
                {category_sub && (
                  <div className="info-item">
                    <span className="info-label">소분류:</span>
                    <span className="info-value">{category_sub}</span>
                  </div>
                )}
                {date_posted && (
                  <div className="info-item">
                    <span className="info-label">등록일:</span>
                    <span className="info-value">
                      {new Date(date_posted).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 의류별 상세 정보 */}
            {clothingDetails.length > 0 && (
              <div className="info-section">
                <h4>의류별 상세 정보</h4>
                <div className="clothing-details">
                  {clothingDetails.map((item, index) => (
                    <div key={index} className="clothing-item">
                      <div className="clothing-category">{item.category}</div>
                      <div className="clothing-info">
                        {item.color && (
                          <div className="clothing-detail">
                            <span className="detail-label">컬러:</span>
                            <span className="detail-value">{item.color}</span>
                          </div>
                        )}
                        {item.pattern && (
                          <div className="clothing-detail">
                            <span className="detail-label">패턴:</span>
                            <span className="detail-value">{item.pattern}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageModal;
