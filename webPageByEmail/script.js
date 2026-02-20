// Web Page to Email & Board Tool
// - Authentication: Firebase SDK (Auth only)
// - Database: REST API (Firestore via fetch)

(function () {
    "use strict";

    const isDebug = (window.API_CONFIG && window.API_CONFIG.debugMode) || false;

    // Global State
    let loadedPosts = []; // Stores current posts for client-side search
    let currentUser = null; // Store user for REST calls
    let pollingInterval = null; // For manual refreshing since we lost real-time

    // Auth Guard & UI
    if (window.registerAuthListener) {
        window.registerAuthListener(user => {
            if (window.Logger && isDebug) window.Logger.info(`AuthStateChanged: ${user ? user.email : "No User"}`);
            currentUser = user;

            if (!user) {
                // Not logged in -> Redirect
                window.location.replace("../index.html");
            } else {
                // Logged in -> Load Board via REST
                initBoardPolling(user);
            }
        });
    }

    const statusArea = document.getElementById('statusArea');
    const sendBtn = document.getElementById('sendBtn');
    const saveBtn = document.getElementById('saveBtn');
    const urlInput = document.getElementById('urlInput');
    const debugConsole = document.getElementById('debugConsole');

    // Inject Search Input if not exists
    const boardSection = document.getElementById('boardSection');
    let searchContainer = document.getElementById('searchContainer');
    if (!searchContainer && boardSection) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'searchContainer';
        searchContainer.style.marginBottom = '1rem';
        searchContainer.innerHTML = `
            <input type="text" id="searchInput" placeholder="Search saved posts..." 
                style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;">
        `;
        boardSection.insertBefore(searchContainer, boardSection.querySelector('ul'));

        const input = searchContainer.querySelector('input');
        input.addEventListener('input', (e) => {
            renderBoard(e.target.value);
        });
    }

    // Helper: Log
    function log(message, type = 'info') {
        if (window.Logger) {
            type === 'error' ? window.Logger.error(message) :
                type === 'success' ? window.Logger.success(message) :
                    window.Logger.info(message);
        } else {
            console.log(`[${type}] ${message}`);
        }

        if (debugConsole) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            const time = new Date().toLocaleTimeString([], { hour12: false });
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            debugConsole.appendChild(entry);
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
    }

    function showStatus(message, type = 'info') {
        statusArea.style.display = 'block';
        statusArea.innerHTML = message;
        statusArea.className = 'status-message';
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

    // [HTML Cleaning Logic - Enhanced 260220]
    async function cleanHtml(htmlString, baseUrl) {
        log("State: Parsing HTML...", 'info');
        await new Promise(r => setTimeout(r, 10));

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        if (!doc.head && !doc.body) return htmlString;

        // 1. Resolve Relative URLs (Images & Links)
        const base = document.createElement('base');
        base.href = baseUrl;
        if (doc.head) doc.head.appendChild(base);
        else doc.body.insertBefore(base, doc.body.firstChild);

        // 2. Remove Unwanted Elements (Scripts, Styles, Nav, etc.)
        const elementsToRemove = doc.querySelectorAll('script, iframe, object, embed, form, button, nav, footer, style, link, meta, noscript, svg, canvas');
        elementsToRemove.forEach(el => el.remove());

        // 3. Clean Attributes (Event Handlers, Data Attributes)
        const allElements = doc.querySelectorAll('*');
        for (let j = 0; j < allElements.length; j++) {
            const el = allElements[j];
            if (el.attributes) {
                // Remove all 'on*' events and 'data-*' attributes
                const attrsToRemove = [];
                for (let i = 0; i < el.attributes.length; i++) {
                    const attr = el.attributes[i];
                    if (attr.name.startsWith('on') || attr.name.startsWith('data-')) {
                        attrsToRemove.push(attr.name);
                    }
                }
                attrsToRemove.forEach(name => el.removeAttribute(name));
            }
            // Remove 'javascript:' hrefs
            if (el.hasAttribute('href') && el.getAttribute('href').trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('href');

            // 4. Strip Inline Styles (Reset Formatting)
            el.removeAttribute('style');
            el.removeAttribute('class');
            el.removeAttribute('id');
        }

        // 5. Fix Image Paths
        doc.querySelectorAll('img').forEach(img => {
            try {
                img.src = new URL(img.getAttribute('src'), baseUrl).href;
                // Force Responsive Images
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '10px auto';
            } catch (e) { }
        });

        doc.querySelectorAll('a').forEach(a => {
            try {
                a.href = new URL(a.getAttribute('href'), baseUrl).href;
                a.target = '_blank';
                a.style.color = '#3b82f6';
                a.style.textDecoration = 'underline';
            } catch (e) { }
        });

        // 6. Remove Empty Elements (P, DIV, SPAN)
        // Repeat a few times to handle nested empty elements
        for (let k = 0; k < 3; k++) {
            doc.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, li').forEach(el => {
                if (el.innerText.trim() === '' && el.children.length === 0 && el.tagName !== 'IMG') {
                    el.remove();
                }
            });
        }

        // 7. Flatten layout significantly
        return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff;">
                <p style="font-size: 0.8em; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 20px;">
                    Source: <a href="${baseUrl}" style="color:#666; text-decoration:none;">${baseUrl}</a>
                </p>
                <div class="cleaned-content">
                    ${doc.body ? doc.body.innerHTML : ''}
                </div>
            </div>
        `;
    }

    // [Proxy Logic - Same as before]
    async function fetchWithFallback(targetUrl) {
        const proxies = [
            { name: 'CorsProxy.io', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, type: 'html' },
            { name: 'AllOrigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, type: 'json' },
            { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, type: 'html' }
        ];

        for (const proxy of proxies) {
            try {
                log(`Trying Proxy: ${proxy.name} ...`, 'info');
                const response = await fetch(proxy.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                let content = proxy.type === 'json' ? (await response.json()).contents : await response.text();
                if (!content || content.length < 50) throw new Error("Empty content");
                return content;
            } catch (error) {
                log(`Proxy ${proxy.name} failed: ${error.message}`, 'warn');
            }
        }
        throw new Error("All proxies failed.");
    }

    // [Process Logic]
    async function processAndSend() {
        // ... (No changes here, relies on global scope functions if any, but cleanHtml is local)
        const url = urlInput.value.trim();
        if (!url) { showStatus("Please enter a valid URL.", "error"); return; }

        setLoading(true);
        debugConsole.innerHTML = '';

        try {
            const rawHtml = await fetchWithFallback(url);
            const cleanedHtml = await cleanHtml(rawHtml, url);
            const blobHtml = new Blob([cleanedHtml], { type: "text/html" });
            const blobText = new Blob([url], { type: "text/plain" });

            await navigator.clipboard.write([new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })]);
            showStatus("Content Copied! Opening Email...", "success");

            const subject = `Web Page: ${new URL(url).hostname}`;
            const body = `Original URL: ${url}\n\n[Paste content here]`;
            setTimeout(() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }, 500);

        } catch (error) {
            log(`Error: ${error.message}`, 'error');
            showStatus(error.message, "error");
        } finally {
            setLoading(false);
        }
    }

    // [REST API Logic]

    function initBoardPolling(user) {
        // 1. Initial Load
        loadBoardREST(user);

        // 2. Setup Manual Refresh Button Logic
        // Remove existing refresh button if exists to prevent duplicates
        const existingRefreshBtn = document.getElementById('manualRefreshBtn');
        if (existingRefreshBtn) existingRefreshBtn.remove();

        // Find title to append button next to it
        const titleEl = document.querySelector('#boardSection h3');
        if (titleEl) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'manualRefreshBtn';
            refreshBtn.innerHTML = '&#x21bb; Refresh'; // ↻ Symbol
            refreshBtn.style.cssText = `
                margin-left: 10px; font-size: 0.8rem; padding: 2px 8px; 
                background: transparent; border: 1px solid #475569; color: #cbd5e1; 
                border-radius: 4px; cursor: pointer; transition: all 0.2s;
            `;
            refreshBtn.addEventListener('mouseover', () => { refreshBtn.style.background = '#334155'; refreshBtn.style.color = '#fff'; });
            refreshBtn.addEventListener('mouseout', () => { refreshBtn.style.background = 'transparent'; refreshBtn.style.color = '#cbd5e1'; });

            refreshBtn.addEventListener('click', () => {
                refreshBtn.innerHTML = '...';
                loadBoardREST(user).then(() => {
                    refreshBtn.innerHTML = '&#x21bb; Refresh';
                });
            });

            titleEl.appendChild(refreshBtn);
        }
    }

    async function loadBoardREST(user, silent = false) {
        if (!silent) {
            const listEl = document.getElementById('postList');
            // Only show loading if empty or requested
            if (listEl.children.length === 0) listEl.innerHTML = '<li style="text-align:center;">Loading Board...</li>';
        }

        try {
            const token = await window.getAuthIdToken();
            if (!token) throw new Error("Auth Token Missing");

            const endpoint = `${window.API_CONFIG.endpoints.firestore}/users/${user.uid}:runQuery`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: "web_clipper" }],
                        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
                        limit: 50
                    }
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            loadedPosts = (data || []).map(item => {
                if (!item.document) return null;

                const doc = item.document;
                const fields = doc.fields || {};
                const id = doc.name.split('/').pop();

                return {
                    id: id,
                    title: fields.title ? fields.title.stringValue : "Untitled",
                    url: fields.url ? fields.url.stringValue : "#",
                    content: fields.content ? fields.content.stringValue : "<p>No content saved.</p>",
                    createdAt: fields.createdAt ? { seconds: new Date(fields.createdAt.timestampValue).getTime() / 1000 } : null
                };
            }).filter(p => p !== null);

            renderBoard(document.querySelector('#searchInput')?.value || '');
            if (!silent) log(`REST Loaded: ${loadedPosts.length} posts`, 'success');

        } catch (error) {
            console.error("REST Load Error:", error);
            if (!silent) {
                log(`Load Error: ${error.message}`, 'error');
                document.getElementById('postList').innerHTML = '<li style="color:red">Failed to load board.</li>';
            }
        }
    }

    function renderBoard(searchQuery = '') {
        const listEl = document.getElementById('postList');
        listEl.innerHTML = '';

        const query = searchQuery.toLowerCase();
        const filtered = loadedPosts.filter(post =>
            (post.title && post.title.toLowerCase().includes(query)) ||
            (post.url && post.url.toLowerCase().includes(query))
        );

        if (filtered.length === 0) {
            listEl.innerHTML = '<li style="text-align:center; padding: 1rem; color: #888;">No posts found.</li>';
            return;
        }

        filtered.forEach(post => {
            const li = document.createElement('li');
            li.className = 'board-item';
            li.style.cssText = `background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; flex-direction: column; gap: 8px; transition: background 0.2s;`;

            const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Unknown Date';

            li.innerHTML = `
                <div class="board-item-content">
                    <div class="board-item-header">
                        <!-- Toggle Button -->
                        <button class="toggle-btn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.2rem; padding:0 5px; flex-shrink: 0;">&#9656;</button>
                        <a href="${post.url}" target="_blank" style="font-weight: bold; color: #f1f5f9; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${post.title}</a>
                    </div>
                    
                    <div class="board-item-meta">
                        <div style="font-size: 0.8rem; color: #64748b;">${dateStr}</div>
                        <button class="delete-btn" data-id="${post.id}" style="background: #ef4444; border: none; border-radius: 4px; color: white; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                    </div>
                </div>
                
                <!-- Expanded Content Area -->
                <div class="post-content" style="display: none; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 1rem; color: #cbd5e1; font-size: 0.95rem; overflow-x: auto; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 15px;">
                    ${post.content}
                </div>
            `;

            // Accordion Logic
            const toggleBtn = li.querySelector('.toggle-btn');
            const contentDiv = li.querySelector('.post-content');

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // 1. Close all OTHER open items
                document.querySelectorAll('.post-content').forEach(el => {
                    if (el !== contentDiv) {
                        el.style.display = 'none';
                        // Reset other buttons
                        const otherBtn = el.parentElement.querySelector('.toggle-btn');
                        if (otherBtn) otherBtn.innerHTML = '&#9656;'; // Right arrow
                    }
                });

                // 2. Toggle CURRENT item
                const isHidden = contentDiv.style.display === 'none';
                contentDiv.style.display = isHidden ? 'block' : 'none';
                toggleBtn.innerHTML = isHidden ? '&#9662;' : '&#9656;'; // Down arrow vs Right arrow
            });

            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deletePost(e.target.dataset.id);
            });

            listEl.appendChild(li);
        });
    }

    async function saveToBoard() {
        const url = urlInput.value.trim();
        if (!url) { showStatus("Invalid URL", "error"); return; }
        if (!currentUser) { showStatus("Please log in first.", "error"); return; }

        saveBtn.disabled = true;
        saveBtn.innerText = "Saving...";

        try {
            const rawHtml = await fetchWithFallback(url);
            const cleanedHtml = await cleanHtml(rawHtml, url);
            const docStub = new DOMParser().parseFromString(rawHtml, "text/html");
            const title = (docStub.querySelector('title') ? docStub.querySelector('title').innerText : url) || "Untitled";

            const token = await window.getAuthIdToken();
            if (!token) throw new Error("Auth Token Missing");

            const endpoint = `${window.API_CONFIG.endpoints.firestore}/users/${currentUser.uid}/web_clipper`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    fields: {
                        appId: { stringValue: 'web_clipper' },
                        title: { stringValue: title },
                        url: { stringValue: url },
                        content: { stringValue: cleanedHtml },
                        createdAt: { timestampValue: new Date().toISOString() }
                    }
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            log("Saved via REST API", 'success');
            showStatus("Saved successfully!", "success");
            loadBoardREST(currentUser);

        } catch (error) {
            log(`Save Failed: ${error.message}`, 'error');
            showStatus(error.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save to Board";
        }
    }

    async function deletePost(docId) {
        if (!confirm("Are you sure you want to delete this post?")) return;
        if (!currentUser) return;

        try {
            const token = await window.getAuthIdToken();
            const endpoint = `${window.API_CONFIG.endpoints.firestore}/users/${currentUser.uid}/web_clipper/${docId}`;

            const response = await fetch(endpoint, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            log(`Deleted post: ${docId}`, 'success');
            loadedPosts = loadedPosts.filter(p => p.id !== docId);
            renderBoard(document.querySelector('#searchInput')?.value || '');

        } catch (error) {
            log(`Delete Failed: ${error.message}`, 'error');
            alert("Failed to delete.");
        }
    }

    window.processAndSend = processAndSend;
    window.saveToBoard = saveToBoard;

})();
