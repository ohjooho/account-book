let kakaoScriptLoadingPromise = null;

// kakaomap script
export const loadKakaoScript = () => {
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    return Promise.resolve();
  }

  if (kakaoScriptLoadingPromise) {
    return kakaoScriptLoadingPromise;
  }

  kakaoScriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('kakao-map-sdk');

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Kakao SDK load error')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';

    const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kakao SDK load failed'));

    document.head.appendChild(script);
  });

  return kakaoScriptLoadingPromise;
};

// place로 lat, lng 가져오는 함수
export const getLocationByPlace = async (place) => {
  if (!place?.trim()) {
    return { lat: null, lng: null };
  }

  await loadKakaoScript();

  return new Promise((resolve, reject) => {
    window.kakao.maps.load(() => {
      const places = new window.kakao.maps.services.Places();

      places.keywordSearch(place, (data, status) => {
        if (
          status === window.kakao.maps.services.Status.OK &&
          Array.isArray(data) &&
          data.length > 0
        ) {
          resolve({
            lat: Number(data[0].y),
            lng: Number(data[0].x),
          });
          return;
        }

        if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          resolve({
            lat: null,
            lng: null,
          });
          return;
        }

        reject(new Error(`카카오 장소 검색 실패: ${status}`));
      });
    });
  });
};
