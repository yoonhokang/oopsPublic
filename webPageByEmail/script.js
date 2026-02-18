/**
 * Web Page to Email - Main Logic
 * 
 * Handles fetching web pages via proxies, cleaning HTML,
 * copying to clipboard, opening email client, and saving to Firestore board.
 */

// Initialize Firebase services
// Assumes firebase app is initialized in ../js/firebase-config.js
if (!firebase.apps.length) {
    console.error("Firebase not initialized! Check inclusion order.");
}
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// Auth Guard
auth.onAuthStateChanged(user => {
    if (!user) {
        // Redirect if not logged in
        console.warn("User not logged in, redirecting to home...");
        window.location.replace("../index.html");
    } else {
        currentUser = user;
        console.log(`Authenticated as ${user.displayName}`);
        loadPosts();
    }
});

// DOM Elements
const statusArea = document.getElementById('statusArea');
const sendBtn = document.getElementById('sendBtn');
const saveBtn = document.getElementById('saveBtn');
const urlInput = document.getElementById('urlInput');
const debugConsole = document.getElementById('debugConsole');
const postList = document.getElementById('postList');

// --- Logging & UI Helpers ---

function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${time}]</span><span class="log-${type}">${msg}</span>`;
    debugConsole.appendChild(entry);
    debugConsole.scrollTop = debugConsole.scrollHeight;

    if (type === 'error') console.error(msg);
    else if (type === 'warn') console.warn(msg);
    else console.log(msg);
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

// --- HTML Cleaning & Fetching ---

function cleanHtml(htmlString, baseUrl) {
    log("Cleaning HTML...", 'info');
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 1. Base URL adjustment
    const base = document.createElement('base');
    base.href = baseUrl;
    doc.head.appendChild(base);

    // 2. Remove Scripts and dangerous elements
    const elementsToRemove = doc.querySelectorAll('script, iframe, object, embed, form, button, nav, footer, style, link[rel="stylesheet"]');
    elementsToRemove.forEach(el => el.remove());

    // 2.1 Security hardening
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
        // Remove on<event> attributes
        for (let i = el.attributes.length - 1; i >= 0; i--) {
            const attr = el.attributes[i];
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        }
        // Check for javascript: protocol
        if (el.hasAttribute('href') && el.getAttribute('href').trim().toLowerCase().startsWith('javascript:')) {
            el.removeAttribute('href');
        }
        if (el.hasAttribute('src') && el.getAttribute('src').trim().toLowerCase().startsWith('javascript:')) {
            el.removeAttribute('src');
        }
    });

    // 3. Resolve relative URLs to absolute
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

    // 5. Wrap in container
    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto;">
            <p style="font-size: 0.8em; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                Source: <a href="${baseUrl}">${baseUrl}</a>
            </p>
            ${doc.body.innerHTML}
        </div>
    `;
}

async function fetchWithFallback(targetUrl) {
    const proxies = [
        { name: 'AllOrigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, type: 'json' },
        { name: 'CorsProxy.io', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, type: 'html' },
        { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, type: 'html' }
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

            if (!content || content.length < 50) {
                throw new Error("Empty or invalid content");
            }

            log(`Proxy ${proxy.name} Success. Content length: ${content.length}`, 'success');
            return content;

        } catch (error) {
            log(`Proxy ${proxy.name} failed: ${error.message}`, 'warn');
            lastError = error;
        }
    }

    log("All proxies exhausted.", 'error');
    throw new Error("All proxies failed. The site might be blocking access.");
}

// --- Main Actions ---

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

    debugConsole.innerHTML = ''; // Clear logs
    setLoading(true);
    showStatus("Fetching web page content (trying multiple proxies)...", "info");
    log(`Starting capture for: ${url}`, 'info');

    try {
        const rawHtml = await fetchWithFallback(url);
        const cleanedHtml = cleanHtml(rawHtml, url);

        // Copy to Clipboard
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
            Press <strong>Ctrl+V</strong> in the email body to paste the web page.
        `, "success");

        // Open Mailto
        const subject = `Web Page: ${new URL(url).hostname}`;
        const body = `Original URL: ${url}\n\n\n\n[Paste the web page content here using Ctrl+V]\n`;

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

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="loading-spinner"></div>';

    log(`Starting save for: ${url}`, 'info');

    try {
        const rawHtml = await fetchWithFallback(url);
        const cleanedHtml = cleanHtml(rawHtml, url);

        // Extract Title
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const pageTitle = (doc.querySelector('title') ? doc.querySelector('title').innerText : url) || "Untitled Page";

        // Save to Firestore
        if (!currentUser) throw new Error("User not authenticated");

        await db.collection('users').doc(currentUser.uid).collection('web_clipper').add({
            appId: 'web_clipper',
            title: pageTitle,
            url: url,
            content: cleanedHtml,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        log("Saved to Firestore!", 'success');
        showStatus("Successfully saved to your board!", 'success');
        loadPosts();

    } catch (error) {
        console.error(error);
        log(`Save failed: ${error.message}`, 'error');
        showStatus(`Save Error: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>Save to Board</span>';
    }
}

function loadPosts() {
    if (!postList || !currentUser) return;

    db.collection('users').doc(currentUser.uid).collection('web_clipper')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            postList.innerHTML = '';
            if (snapshot.empty) {
                postList.innerHTML = '<li style="color: #64748b; font-size: 0.9rem;">No saved posts yet.</li>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now';
                const li = document.createElement('li');
                li.style.padding = '0.75rem 0';
                li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                li.innerHTML = `
                    <div style="font-size: 0.95rem; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem;">${data.title}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">
                        ${date} • <a href="${data.url}" target="_blank" style="color: #38bdf8; text-decoration: none;">Original Link</a>
                    </div>
                `;
                postList.appendChild(li);
            });
        })
        .catch(err => {
            log(`Load posts failed: ${err.message}`, 'error');
            postList.innerHTML = '<li style="color: #f87171;">Failed to load posts.</li>';
        });
}
