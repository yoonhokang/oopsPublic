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
    console.log("Firebase initialized via public config.");
} else if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Cannot initialize.");
}
