/**
 * Firebase Configuration
 * 
 * Shared configuration for all Firebase services in the project.
 * Ensure Firebase SDK is loaded before importing this file if using as a module,
 * or just load this file after the SDK script tags.
 */

const firebaseConfig = {
    apiKey: "AIzaSyBUsYDzUINP3NDVi1BW4GYYr0T_NigJDOg",
    authDomain: "oopspublic.firebaseapp.com",
    projectId: "oopspublic",
    storageBucket: "oopspublic.firebasestorage.app",
    messagingSenderId: "285342720346",
    appId: "1:285342720346:web:df70f4ce6b04cfb7475363",
    measurementId: "G-H029GDC8SK"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);

    // Firestore Client SDK initialization REMOVED (Datastore Mode).
    // Application uses REST API for data access.
} else if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Cannot initialize.");
}

// Build Version Display
const BUILD_INFO = {
    version: "v1.0.28",
    date: "2026-02-18 23:50 KST"
};

if (typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const verDiv = document.createElement('div');
        verDiv.id = 'buildVersionDisplay';
        verDiv.style.position = "fixed";
        verDiv.style.bottom = "5px";
        verDiv.style.right = "10px";
        verDiv.style.color = "rgba(255, 255, 255, 0.4)";
        verDiv.style.fontSize = "11px";
        verDiv.style.zIndex = "9999";
        verDiv.style.pointerEvents = "none";
        verDiv.style.fontFamily = "monospace";
        verDiv.textContent = `Build: ${BUILD_INFO.version} (${BUILD_INFO.date})`;
        document.body.appendChild(verDiv);
        console.log(`Build Version: ${BUILD_INFO.version} (${BUILD_INFO.date})`);
    });
}
