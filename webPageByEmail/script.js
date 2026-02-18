// Firebase Logic handled by ../js/firebase-config.js

const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// Auth Guard & UI
auth.onAuthStateChanged(user => {
    console.log("AuthStateChanged:", user ? user.email : "No User");

    renderAuthUI(user);

    if (!user) {
        // Strict Auth Redirect
        window.location.replace("../index.html");
    } else {
        currentUser = user;
        loadPosts();
    }
});

const statusArea = document.getElementById('statusArea');
const sendBtn = document.getElementById('sendBtn');
const urlInput = document.getElementById('urlInput');
const debugConsole = document.getElementById('debugConsole');

function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const time = new Date().toLocaleTimeString([], { hour12: false });
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

    if (debugConsole) {
        debugConsole.appendChild(entry);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function showStatus(message, type = 'info') {
    statusArea.style.display = 'block';
    statusArea.innerHTML = message;

    statusArea.className = 'status-message'; // reset
    if (type === 'success') statusArea.classList.add('status-success');
    if (type === 'error') statusArea.classList.add('status-error');
}

function setLoading(isLoading) {
    if (isLoading) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-spinner"></div><span>Processing...</span>';
    } else {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Capture & Email</span>';
    }
}

async function cleanHtml(htmlString, baseUrl) {
    log("State: Parsing HTML...", 'info');
    // Allow UI to update
    await new Promise(r => setTimeout(r, 10));

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    if (!doc.head && !doc.body) {
        // Extreme case: Empty doc
        log("Warning: Empty document parsed.", 'warn');
        return htmlString; // Return as is or empty
    }

    // 1. Base URL adjustment for relative links/images
    log("State: Adjusting Base URL...", 'info');
    const base = document.createElement('base');
    base.href = baseUrl;
    if (doc.head) {
        doc.head.appendChild(base);
    } else {
        doc.body.insertBefore(base, doc.body.firstChild);
    }

    // 2. Remove Scripts and dangerous elements
    log("State: Removing scripts...", 'info');
    const elementsToRemove = doc.querySelectorAll('script, iframe, object, embed, form, button, nav, footer, style, link[rel="stylesheet"]');
    elementsToRemove.forEach(el => el.remove());

    // 2.1 Security hardening: Remove event handlers and javascript: links
    // Walk through all elements
    log("State: Security Hardening (Attributes)...", 'info');
    await new Promise(r => setTimeout(r, 10)); // Yield for UI

    const allElements = doc.querySelectorAll('*');
    log(`- Found ${allElements.length} elements to check.`, 'info');

    // Optimizing Loop
    for (let j = 0; j < allElements.length; j++) {
        const el = allElements[j];
        // Remove on<event> attributes
        if (el.attributes) {
            for (let i = el.attributes.length - 1; i >= 0; i--) {
                const attr = el.attributes[i];
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            }
        }
        // Check for javascript: protocol in href/src
        if (el.hasAttribute('href') && el.getAttribute('href').trim().toLowerCase().startsWith('javascript:')) {
            el.removeAttribute('href');
        }
        if (el.hasAttribute('src') && el.getAttribute('src').trim().toLowerCase().startsWith('javascript:')) {
            el.removeAttribute('src');
        }

        // Yield occasionally for really large DOMs
        if (j % 500 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // 3. Resolve relative URLs to absolute (Critical for email)
    log("State: Resolving URLs...", 'info');
    doc.querySelectorAll('img').forEach(img => {
        try {
            img.src = new URL(img.getAttribute('src'), baseUrl).href;
        } catch (e) { }
    });
    doc.querySelectorAll('a').forEach(a => {
        try {
            a.href = new URL(a.getAttribute('href'), baseUrl).href;
        } catch (e) { }
    });

    // 5. Wrap in a container to ensure some basic styling reset if needed
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
        log("State: HTML Constructed. Length: " + finalHtml.length, 'info');
    } catch (err) {
        log("Error constructing HTML: " + err.message, 'error');
        throw err;
    }

    return finalHtml;
}

// Implementation of Multi-Proxy Strategy
async function fetchWithFallback(targetUrl) {
    const proxies = [
        // 1. CorsProxy.io (Direct HTML) - User Preferred
        {
            name: 'CorsProxy.io',
            url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            type: 'html'
        },
        // 2. AllOrigins (Returns JSON with 'contents')
        {
            name: 'AllOrigins',
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            type: 'json'
        },
        // 3. CodeTabs (Direct HTML)
        {
            name: 'CodeTabs',
            url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            type: 'html'
        }
    ];

    let lastError = null;

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

            if (!content || content.length < 50) { // Basic validation
                throw new Error("Empty or invalid content");
            }

            log(`Proxy ${proxy.name} Success. Content length: ${content.length}`, 'success');
            return content; // Success!

        } catch (error) {
            log(`Proxy ${proxy.name} failed: ${error.message}`, 'warn');
            lastError = error;
            // Continue to next proxy
        }
    }

    log("All proxies exhausted.", 'error');
    throw new Error("All proxies failed. The site might be blocking access.");
}

async function processAndSend() {
    const url = urlInput.value.trim();

    if (!url) {
        showStatus("Please enter a valid URL.", "error");
        return;
    }

    if (!url.startsWith('http')) {
        showStatus("URL must start with http:// or https://", "error");
        return;
    }

    // Clear logs on new attempt
    if (debugConsole) debugConsole.innerHTML = '';

    setLoading(true);
    showStatus("Fetching web page content (trying multiple proxies)...", "info");
    log(`Starting capture for: ${url}`, 'info');

    try {
        // Fetch using Fallback Logic
        const rawHtml = await fetchWithFallback(url);

        // Debug Log
        log("Fetch complete. Calling cleanHtml...", 'info');

        const cleanedHtml = await cleanHtml(rawHtml, url);

        console.log("Returned from cleanHtml", cleanedHtml ? cleanedHtml.length : "null");
        log(`HTML Cleaning complete. Length: ${cleanedHtml ? cleanedHtml.length : 'null'}`, 'info');

        // Copy to Clipboard
        // We write both plain text and HTML types.
        log("Creating Clipboard Blob...", 'info');
        const blobHtml = new Blob([cleanedHtml], { type: "text/html" });
        const blobText = new Blob([url], { type: "text/plain" });

        const clipboardItem = new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
        });

        log("Writing to Clipboard...", 'info');
        await navigator.clipboard.write([clipboardItem]);

        log("Content copied to clipboard.", 'success');

        showStatus(`
                    <strong>Success! Content Copied.</strong><br>
                    Email client opening...<br>
                    Press <strong>Ctrl+V</strong> in the email body to paste the web page.
                `, "success");

        // Open Mailto
        // Note: We cannot put HTML in body, so we put a placeholder.
        const subject = `Web Page: ${new URL(url).hostname}`;
        const body = `Original URL: ${url}\n\n\n\n[Paste the web page content here using Ctrl+V]\n`;

        // Slight delay to allow UI to update
        setTimeout(() => {
            log("Opening mailto link...", 'info');
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }, 500);

    } catch (error) {
        console.error(error);
        log(`Process failed: ${error.message}`, 'error');
        showStatus(`Error: ${error.message}<br>Try a different URL or check your connection.`, "error");
    } finally {
        setLoading(false);
    }
}

async function saveToBoard() {
    const url = urlInput.value.trim();
    if (!url) {
        showStatus("Please enter a valid URL.", "error");
        return;
    }
    if (!url.startsWith('http')) {
        showStatus("URL must start with http:// or https://", "error");
        return;
    }

    // Disable buttons
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('saveBtn').innerHTML = '<div class="loading-spinner"></div>';

    log(`Starting save for: ${url}`, 'info');

    try {
        // Reuse existing fetch logic
        const rawHtml = await fetchWithFallback(url);

        log("Fetch complete. Calling cleanHtml...", 'info');
        const cleanedHtml = await cleanHtml(rawHtml, url);
        log(`HTML Cleaning complete. Length: ${cleanedHtml ? cleanedHtml.length : 'null'}`, 'info');

        // Extract Title
        log("Extracting title...", 'info');
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const pageTitle = (doc.querySelector('title') ? doc.querySelector('title').innerText : url) || "Untitled Page";
        log(`Title extracted: ${pageTitle}`, 'info');

        if (!currentUser) {
            throw new Error("User session not found (currentUser is null).");
        }

        // 1. Connectivity Check (Ping with 2s Timeout)
        log("Checking Firestore Connectivity...", 'info');

        let useRestApi = false;
        try {
            const pingPromise = db.collection('users').doc(currentUser.uid).collection('test_connectivity').add({
                ping: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Ping Timed Out")), 2000)
            );

            await Promise.race([pingPromise, timeoutPromise]);
            log("Connectivity Check OK (SDK).", 'success');
        } catch (pingError) {
            log(`SDK Unreachable (${pingError.message}). Switching to REST API...`, 'warn');
            useRestApi = true;
        }

        log(`Saving Content (Length: ${cleanedHtml.length})...`, 'info');

        if (useRestApi) {
            // --- REST API Fallback with Smart Discovery ---
            const token = await currentUser.getIdToken();
            const projectId = firebase.app().options.projectId || "oopspublic";
            const apiKey = firebase.app().options.apiKey;

            const dbVariations = ['(default)', 'default', projectId];
            let success = false;
            let lastError = null;

            for (const dbId of dbVariations) {
                try {
                    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${currentUser.uid}/web_clipper?key=${apiKey}`;

                    log(`Trying DB ID: '${dbId}'...`, 'info');

                    const body = {
                        fields: {
                            appId: { stringValue: 'web_clipper' },
                            title: { stringValue: pageTitle },
                            url: { stringValue: url },
                            content: { stringValue: cleanedHtml },
                            createdAt: { timestampValue: new Date().toISOString() }
                        }
                    };

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });

                    if (response.ok) {
                        log(`Success with DB ID: '${dbId}'`, 'success');
                        success = true;
                        break; // Stop trying
                    } else {
                        const errorText = await response.text();
                        lastError = `HTTP ${response.status}: ${errorText}`;
                        log(`Failed with '${dbId}': ${response.status}`, 'warn');

                        // Fail fast on Auth errors (no point retrying other DBs)
                        if (response.status === 401 || response.status === 403) {
                            throw new Error(`Auth Error (${response.status}): Check API Key/Permissions`);
                        }
                    }
                } catch (e) {
                    lastError = e.message;
                    log(`Exception with '${dbId}': ${e.message}`, 'error');
                }
            }

            if (!success) {
                throw new Error(`All database paths failed. Last error: ${lastError}`);
            }

            log("Saved via REST API (Smart Discovery)!", 'success');

        } else {
            // --- Standard SDK Save ---
            const savePromise = db.collection('users').doc(currentUser.uid).collection('web_clipper').add({
                appId: 'web_clipper',
                title: pageTitle,
                url: url,
                content: cleanedHtml,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("SDK Save Timed Out")), 10000)
            );

            await Promise.race([savePromise, timeoutPromise]);
            log("Saved via SDK!", 'success');
        }

        showStatus("Successfully saved to your board!", 'success');
        loadPosts(); // Refresh list

    } catch (error) {
        console.error(error);
        let msg = error.message;
        if (msg.includes("404") && msg.includes("database")) {
            msg = "데이터베이스 경로를 찾을 수 없습니다. (프로젝트 ID 불일치 또는 API Key 제한)";
        } else if (msg.includes("timed out")) {
            msg = "네트워크 연결이 지연되고 있습니다. (방화벽/인터넷 상태 확인)";
        }
        log(`Save failed: ${error.message}`, 'error');
        showStatus(`Save Error: ${msg}`, 'error');
    } finally {
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('saveBtn').innerHTML = '<span>Save to Board</span>';
    }
}

// Helper to convert Firestore REST API document to flat object
function parseFirestoreDocument(doc) {
    const fields = doc.fields || {};
    const data = {};
    for (const key in fields) {
        const value = fields[key];
        if (value.stringValue !== undefined) data[key] = value.stringValue;
        else if (value.timestampValue !== undefined) data[key] = new Date(value.timestampValue);
        else if (value.integerValue !== undefined) data[key] = parseInt(value.integerValue);
        else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
    }
    // Add metadata
    data._createTime = doc.createTime;
    return data;
}

async function loadPosts() {
    const listEl = document.getElementById('postList');
    if (!listEl || !currentUser) return;

    listEl.innerHTML = '<li style="color: #94a3b8; text-align: center;"><div class="loading-spinner" style="width: 15px; height: 15px; display: inline-block;"></div> Loading...</li>';

    try {
        // Strategy: Use runQuery (POST) instead of list (GET).
        // v1.0.28: Fixed 400 Error (Invalid 'where' clause)

        const token = await currentUser.getIdToken();
        const projectId = firebase.app().options.projectId || "oopspublic";
        const apiKey = firebase.app().options.apiKey;

        const dbVariations = ['(default)', 'default', projectId];
        let success = false;
        let documents = [];

        for (const dbId of dbVariations) {
            try {
                // Using runQuery endpoint (POST)
                // Path: projects/{projectId}/databases/{dbId}/documents:runQuery
                // We target the specific parent document ensure scope.
                const scopedEndpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${currentUser.uid}:runQuery?key=${apiKey}`;

                log(`Querying DB (POST): '${dbId}'...`, 'info');

                // Corrected Query: Only 'from' is needed to list collection.
                const queryBody = {
                    structuredQuery: {
                        from: [{
                            collectionId: "web_clipper"
                        }],
                        // Removed invalid 'where' clause.
                        // 'from' + parent in URL is enough to target the subcollection.
                        limit: 20
                    }
                };

                const res = await fetch(scopedEndpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(queryBody)
                });

                if (res.ok) {
                    const rawData = await res.json();
                    // runQuery returns array of objects: [{document: ...}, {readTime: ...}]
                    // We need to filter out items that don't have 'document'
                    documents = rawData
                        .filter(item => item.document)
                        .map(item => parseFirestoreDocument(item.document));

                    // Client-side Sorting (Desc by CreatedAt)
                    documents.sort((a, b) => {
                        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
                        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
                        return dateB - dateA; // Newest first
                    });

                    success = true;
                    log(`Loaded ${documents.length} posts via runQuery (DB: ${dbId})`, 'success');
                    break;

                } else {
                    const errText = await res.text();

                    if (res.status === 404) {
                        log(`DB '${dbId}' not found (404).`, 'info');
                    } else {
                        log(`Query failed with '${dbId}': ${res.status} - ${errText}`, 'warn');
                    }
                }
            } catch (e) {
                // handled in loop
                log(`Exception with '${dbId}': ${e.message}`, 'error');
            }
        } // end for loop

        if (!success) {
            // Try standard SDK list if runQuery failed?
            // But we know SDK fails.
            log("No posts found via runQuery.", 'warn');
            listEl.innerHTML = '<li style="color: #fda4af; text-align: center;">기존 게시물을 불러오지 못했습니다. (REST API Error)</li>';
            return;
        }

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
