// Web Page to Email & Board Tool
// - Authentication: Firebase SDK (Auth only)
// - Database: REST API (Firestore via fetch)
// - [260220_1736] Security: sanitizeHtml(), 커스텀 모달, window 전역 노출 최소화

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

    // [STAB-01] DOM 참조를 변수 선언만 수행 (실제 참조는 DOMContentLoaded에서)
    let statusArea = null;
    let sendBtn = null;
    let saveBtn = null;
    let urlInput = null;
    let debugConsole = null;

    // 검색 입력 필드 주입은 DOMContentLoaded에서 수행 (STAB-01)

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

    /**
     * [보안] HTML 문자열을 안전하게 정제합니다.
     * DOMParser로 파싱 후 위험 요소/속성을 제거합니다.
     * Stored XSS 방어용으로 DB에서 가져온 콘텐츠 렌더링 전 반드시 적용해야 합니다.
     * @param {string} htmlString - 정제할 HTML 문자열
     * @returns {string} 정제된 안전한 HTML 문자열
     */
    function sanitizeHtml(htmlString) {
        if (!htmlString || typeof htmlString !== 'string') return '';

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // 1단계: 위험 태그 전체 제거
        const dangerousTags = 'script, iframe, object, embed, style, link, meta, noscript, base';
        doc.querySelectorAll(dangerousTags).forEach(el => el.remove());

        // 2단계: 모든 요소의 위험 속성 제거
        doc.querySelectorAll('*').forEach(el => {
            const attrsToRemove = [];
            for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                // on* 이벤트 핸들러 제거
                if (attr.name.startsWith('on')) {
                    attrsToRemove.push(attr.name);
                }
            }
            attrsToRemove.forEach(name => el.removeAttribute(name));

            // javascript: href 제거
            if (el.hasAttribute('href') &&
                el.getAttribute('href').trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute('href');
            }
            // data: src 제거 (img 예외 처리는 필요 시 추가)
            if (el.tagName !== 'IMG' && el.hasAttribute('src') &&
                el.getAttribute('src').trim().toLowerCase().startsWith('data:')) {
                el.removeAttribute('src');
            }
        });

        return doc.body ? doc.body.innerHTML : '';
    }

    /**
     * 커스텀 Confirm 모달 (브라우저 기본 confirm() 대체)
     * Promise를 반환하며, 확인 시 true, 취소 시 false로 resolve 됩니다.
     * @param {string} message - 모달에 표시할 메시지
     * @returns {Promise<boolean>}
     */
    function showConfirmModal(message) {
        return new Promise((resolve) => {
            // 기존 모달이 있으면 제거
            const existing = document.getElementById('customConfirmModal');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'customConfirmModal';
            overlay.className = 'modal-overlay';

            overlay.innerHTML = `
                <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="confirmMsg">
                    <p id="confirmMsg" style="color: #e2e8f0; margin-bottom: 1.5rem; font-size: 1rem;">${message}</p>
                    <div class="modal-actions">
                        <button id="confirmCancelBtn" class="secondary-btn">취소</button>
                        <button id="confirmOkBtn" class="primary-btn" style="background: #ef4444;">삭제</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById('confirmOkBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
            document.getElementById('confirmCancelBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });
            // 오버레이 클릭 시 닫기
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });
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

            // [보안] post.content를 li.innerHTML 안에 직접 삽입하지 않음 (Stored XSS 방지)
            // sanitizeHtml()을 통해 정제된 HTML을 별도로 설정합니다.
            li.innerHTML = `
                <div class="board-item-content">
                    <div class="board-item-header">
                        <!-- Toggle Button -->
                        <button class="toggle-btn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.2rem; padding:0 5px; flex-shrink: 0;">&#9656;</button>
                        <a href="${post.url}" target="_blank" rel="noopener noreferrer" style="font-weight: bold; color: #f1f5f9; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${post.title}</a>
                    </div>
                    
                    <div class="board-item-meta">
                        <div style="font-size: 0.8rem; color: #64748b;">${dateStr}</div>
                        <button class="delete-btn" data-id="${post.id}" style="background: #ef4444; border: none; border-radius: 4px; color: white; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                    </div>
                </div>
                
                <!-- Expanded Content Area (콘텐츠는 JS로 별도 삽입 - XSS 방지) -->
                <div class="post-content" style="display: none; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 1rem; color: #cbd5e1; font-size: 0.95rem; overflow-x: auto; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 15px;">
                </div>
            `;

            // [PERF-01] Lazy Sanitize — 아코디언 최초 펼침 시점에 1회만 실행
            const toggleBtn = li.querySelector('.toggle-btn');
            const contentDiv = li.querySelector('.post-content');
            let sanitized = false;

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // [PERF-01] 최초 펼침 시점에 sanitize 실행 (Lazy)
                if (!sanitized) {
                    contentDiv.innerHTML = sanitizeHtml(post.content);
                    sanitized = true;
                }

                // 1. Close all OTHER open items
                document.querySelectorAll('.post-content').forEach(el => {
                    if (el !== contentDiv) {
                        el.style.display = 'none';
                        const otherBtn = el.parentElement.querySelector('.toggle-btn');
                        if (otherBtn) otherBtn.innerHTML = '&#9656;';
                    }
                });

                // 2. Toggle CURRENT item
                const isHidden = contentDiv.style.display === 'none';
                contentDiv.style.display = isHidden ? 'block' : 'none';
                toggleBtn.innerHTML = isHidden ? '&#9662;' : '&#9656;';
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
        // [UX] 브라우저 기본 confirm() 대신 커스텀 모달 사용
        const confirmed = await showConfirmModal('이 게시물을 삭제하시겠습니까?');
        if (!confirmed) return;
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
            // [UX] alert() 제거 → showStatus()로 대체
            showStatus('삭제에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
    }

    // [STAB-01] DOMContentLoaded에서 모든 DOM 참조 초기화
    document.addEventListener('DOMContentLoaded', () => {
        statusArea = document.getElementById('statusArea');
        sendBtn = document.getElementById('sendBtn');
        saveBtn = document.getElementById('saveBtn');
        urlInput = document.getElementById('urlInput');
        debugConsole = document.getElementById('debugConsole');

        // 버튼 이벤트 연결
        if (sendBtn) sendBtn.addEventListener('click', processAndSend);
        if (saveBtn) saveBtn.addEventListener('click', saveToBoard);

        // 검색 입력 필드 주입
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
    });

})()
