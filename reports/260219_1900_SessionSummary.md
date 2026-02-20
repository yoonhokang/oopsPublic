# Firestore Connection Debugging Session Summary

**Date:** 2026-02-19 19:00
**Topic:** 404 (Resolved) -> 403 (Pending)
**Current Status:** Blocked on **403 Permission Denied** (Data Access)

This document summarizes the entire debugging session to facilitate handoff or continued work.

## 1. Achievements (Resolved Issues)
We successfully resolved the following critical blockers:

### A. "Database Not Found" (404)
*   **Symptom:** `https://firestore.googleapis.com/.../documents` returned 404.
*   **Root Cause:** The database is located in **Seoul (`asia-northeast3`)** and named **`default` (literal)**, not `(default)`.
*   **Fix:** Updated `js/api-config.js` to use the correct regional endpoint:
    ```javascript
    firestore: `https://asia-northeast3-firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/default/documents`
    ```

### B. "API Key Application Restrictions" (Identified)
*   **Symptom:** `troubleshoot.html` Phase 1 returned `403` (or `401` which is okay for ID Tokens).
*   **Root Cause:** The auto-generated API Key had **"Application restrictions: Websites"** enabled, blocking requests from `corsproxy.io` (used by the troubleshooter) or potentially `localhost`.
*   **Action:** User changed "Application restrictions" to **"None"**.

## 2. Current Blockers (Pending Issues)

### A. "Permission Denied" (403) on Data Access
*   **Symptom:** Phase 2 (Authenticated Access) returns `403 Permission Denied`.
    ```json
    { "error": { "code": 403, "message": "Not authorized.", "status": "PERMISSION_DENIED" } }
    ```
*   **Interpretation:**
    *   The request reached the Firestore server (Network/DNS OK).
    *   The Authentication Token was valid (Identity OK).
    *   **Authorization Failed:** The server decided "You are not allowed to access this resource."

### B. Potential Causes (To Investigate Next)
1.  **Firestore Security Rules (Most Likely):**
    *   The rules might not be matching the request path `/users/${uid}`.
    *   The `request.auth.uid` check might be failing if the token UID format differs (unlikely).
    *   **Hypothesis:** The rules might be overly restrictive or the "relaxed rules" didn't propagate.
2.  **API Key Scope (IAM):**
    *   Even if "Application restrictions" are None, the "API restrictions" might still block *Cloud Firestore API*.
    *   Check: GCP Console > APIs & Services > Credentials > API Key > **API restrictions**. Ensure **Cloud Firestore API** is checked (or "Don't restrict key" is selected).
3.  **App Check:** (User confirmed unenforced, but worth a triple-check).

## 3. Recommended Next Steps

### Step 1: Verify Security Rules Propagation
Temporarily set rules to **Public (Allow All)** for 1 minute to isolate the issue.
```javascript
// DANGER: Allow anyone to read/write
allow read, write: if true;
```
If this works, the problem is 100% with the *Rules Logic*. If this *still* fails with 403, the problem is 100% with the *API Key/IAM*.

### Step 2: Check API Key "API Restrictions"
Ensure the key has permission to call the **Cloud Firestore API**.
(Sometimes "Don't restrict key" behaves oddly; explicitly restricting to "Cloud Firestore API" + "Identity Toolkit API" is safer).

### Step 3: Check IAM Roles
Ensure the project's default Service Agent has `Firestore Service Agent` role (usually automatic, rarely the issue).

## 4. Tools & Artifacts
*   `troubleshoot.html`: **The Primary Debug Tool.** Use "Start Full Matrix Scan".
    *   **Phase 2 Success (200 OK)** is the goal.
    *   Ignore Phase 1 (401) if Phase 2 succeeds.
*   `reports/260219_1845_TroubleshootGuide.md`: Interpretation guide for the tool.
