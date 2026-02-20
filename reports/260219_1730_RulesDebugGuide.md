# Firestore Security Rules Update Guide (Debugging 403)

**Goal:** Diagnose if the "Permission Denied (403)" error is caused by overly strict rules or a fundamental authentication issue.

## Step 1: Access Security Rules
1.  Go to **Firebase Console**: [https://console.firebase.google.com/project/oopspublic/firestore/rules](https://console.firebase.google.com/project/oopspublic/firestore/rules)
2.  Click the **"Rules"** tab.

## Step 2: Replace Rules with Debug Configuration
Copy and paste the following rules. This configuration **temporarily allows ANY logged-in user** to read/write all documents. This is for testing only.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // [DEBUGGING] Allow read/write for ANY logged-in user
    // This bypasses the specific user ID check temporarily.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 3: Publish & Retest
1.  Click **"Publish"** (Wait ~30 seconds).
2.  Go back to your app (`webPageByEmail`) and try **"Save to Board"** again.

### Interpreting Results:
-   **If Success:** The issue was your original rule logic (`request.auth.uid == userId`). We need to fix the specific rule path matching.
-   **If Still 403/Error:** The issue is likely with the **Authentication Token itself** (e.g., wrong project API key, mismatched Auth domain) or IAM permissions.

---
**Note:** Do not leave these rules in production for long. Once debugged, we will revert to secure rules.
