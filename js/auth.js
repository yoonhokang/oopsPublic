/**
 * ============================================================
 * 인증(Authentication) 모듈 (auth.js)
 * ============================================================
 *
 * 【이 파일의 역할】
 * Google 계정으로 로그인/로그아웃하는 기능을 담당합니다.
 * 로그인 상태에 따라 화면에 사용자 프로필이나 로그인 버튼을 표시합니다.
 *
 * 【의존성 (이 파일보다 먼저 로드해야 하는 파일들)】
 * - firebase-app.js    : Firebase 코어 라이브러리
 * - firebase-auth.js   : Firebase 인증 라이브러리
 * - api-config.js      : firebaseConfig 설정값
 *
 * 【IIFE 패턴 설명】
 * 이 파일 전체가 (function() { ... })() 으로 감싸져 있습니다.
 * 이를 IIFE(즉시 실행 함수 표현식)라고 합니다.
 * 목적: 내부에서 선언한 변수/함수가 전역 공간을 오염시키지 않도록 보호합니다.
 * 외부에서 사용해야 하는 함수만 window.xxx = xxx 형태로 명시적으로 내보냅니다.
 *
 * 【데이터 흐름】
 *   1. 사용자가 "Sign in with Google" 버튼 클릭
 *   2. loginWithGoogle() → Firebase SDK가 구글 로그인 팝업 표시
 *   3. 로그인 성공 → Firebase가 onAuthStateChanged 콜백 호출
 *   4. renderAuthUI(user) → 화면에 프로필 표시
 *   5. 다른 페이지에서 getAuthIdToken()으로 인증 토큰 획득
 *   6. 토큰을 REST API 요청의 Authorization 헤더에 포함하여 Firestore 접근
 */

(function () {
    "use strict";

    // ─── Firebase SDK 초기화 ─────────────────────────────
    // firebase 객체가 이미 존재하고, 아직 앱이 초기화되지 않았으면 초기화 실행
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        if (typeof firebaseConfig !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            console.log("[Auth] Firebase SDK 초기화 완료");
        } else {
            console.error("[Auth] firebaseConfig이 없습니다! api-config.js가 먼저 로드되었는지 확인하세요.");
        }
    } else {
        console.log("[Auth] Firebase SDK 이미 초기화됨");
    }

    // ※ Firestore Client SDK는 사용하지 않음 (Datastore 모드에서는 SDK 직접 사용 불가)
    //   대신 REST API(fetch 함수)로 데이터베이스에 접근합니다.

    // ─── 로그인 함수 ─────────────────────────────────────
    /**
     * Google 계정으로 로그인 (팝업 방식)
     * Firebase SDK의 signInWithPopup()을 사용합니다.
     * 로그인 성공 시 onAuthStateChanged가 자동으로 호출되어 UI가 갱신됩니다.
     */
    function loginWithGoogle() {
        // GoogleAuthProvider: 구글 로그인 제공자 생성
        const provider = new firebase.auth.GoogleAuthProvider();

        // signInWithPopup: 새 창(팝업)에서 구글 로그인 진행
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                console.log("[Auth] 구글 로그인 성공:", result.user.email);
                // ↑ 여기서는 별도 처리 불필요 — onAuthStateChanged가 자동으로 UI 업데이트
            })
            .catch((error) => {
                console.error("[Auth] 로그인 실패:", error);
                alert(`로그인 실패: ${error.message}`);
            });
    }

    // ─── 로그아웃 함수 ───────────────────────────────────
    /**
     * 현재 로그인된 계정에서 로그아웃합니다.
     * 로그아웃 후 페이지를 새로고침하여 초기 상태로 되돌립니다.
     */
    function logout() {
        firebase.auth().signOut()
            .then(() => {
                console.log("[Auth] 로그아웃 완료");
                window.location.reload(); // 페이지 새로고침
            })
            .catch((error) => {
                console.error("[Auth] 로그아웃 오류:", error);
            });
    }

    // ─── 인증 토큰 획득 함수 ─────────────────────────────
    /**
     * 현재 로그인한 사용자의 ID 토큰을 반환합니다.
     *
     * 【ID 토큰이란?】
     * Firebase가 발급하는 일종의 "출입증"입니다.
     * REST API로 Firestore에 데이터를 요청할 때,
     * HTTP 헤더에 이 토큰을 포함시켜야 "나는 로그인한 사용자"임을 증명할 수 있습니다.
     *
     * 사용 예시:
     *   const token = await window.getAuthIdToken();
     *   fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
     *
     * @returns {Promise<string|null>} 토큰 문자열 또는 null(미로그인)
     */
    async function getAuthIdToken() {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const token = await user.getIdToken(false);
                return token;
            } catch (e) {
                console.error("[Auth] 토큰 획득 오류:", e);
                return null;
            }
        }
        return null; // 로그인되어 있지 않으면 null 반환
    }

    // ─── 인증 UI 렌더링 ─────────────────────────────────
    /**
     * 로그인 상태에 따라 인증 UI를 화면에 그립니다.
     *
     * - 로그인 상태: 프로필 사진 + 이름 + 로그아웃 버튼 표시
     * - 미로그인 상태: "Sign in with Google" 버튼 표시
     *
     * 【보안 노트 — XSS 방어】
     * user.displayName은 사용자가 자유롭게 수정 가능한 값이므로,
     * innerHTML에 직접 삽입하면 XSS(스크립트 주입) 공격이 가능합니다.
     * 따라서 DOM API(createElement + textContent)를 사용하여 안전하게 삽입합니다.
     *
     * @param {Object|null} user - Firebase 사용자 객체 (미로그인 시 null)
     */
    function renderAuthUI(user) {
        const authContainer = document.getElementById('authContainer');
        if (!authContainer) return;

        // 기존 내용 초기화
        authContainer.innerHTML = '';

        if (user) {
            // ── 로그인 상태: 프로필 표시 ──
            const profileDiv = document.createElement('div');
            profileDiv.className = 'user-profile';
            profileDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';

            // 프로필 사진
            const avatar = document.createElement('img');
            avatar.className = 'user-avatar';
            avatar.style.cssText = 'width: 32px; height: 32px; border-radius: 50%;';
            avatar.alt = 'Profile';
            avatar.src = user.photoURL || '';

            // 사용자 이름 (textContent로 안전하게 삽입)
            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-name';
            nameSpan.style.cssText = 'color: white; font-weight: bold;';
            nameSpan.textContent = user.displayName || '';

            profileDiv.appendChild(avatar);
            profileDiv.appendChild(nameSpan);
            authContainer.appendChild(profileDiv);

            // 로그아웃 버튼
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'auth-btn';
            logoutBtn.id = 'logoutBtn';
            logoutBtn.style.cssText = 'margin-left: 10px; padding: 5px 15px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 6px;';
            logoutBtn.textContent = 'Logout';
            logoutBtn.addEventListener('click', logout);
            authContainer.appendChild(logoutBtn);
        } else {
            // ── 미로그인 상태: 로그인 버튼 표시 ──
            const loginBtn = document.createElement('button');
            loginBtn.className = 'auth-btn login-btn';
            loginBtn.id = 'loginBtn';
            loginBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; background: white; color: #444; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px;';

            // 구글 아이콘 (SVG를 data URI로 인라인 삽입)
            const googleIcon = document.createElement('img');
            googleIcon.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3Cpath fill='none' d='M0 0h48v48H0z'/%3E%3C/svg%3E";
            googleIcon.width = 18;
            googleIcon.height = 18;
            googleIcon.alt = 'G';

            loginBtn.appendChild(googleIcon);
            loginBtn.appendChild(document.createTextNode('Sign in with Google'));
            loginBtn.addEventListener('click', loginWithGoogle);
            authContainer.appendChild(loginBtn);
        }
    }

    // ─── 인증 상태 변화 감지 ─────────────────────────────
    /**
     * 인증 상태가 바뀔 때(로그인/로그아웃) 실행할 콜백을 등록합니다.
     *
     * 【onAuthStateChanged란?】
     * Firebase SDK가 제공하는 "이벤트 리스너"입니다.
     * 사용자가 로그인하거나 로그아웃하면 자동으로 콜백 함수가 호출됩니다.
     *
     * @param {Function} callback - user 객체를 받는 콜백 함수
     */
    function registerAuthListener(callback) {
        firebase.auth().onAuthStateChanged((user) => {
            renderAuthUI(user);          // 인증 UI 갱신
            if (callback) callback(user); // 페이지별 추가 처리 실행
        });
    }

    // ─── 자동 초기화 ─────────────────────────────────────
    // HTML에 id="authContainer" 요소가 있으면 자동으로 인증 리스너 등록
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('authContainer')) {
                registerAuthListener();
            }
        });
    }

    // ─── 외부 공개 API ───────────────────────────────────
    // IIFE 내부의 함수 중 다른 파일에서 필요한 것만 window에 등록
    // loginWithGoogle, logout은 이 파일 내부에서만 사용 (버튼 이벤트로 연결)
    window.getAuthIdToken = getAuthIdToken;       // REST API 호출 시 토큰 획득용
    window.registerAuthListener = registerAuthListener; // 페이지별 인증 상태 감지용

})();
