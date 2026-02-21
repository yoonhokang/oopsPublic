/**
 * ============================================================
 * API 설정 파일 (api-config.js)
 * ============================================================
 *
 * 【이 파일의 역할】
 * 프로젝트 전체에서 사용하는 설정값을 한 곳에 모아둔 "설정 파일"입니다.
 * 다른 JS 파일들은 이 파일에서 정의한 값을 window.API_CONFIG로 참조합니다.
 *
 * 【Firebase란?】
 * Google이 제공하는 서버리스(Serverless) 플랫폼입니다.
 * 서버를 직접 만들지 않고도 인증(로그인), 데이터베이스, 호스팅을 사용할 수 있습니다.
 *
 * 【이 프로젝트의 구조: 하이브리드(Hybrid) 모드】
 * - 인증(로그인): Firebase SDK를 사용 (구글 팝업 로그인)
 * - 데이터베이스: Firestore REST API를 사용 (fetch로 HTTP 요청)
 *   → Firestore가 "Datastore 모드"로 설정되어 있어 SDK 직접 사용이 불가능하므로,
 *     대신 REST API(HTTP 요청)로 데이터를 읽고 씁니다.
 *
 * 【스크립트 로드 순서】
 * index.html에서 이 파일이 가장 먼저 로드되어야 합니다:
 *   1. api-config.js  ← (이 파일) 설정값 정의
 *   2. debug-monitor.js ← 로깅 시스템
 *   3. auth.js          ← 인증 로직 (이 파일의 설정값 사용)
 */

// ─── 1. Firebase SDK 설정 (인증 전용) ────────────────────
// Firebase 콘솔(https://console.firebase.google.com)에서
// 프로젝트 생성 시 자동으로 발급받는 값들입니다.
// ⚠️ apiKey는 "비밀번호"가 아닙니다!
//    브라우저에서 Firebase 서비스를 식별하기 위한 "주소"에 가깝습니다.
//    실제 보안은 Firestore Rules + 인증 토큰으로 처리합니다.
const firebaseConfig = {
    apiKey: "AIzaSyBUsYDzUINP3NDVi1BW4GYYr0T_NigJDOg",
    authDomain: "oopspublic.firebaseapp.com",  // 로그인 팝업이 열리는 도메인
    projectId: "oopspublic",                    // Firebase 프로젝트 고유 ID
    storageBucket: "oopspublic.appspot.com",    // 파일 저장소 (이 프로젝트에서는 미사용)
    messagingSenderId: "367280733677",          // 푸시 알림용 (미사용)
    appId: "1:367280733677:web:86e4952504b28178d12836"
};

// ─── 2. REST API 설정 (데이터베이스 전용) ────────────────
// Firestore REST API의 엔드포인트(URL) 주소를 구성합니다.
// fetch() 함수로 이 URL에 요청을 보내 데이터를 CRUD합니다.
const API_CONFIG = {
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    endpoints: {
        // 인증 API (사용자 정보 조회용)
        auth: "https://identitytoolkit.googleapis.com/v1/accounts",
        // Firestore REST API (데이터 읽기/쓰기)
        // 형식: .../projects/{프로젝트ID}/databases/default/documents
        firestore: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/default/documents`
    },
    // 디버그 모드: true면 화면에 디버그 패널이 표시됨
    // 배포(프로덕션) 환경에서는 반드시 false로 설정
    debugMode: false
};

// ─── 3. 전역(window) 객체에 등록 ────────────────────────
// 다른 JS 파일에서 window.API_CONFIG, window.firebaseConfig으로 접근 가능
window.firebaseConfig = firebaseConfig;
window.API_CONFIG = API_CONFIG;

console.log("[API Config] 로드 완료. 모드: 하이브리드 (SDK 인증 + REST DB)");
