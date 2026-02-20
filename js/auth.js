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

        if (user) {
            authContainer.innerHTML = `
                <div class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${user.photoURL}" alt="Profile" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                    <span class="user-name" style="color: white; font-weight: bold;">${user.displayName}</span>
                </div>
                <button class="auth-btn" id="logoutBtn" style="margin-left: 10px; padding: 5px 15px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 6px;">Logout</button>
            `;
            // Add event listener programmatically to avoid inline 'onclick' issues in strict/CSP environments
            document.getElementById('logoutBtn').addEventListener('click', logout);
        } else {
            // Show Google Login Button
            authContainer.innerHTML = `
                <button class="auth-btn login-btn" id="loginBtn" 
                    style="padding: 8px 16px; cursor: pointer; background: white; color: #444; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    <img src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3Cpath fill='none' d='M0 0h48v48H0z'/%3E%3C/svg%3E" width="18" height="18" alt="G">
                    Sign in with Google
                </button>
            `;
            document.getElementById('loginBtn').addEventListener('click', loginWithGoogle);
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

    // Export functions globally
    window.loginWithGoogle = loginWithGoogle;
    window.logout = logout;
    window.getAuthIdToken = getAuthIdToken;
    window.registerAuthListener = registerAuthListener;

})();
