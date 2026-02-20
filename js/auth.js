/**
 * Authentication Wrapper (Hybrid Mode)
 * 
 * Uses Firebase SDK for robust Authentication (Google Popup).
 * Provides helper functions to get ID Token for REST API calls.
 * 
 * Dependencies:
 * - firebase-app.js
 * - firebase-auth.js
 * - js/api-config.js (firebaseConfig)
 */

(function () {
    "use strict";

    // Initialize Firebase SDK
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        if (typeof firebaseConfig !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            console.log("[Auth] Firebase SDK Initialized");
        } else {
            console.error("[Auth] firebaseConfig is missing!");
        }
    } else {
        console.log("[Auth] Firebase SDK already initialized");
    }

    // Initialize Firestore if available (Safety Check)
    // REMOVED: Firestore Client SDK not supported in Datastore Mode.
    // Using REST API instead.

    /**
     * Sign In with Google (Popup)
     */
    function loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();

        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                console.log("[Auth] Google Login Success:", result.user.email);
                // UI updates automatically via onAuthStateChanged
            })
            .catch((error) => {
                console.error("[Auth] Login Failed:", error);
                alert(`Login Failed: ${error.message}`);
            });
    }

    /**
     * Sign Out
     */
    function logout() {
        firebase.auth().signOut()
            .then(() => {
                console.log("[Auth] Logged out.");
                window.location.reload();
            })
            .catch((error) => {
                console.error("[Auth] Logout Error:", error);
            });
    }

    /**
     * Get Current User's ID Token (For REST API)
     * Returns a Promise that resolves to the token string, or null if not logged in.
     */
    async function getAuthIdToken() {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                // true forces refresh if token is expired
                const token = await user.getIdToken(false);
                return token;
            } catch (e) {
                console.error("[Auth] Error getting token:", e);
                return null;
            }
        }
        return null;
    }

    /**
     * Renders the Auth UI (User Profile or Google Login Button)
     */
    function renderAuthUI(user) {
        const authContainer = document.getElementById('authContainer');
        if (!authContainer) return;

        // [SEC-01] 기존 내용 제거 (innerHTML 직접 삽입 대신 DOM API 사용 — XSS 방어)
        authContainer.innerHTML = '';

        if (user) {
            const profileDiv = document.createElement('div');
            profileDiv.className = 'user-profile';
            profileDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';

            const avatar = document.createElement('img');
            avatar.className = 'user-avatar';
            avatar.style.cssText = 'width: 32px; height: 32px; border-radius: 50%;';
            avatar.alt = 'Profile';
            // photoURL은 Firebase가 반환하는 값이라 비교적 안전하지만,
            // 원본 도메인만 허용 (CSP img-src에서 제어 가능)
            avatar.src = user.photoURL || '';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-name';
            nameSpan.style.cssText = 'color: white; font-weight: bold;';
            // [SEC-01] textContent 사용 — HTML 인젝션 불가
            nameSpan.textContent = user.displayName || '';

            profileDiv.appendChild(avatar);
            profileDiv.appendChild(nameSpan);
            authContainer.appendChild(profileDiv);

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'auth-btn';
            logoutBtn.id = 'logoutBtn';
            logoutBtn.style.cssText = 'margin-left: 10px; padding: 5px 15px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 6px;';
            logoutBtn.textContent = 'Logout';
            logoutBtn.addEventListener('click', logout);
            authContainer.appendChild(logoutBtn);
        } else {
            // Show Google Login Button
            const loginBtn = document.createElement('button');
            loginBtn.className = 'auth-btn login-btn';
            loginBtn.id = 'loginBtn';
            loginBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; background: white; color: #444; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px;';

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

    /**
     * Register Auth State Listener
     * Should be called by pages to init UI updates.
     */
    function registerAuthListener(callback) {
        firebase.auth().onAuthStateChanged((user) => {
            renderAuthUI(user);
            if (callback) callback(user);
        });
    }

    // Auto-register generic UI listener if we are on a page with #authContainer
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('authContainer')) {
                registerAuthListener();
            }
        });
    }

    // [MAINT-02] loginWithGoogle, logout은 내부에서만 사용 (renderAuthUI내 addEventListener)
    // 외부 모듈에서 호출하는 함수만 전역 노출
    window.getAuthIdToken = getAuthIdToken;
    window.registerAuthListener = registerAuthListener;

})();
