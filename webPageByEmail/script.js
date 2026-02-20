// Hybrid Auth Migration: SDK Authentication + REST DB
// - Authentication: Managed by Firebase SDK (firebase-auth.js)
// - Database: Managed by REST API calls using ID Token from SDK

// Global instances from auth.js and api-config.js
// getAuthIdToken: Helper to get current user's ID token
// firebase: SDK Global
// Logger: Global Logger from debug-monitor.js (if debugMode)

(function () {
    "use strict";

    const isDebug = (window.API_CONFIG && window.API_CONFIG.debugMode) || false;

    // Auth Guard & UI
    // 인증 상태 변화 감지 리스너 등록 (SDK)
    if (window.registerAuthListener) {
        window.registerAuthListener(user => {
            if (window.Logger && isDebug) window.Logger.info(`AuthStateChanged: ${user ? user.email : "No User"}`);
            else console.log("AuthStateChanged:", user ? user.email : "No User");

            // renderAuthUI is handled inside registerAuthListener automatically.
            if (!user) {
                // Strict Auth Redirect
                // 로그인하지 않은 경우 메인으로 강제 이동
                window.location.replace("../index.html");
            } else {
                // 로그인한 경우 포스트 목록 로드
                loadPosts();
            }
        });
    } else {
        console.error("registerAuthListener not found. Check auth.js loading.");
    }

    const statusArea = document.getElementById('statusArea');
    const sendBtn = document.getElementById('sendBtn');
    const urlInput = document.getElementById('urlInput');
    const debugConsole = document.getElementById('debugConsole');

    // [User Request] Debug Console should always be visible
    // Removed: Conditional hiding based on isDebug

    // Removed: Manual Toggle function

    /**
     * Logs messages to the on-screen debug console and browser console.
     * @param {string} message - The message to log.
     * @param {string} [type='info'] - The type of log ('info', 'error', 'success', 'warn').
     */
    function log(message, type = 'info') {
        // 1. Log to Global Logger (which handles on-screen panel & console)
        if (window.Logger) {
            if (type === 'error') window.Logger.error(message);
            else if (type === 'success') window.Logger.success(message);
            else window.Logger.info(message);
        } else {
            console.log(`[${type}] ${message}`);
        }

        // 2. Log to Embedded Console (Always, as requested)
        if (debugConsole) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            const time = new Date().toLocaleTimeString([], { hour12: false });
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            debugConsole.appendChild(entry);
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
    }

    /**
     * Displays a status message to the user given a message string and type.
     * @param {string} message - The message to display.
     * @param {string} [type='info'] - The type of message ('info', 'error', 'success').
     */
    function showStatus(message, type = 'info') {
        statusArea.style.display = 'block';
        statusArea.innerHTML = message;
        statusArea.className = 'status-message';
        if (type === 'success') statusArea.classList.add('status-success');
        if (type === 'error') statusArea.classList.add('status-error');
    }

    /**
     * Toggles the loading state of the UI buttons.
     * @param {boolean} isLoading - Whether the app is currently processing a task.
     */
    function setLoading(isLoading) {
        if (isLoading) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<div class="loading-spinner"></div><span>Processing...</span>';
        } else {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>Capture & Email</span>';
        }
    }

    // [HTML Cleaning Logic - Unchanged]
    /**
     * Cleans and prepares HTML content for email transmission.
     * Removes scripts, styles, and unsafe attributes. Resolves relative URLs.
     * @param {string} htmlString - The raw HTML content.
     * @param {string} baseUrl - The base URL for resolving relative links.
     * @returns {Promise<string>} The cleaned HTML string.
     */
    async function cleanHtml(htmlString, baseUrl) {
        log("State: Parsing HTML...", 'info');
        await new Promise(r => setTimeout(r, 10));

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        if (!doc.head && !doc.body) {
            log("Warning: Empty document parsed.", 'warn');
            return htmlString;
        }

        log("State: Adjusting Base URL...", 'info');
        const base = document.createElement('base');
        base.href = baseUrl;
        if (doc.head) doc.head.appendChild(base);
        else doc.body.insertBefore(base, doc.body.firstChild);

        log("State: Removing scripts...", 'info');
        const elementsToRemove = doc.querySelectorAll('script, iframe, object, embed, form, button, nav, footer, style, link[rel="stylesheet"]');
        elementsToRemove.forEach(el => el.remove());

        log("State: Security Hardening (Attributes)...", 'info');
        await new Promise(r => setTimeout(r, 10));

        const allElements = doc.querySelectorAll('*');
        for (let j = 0; j < allElements.length; j++) {
            const el = allElements[j];
            if (el.attributes) {
                for (let i = el.attributes.length - 1; i >= 0; i--) {
                    const attr = el.attributes[i];
                    if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
                }
            }
            if (el.hasAttribute('href') && el.getAttribute('href').trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('href');
            if (el.hasAttribute('src') && el.getAttribute('src').trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('src');

            if (j % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }

        log("State: Resolving URLs...", 'info');
        doc.querySelectorAll('img').forEach(img => {
            try { img.src = new URL(img.getAttribute('src'), baseUrl).href; } catch (e) { }
        });
        doc.querySelectorAll('a').forEach(a => {
            try { a.href = new URL(a.getAttribute('href'), baseUrl).href; } catch (e) { }
        });

        log("State: Finalizing HTML...", 'info');

        let finalHtml = "";
        try {
            finalHtml = `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto;">
                            <p style="font-size: 0.8em; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                                Source: <a href="${baseUrl}">${baseUrl}</a>
                            </p>
                            ${doc.body ? doc.body.innerHTML : ''}
                        </div>
                    `;
        } catch (err) {
            log("Error constructing HTML: " + err.message, 'error');
            throw err;
        }

        return finalHtml;
    }

    // [Proxy Logic - Unchanged]
    /**
     * Fetches content from a URL using various CORS proxies.
     * @param {string} targetUrl - The URL to fetch.
     * @returns {Promise<string>} The fetched content.
     */
    async function fetchWithFallback(targetUrl) {
        const proxies = [
            {
                name: 'CorsProxy.io',
                url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
                type: 'html'
            },
            {
                name: 'AllOrigins',
                url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
                type: 'json'
            },
            {
                name: 'CodeTabs',
                url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
                type: 'html'
            }
        ];

        for (const proxy of proxies) {
            try {
                log(`Trying Proxy: ${proxy.name} ...`, 'info');
                const response = await fetch(proxy.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                let content = "";
                if (proxy.type === 'json') {
                    const data = await response.json();
                    content = data.contents;
                } else {
                    content = await response.text();
                }

                if (!content || content.length < 50) throw new Error("Empty or invalid content");

                log(`Proxy ${proxy.name} Success. Content length: ${content.length}`, 'success');
                return content;

            } catch (error) {
                log(`Proxy ${proxy.name} failed: ${error.message}`, 'warn');
            }
        }
        log("All proxies exhausted.", 'error');
        throw new Error("All proxies failed.");
    }

    // [Process Logic - Unchanged]
    /**
     * Main handler for the "Capture & Email" button.
     * Fetches, cleans, copies to clipboard, and opens mail client.
     */
    async function processAndSend() {
        const url = urlInput.value.trim();
        if (!url) { showStatus("Please enter a valid URL.", "error"); return; }
        if (!url.startsWith('http')) { showStatus("URL must start with http:// or https://", "error"); return; }

        if (debugConsole) debugConsole.innerHTML = '';
        setLoading(true);
        showStatus("Fetching web page content...", "info");
        log(`Starting capture for: ${url}`, 'info');

        try {
            const rawHtml = await fetchWithFallback(url);
            log("Fetch complete. Cleaning...", 'info');
            const cleanedHtml = await cleanHtml(rawHtml, url);
            log(`Cleaning complete. Length: ${cleanedHtml.length}`, 'info');

            const blobHtml = new Blob([cleanedHtml], { type: "text/html" });
            const blobText = new Blob([url], { type: "text/plain" });

            const clipboardItem = new ClipboardItem({
                "text/html": blobHtml,
                "text/plain": blobText,
            });

            await navigator.clipboard.write([clipboardItem]);
            log("Content copied to clipboard.", 'success');

            showStatus(`
                        <strong>Success! Content Copied.</strong><br>
                        Email client opening...<br>
                        Press <strong>Ctrl+V</strong> in the email body.
                    `, "success");

            const subject = `Web Page: ${new URL(url).hostname}`;
            const body = `Original URL: ${url}\n\n\n\n[Paste content here]\n`;

            setTimeout(() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }, 500);

        } catch (error) {
            console.error(error);
            log(`Process failed: ${error.message}`, 'error');
            showStatus(`Error: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    }

    // [REST API Save Logic - Hybrid Version]
    // 1. Get SDK User ID
    // 2. Get ID Token from SDK
    // 3. Make REST API Call
    /**
     * Main handler for the "Save to Board" button.
     * Fetches, cleans, and saves the content to Firestore via REST API.
     */
    async function saveToBoard() {
        const url = urlInput.value.trim();
        if (!url) { showStatus("Please enter a valid URL.", "error"); return; }

        // Disable buttons
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('saveBtn').innerHTML = '<div class="loading-spinner"></div>';

        log(`Starting save for: ${url}`, 'info');

        try {
            const rawHtml = await fetchWithFallback(url);
            const cleanedHtml = await cleanHtml(rawHtml, url);

            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, "text/html");
            const pageTitle = (doc.querySelector('title') ? doc.querySelector('title').innerText : url) || "Untitled Page";

            // Auth Check (Hybrid)
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error("User session invalid. Please log in again.");
            }

            // Get Token for REST API
            const idToken = await window.getAuthIdToken();
            if (!idToken) throw new Error("Failed to retrieve ID Token.");

            log(`Saving Content (Length: ${cleanedHtml.length})...`, 'info');

            // REST API: Create Document (POST)
            const projectId = window.API_CONFIG.projectId;
            const endpoint = `${window.API_CONFIG.endpoints.firestore}/users/${user.uid}/web_clipper?key=${window.API_CONFIG.apiKey}`;

            const body = {
                fields: {
                    appId: { stringValue: 'web_clipper' },
                    title: { stringValue: pageTitle },
                    url: { stringValue: url },
                    content: { stringValue: cleanedHtml },
                    createdAt: { timestampValue: new Date().toISOString() }
                }
            };

            log(`Sending POST request to Firestore REST API...`, 'info');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`, // Send ID Token
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Handle 404 Database Not Found
                if (response.status === 404 && errorText.includes("database (default) does not exist")) {
                    throw new Error("Firestore Database not created. Please go to Firebase Console -> Firestore Database -> Create Database.");
                }
                throw new Error(`Firestore Error (${response.status}): ${errorText}`);
            }

            const responseData = await response.json();
            log(`Saved successfully! Doc ID: ${responseData.name.split('/').pop()}`, 'success');

            showStatus("Successfully saved to your board!", 'success');
            loadPosts(); // Refresh list

        } catch (error) {
            console.error(error);
            log(`Save failed: ${error.message}`, 'error');
            showStatus(`Save Error: ${error.message}`, 'error');
        } finally {
            document.getElementById('saveBtn').disabled = false;
            document.getElementById('saveBtn').innerHTML = '<span>Save to Board</span>';
        }
    }

    // Helper: Convert Firestore REST JSON to specific Object
    function parseFirestoreNode(node) {
        if (node.stringValue !== undefined) return node.stringValue;
        if (node.booleanValue !== undefined) return node.booleanValue;
        if (node.integerValue !== undefined) return parseInt(node.integerValue, 10);
        if (node.timestampValue !== undefined) return new Date(node.timestampValue);
        if (node.mapValue !== undefined) return parseFirestoreMap(node.mapValue.fields);
        return null;
    }

    function parseFirestoreMap(fields) {
        const out = {};
        for (const key in fields) {
            out[key] = parseFirestoreNode(fields[key]);
        }
        return out;
    }

    // [REST API Load Logic - Hybrid Version]
    /**
     * Loads the authenticated user's posts from Firestore and renders them to the list.
     */
    async function loadPosts() {
        const listEl = document.getElementById('postList');
        const user = firebase.auth().currentUser;

        if (!listEl || !user) return;

        listEl.innerHTML = '<li style="color: #94a3b8; text-align: center;"><div class="loading-spinner" style="width: 15px; height: 15px; display: inline-block;"></div> Loading...</li>';

        try {
            const token = await window.getAuthIdToken();
            const apiKey = window.API_CONFIG.apiKey;

            // RunQuery Endpoint
            const endpoint = `${window.API_CONFIG.endpoints.firestore}/users/${user.uid}:runQuery?key=${apiKey}`;

            log(`Querying DB (runQuery POST)...`, 'info');

            const queryBody = {
                structuredQuery: {
                    from: [{
                        collectionId: "web_clipper"
                    }],
                    orderBy: [{
                        field: { fieldPath: "createdAt" },
                        direction: "DESCENDING"
                    }],
                    limit: 20
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Handle 404 Database Not Found
                if (response.status === 404 && errorText.includes("database (default) does not exist")) {
                    throw new Error("Firestore Database not created. Please go to Firebase Console -> Firestore Database -> Create Database.");
                }
                throw new Error(`Query Error (${response.status}): ${errorText}`);
            }

            const rawData = await response.json();

            // rawData contains: [ {document: {...}}, {readTime: ...} ]
            // Filter out non-document entries (like readTime header/footer)
            const documents = rawData
                .filter(item => item.document)
                .map(item => {
                    const doc = parseFirestoreMap(item.document.fields || {});
                    doc._createTime = item.document.createTime;
                    return doc;
                });

            log(`Loaded ${documents.length} posts via runQuery`, 'success');

            if (documents.length === 0) {
                listEl.innerHTML = '<li style="color: #94a3b8; text-align: center;">저장된 포스트가 없습니다.</li>';
                return;
            }

            listEl.innerHTML = '';
            documents.forEach(doc => {
                const li = document.createElement('li');
                li.style.cssText = `
                            background: rgba(0,0,0,0.2);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: 6px;
                            padding: 0.75rem;
                            margin-bottom: 0.5rem;
                        `;

                const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'Unknown Date';
                const title = doc.title || 'No Title';
                const url = doc.url || '#';

                li.innerHTML = `
                            <div style="font-weight: 600; font-size: 0.95rem; color: #f1f5f9; margin-bottom: 0.25rem;">
                                <a href="${url}" target="_blank" style="color: inherit; text-decoration: none;">${title}</a>
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b; display: flex; justify-content: space-between;">
                                <span>${dateStr}</span>
                                <a href="${url}" target="_blank" style="color: #38bdf8; text-decoration: none;">View Original</a>
                            </div>
                        `;
                listEl.appendChild(li);
            });

        } catch (error) {
            console.error(error);
            listEl.innerHTML = `<li style="color: #fda4af; text-align: center;">Error loading posts: ${error.message}</li>`;
        }
    }

    // Expose public functions to window for HTML event handlers
    window.processAndSend = processAndSend;
    window.saveToBoard = saveToBoard;

})();
