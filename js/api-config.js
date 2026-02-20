/**
 * API Configuration for OopsPublic (Hybrid Mode)
 * 
 * Includes both Firebase SDK configuration (for Auth)
 * and REST API configuration (for FirestoreDB).
 * 
 * Educational Note:
 * - firebaseConfig: Used by firebase-app.js and firebase-auth.js
 * - API_CONFIG: Used by our custom REST API calls (fetch)
 */

// 1. Firebase SDK Configuration (For Authentication)
const firebaseConfig = {
    apiKey: "AIzaSyBUsYDzUINP3NDVi1BW4GYYr0T_NigJDOg",
    authDomain: "oopspublic.firebaseapp.com",
    projectId: "oopspublic",
    storageBucket: "oopspublic.appspot.com",
    messagingSenderId: "367280733677",
    appId: "1:367280733677:web:86e4952504b28178d12836"
};

// 2. REST API Configuration (For Database Operations)
const API_CONFIG = {
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    endpoints: {
        auth: "https://identitytoolkit.googleapis.com/v1/accounts",
        firestore: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/default/documents`
    },
    // Toggle this to enable/disable on-screen debug monitor and verbose logging
    debugMode: true
};

// Export globals
window.firebaseConfig = firebaseConfig;
window.API_CONFIG = API_CONFIG;

console.log("[API Config] Loaded. Mode: Hybrid (SDK Auth + REST DB)");
