# Cache Busting Implementation Plan

## Goal
To prevent users from loading outdated JavaScript or CSS files after a deployment.

## Strategy
Append a `?v={timestamp}` or `?v={version}` query parameter to all local script and style resources in HTML files.

## Affected Files
1.  `c:\work\git\oopsPublic\index.html`
2.  `c:\work\git\oopsPublic\webPageByEmail\index.html`
3.  `c:\work\git\oopsPublic\generatePassWd\index.html`
4.  `c:\work\git\oopsPublic\troubleshoot.html`

## Versioning Scheme
-   Use a consistent version string (e.g., `v=260220_1320`) across all files to easily manage updates.
-   Target resources: `style.css`, `script.js`, `js/*.js`.

## Action Items
-   [ ] **Update HTML:** Add `?v=...` to `href` and `src` attributes for local assets.
-   [ ] **Verify:** Ensure files still load correctly (no 404s due to bad paths).
