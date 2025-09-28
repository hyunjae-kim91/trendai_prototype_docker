// API 설정
const RAW_API_BASE_URL = process.env.REACT_APP_API_URL;
const DEFAULT_API_BASE = '/api';

const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined';

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) {
    return DEFAULT_API_BASE;
  }

  if (baseUrl.startsWith('/')) {
    return baseUrl.replace(/\/$/, '');
  }

  try {
    const parsed = new URL(baseUrl);

    if (
      isBrowser &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      console.warn('Detected remote client with localhost API base. Falling back to relative /api');
      return DEFAULT_API_BASE;
    }

    const pathname = parsed.pathname.replace(/\/$/, '');
    return `${parsed.origin}${pathname}`;
  } catch (error) {
    console.warn('Invalid REACT_APP_API_URL value. Falling back to relative /api', error);
    return DEFAULT_API_BASE;
  }
};

const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);

export const API_ENDPOINTS = {
  // 헬스체크
  HEALTH: `${API_BASE_URL}/health`,
  
  // DB 테스트
  DB_TEST: `${API_BASE_URL}/test-db`,
  
  // 무드 센싱
  MOOD_KEYWORDS: `${API_BASE_URL}/mood-keywords`,
  MOOD_RATE: `${API_BASE_URL}/mood-rate`,
  MOOD_STYLE: `${API_BASE_URL}/mood-style`,
  
  // 아이템 센싱
  ITEM_COLOR: `${API_BASE_URL}/item-color`,
  ITEM_PATTERN: `${API_BASE_URL}/item-pattern`,
  ITEM_DETAIL: `${API_BASE_URL}/item-detail`,
  ITEM_TYPE_CATEGORIES: `${API_BASE_URL}/item-type-categories`,
  ITEM_TYPE_META: `${API_BASE_URL}/item-type-meta`,
  ITEM_TYPE_KEYWORDS: `${API_BASE_URL}/item-type-keywords`,
  ITEM_TYPE_ITEMS: `${API_BASE_URL}/item-type-items`,
  
  // 코디 조합
  COORDI_COMBINATION: `${API_BASE_URL}/coordi-combination`,
  COORDI_IMAGES: `${API_BASE_URL}/coordi-images`,
  
  // 이미지 조회
  COLOR_IMAGES: `${API_BASE_URL}/color-images`,
  PATTERN_IMAGES: `${API_BASE_URL}/pattern-images`,
  DETAIL_IMAGES: `${API_BASE_URL}/detail-images`,
};

// API 호출 헬퍼 함수
export const apiCall = async (endpoint, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
};

export default API_ENDPOINTS;
