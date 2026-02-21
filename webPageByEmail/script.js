/**
 * ============================================================
 * 웹 페이지 클리퍼 & 이메일 전송기 (webPageByEmail/script.js)
 * ============================================================
 *
 * 【이 파일의 역할】
 * 1. URL을 입력하면 해당 웹 페이지의 콘텐츠를 가져와(fetch) 이메일로 전송
 * 2. 가져온 콘텐츠를 Firestore 데이터베이스에 저장하는 "클리핑" 기능
 * 3. 저장된 포스트를 불러오고 검색/삭제하는 게시판 기능
 *
 * 【핵심 기술 스택】
 * - CORS 프록시: 같은 출처가 아닌 외부 사이트의 HTML을 가져오기 위해
 *   corsproxy.io, allorigins.win 등의 프록시 서비스 사용
 * - Firestore REST API: Firebase SDK 대신 fetch()로 HTTP 요청을 보내
 *   데이터를 읽고(GET), 쓰고(POST), 삭제(DELETE)
 * - HTML Sanitization: XSS(스크립트 주입) 공격을 방지하기 위해
 *   데이터베이스에서 꺼낸 HTML을 렌더링 전에 정제
 *
 * 【핵심 함수 흐름】
 * ┌─ processAndSend() ─→ fetchWithFallback() ─→ cleanHtml() ─→ 클립보드 복사 + 이메일
 * ├─ saveToBoard()     ─→ fetchWithFallback() ─→ cleanHtml() ─→ REST POST(Firestore 저장)
 * ├─ loadBoardREST()   ─→ REST POST(runQuery) ─→ renderBoard() ─→ sanitizeHtml()
 * └─ deletePost()      ─→ showConfirmModal() ─→ REST DELETE(Firestore 삭제)
 *
 * 【의존성】
 * - firebase-auth.js, api-config.js, auth.js (인증 + 토큰)
 * - debug-monitor.js (window.Logger 로깅)
 */

(function () {
    "use strict";

    // ─── 디버그 모드 확인 ────────────────────────────────
    const isDebug = (window.API_CONFIG && window.API_CONFIG.debugMode) || false;

    // ─── 상태 변수 ───────────────────────────────────────
    let loadedPosts = [];       // 현재 로드된 게시물 배열 (검색용 클라이언트 캐시)
    let currentUser = null;     // 로그인된 사용자 객체 (REST API 호출 시 사용)
    let pollingInterval = null; // 자동 새로고침 간격 타이머 (미사용 — 수동 새로고침 방식)

    // ─── 인증 가드 & 초기화 ─────────────────────────────
    // 로그인 상태 변화 시 자동 실행되는 콜백
    if (window.registerAuthListener) {
        window.registerAuthListener(user => {
            if (window.Logger && isDebug) window.Logger.info(`인증 상태 변경: ${user ? user.email : "미로그인"}`);
            currentUser = user;

            if (!user) {
                // 미로그인 → 메인 페이지로 강제 이동
                window.location.replace("../index.html");
            } else {
                // 로그인 완료 → 게시판 데이터 로드 시작
                initBoardPolling(user);
            }
        });
    }

    // ─── DOM 요소 참조 (DOMContentLoaded에서 초기화) ─────
    // HTML 파싱 전에는 DOM에 접근할 수 없으므로 변수 선언만 수행
    let statusArea = null;    // 상태 메시지 표시 영역
    let sendBtn = null;       // "Capture & Email" 버튼
    let saveBtn = null;       // "Save to Board" 버튼
    let urlInput = null;      // URL 입력 필드
    let debugConsole = null;  // 디버그 콘솔 영역

    // ─── 로깅 함수 ──────────────────────────────────────
    /**
     * 페이지 내 디버그 콘솔 + 중앙 Logger에 로그를 출력합니다.
     * @param {string} message - 로그 메시지
     * @param {string} type - 'info', 'warn', 'error', 'success'
     */
    function log(message, type = 'info') {
        // 중앙 Logger(debug-monitor.js)로 전달
        if (window.Logger) {
            type === 'error' ? window.Logger.error(message) :
                type === 'success' ? window.Logger.success(message) :
                    window.Logger.info(message);
        } else {
            console.log(`[${type}] ${message}`);
        }

        // 페이지 내 디버그 콘솔에 출력
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
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 100%; margin: 0; padding: 20px; background: #fff; box-sizing: border-box;">
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
                        <div style="display: flex; gap: 6px;">
                            <button class="email-btn" style="background: #3b82f6; border: none; border-radius: 4px; color: white; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;">📧 Email</button>
                            <button class="delete-btn" data-id="${post.id}" style="background: #ef4444; border: none; border-radius: 4px; color: white; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                        </div>
                    </div>
                </div>
                
                <!-- Expanded Content Area (콘텐츠는 JS로 별도 삽입 - XSS 방지) -->
                <div class="post-content" style="display: none; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 1rem; color: #cbd5e1; font-size: 0.95rem; overflow-x: auto; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 10px 5px; width: 100%; box-sizing: border-box;">
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

            li.querySelector('.email-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                emailSavedPost(post);
            });

            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deletePost(e.target.dataset.id);
            });

            listEl.appendChild(li);
        });
    }

    /**
     * 저장된 포스트 콘텐츠를 클립보드에 복사하고 이메일 클라이언트를 엽니다.
     * 기존 processAndSend()와 동일한 UX이지만, URL에서 다시 fetch하지 않고
     * DB에 이미 저장된 content를 사용합니다.
     * @param {Object} post - { title, url, content } 포스트 객체
     */
    async function emailSavedPost(post) {
        try {
            const safeHtml = sanitizeHtml(post.content);
            const blobHtml = new Blob([safeHtml], { type: "text/html" });
            const blobText = new Blob([post.url || ''], { type: "text/plain" });

            await navigator.clipboard.write([
                new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })
            ]);

            showStatus("Content Copied! Opening Email...", "success");
            log(`Email: "${post.title}" copied to clipboard`, 'success');

            const subject = `Web Page: ${post.title || 'Saved Post'}`;
            const body = `Original URL: ${post.url || 'N/A'}\n\n[Paste content here]`;
            setTimeout(() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }, 500);

        } catch (error) {
            log(`Email Error: ${error.message}`, 'error');
            showStatus(`Email failed: ${error.message}`, 'error');
        }
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

        // URL 입력 필드 클리어 버튼
        const clearUrlBtn = document.getElementById('clearUrlBtn');
        if (clearUrlBtn && urlInput) {
            clearUrlBtn.addEventListener('click', () => {
                urlInput.value = '';
                urlInput.focus();
            });
        }

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
