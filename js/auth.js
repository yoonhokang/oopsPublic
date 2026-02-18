/**
 * Authentication Helper Functions
 * 
 * Provides functions for Google Login, Logout, and UI rendering for the header.
 * Assumes firebase is initialized (firebase-config.js).
 */

/**
 * Renders the User Profile or Login Button in the header
 * @param {Object|null} user - The Firebase User object or null
 */
function renderAuthUI(user) {
    const authContainer = document.getElementById('authContainer');
    console.log("renderAuthUI called. User:", user ? user.displayName : "Guest", "Container:", authContainer);

    if (!authContainer) {
        console.error("renderAuthUI: #authContainer not found!");
        return;
    }

    if (user) {
        const photoURL = user.photoURL || 'https://via.placeholder.com/32';
        authContainer.innerHTML = `
            <div class="user-profile">
                <img src="${photoURL}" alt="Profile" class="user-avatar">
                <span class="user-name">${user.displayName}</span>
            </div>
            <button class="auth-btn" onclick="logout()">Logout</button>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="auth-btn login-btn" onclick="loginWithGoogle()">Login with Google</button>
        `;
    }
}

/**
 * Triggers Google Sign-In Popup
 */
function loginWithGoogle() {
    if (!firebase.auth) {
        console.error("Firebase Auth not initialized");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Logged in:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        });
}

/**
 * Signs out the current user
 */
function logout() {
    if (!firebase.auth) return;

    firebase.auth().signOut().then(() => {
        console.log("Logged out");
    }).catch((error) => {
        console.error("Logout failed:", error);
    });
}
