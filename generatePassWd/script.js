/**
 * ============================================================
 * 보안 비밀번호 생성기 (generatePassWd/script.js)
 * ============================================================
 *
 * 【이 파일의 역할】
 * Google 뉴스 헤드라인에서 단어를 추출하여 기억하기 쉬운 비밀번호를 생성합니다.
 * 모든 처리는 브라우저(클라이언트)에서만 이루어지며, 서버로 비밀번호가 전송되지 않습니다.
 *
 * 【비밀번호 생성 원리】
 * 1. Google News RSS → 뉴스 헤드라인 가져오기
 * 2. 헤드라인에서 단어 추출 → 각 단어의 첫 글자(또는 N번째 글자) 수집
 * 3. 수집한 글자들을 조합 + 특수문자 추가 → 비밀번호 완성
 * 4. 원본 문장을 함께 표시 → "Oh, 이 문장의 첫 글자!"로 기억
 *
 * 【핵심 함수 흐름】
 * generatePassword() ─→ fetchNewsSentence() ─→ extractPasswordCharacters() ─→ 화면 렌더링
 *
 * 【의존성】
 * - firebase-auth.js, api-config.js, auth.js (인증)
 * - rss2json.com API (뉴스 RSS를 JSON으로 변환하는 외부 서비스)
 *
 * 【IIFE 패턴】
 * 전체 코드가 (function() { ... })() 안에 있어 전역 변수 오염을 방지합니다.
 * 외부에서 호출할 필요가 없으므로 window에 아무것도 등록하지 않습니다.
 */

(function () {
    "use strict";

    // ─── 상태 변수 ───────────────────────────────────────
    let currentSourceSentence = ""; // 비밀번호 생성에 사용된 원본 문장 (이메일 전송용)

    // ─── 인증 가드 ───────────────────────────────────────
    // 로그인하지 않은 사용자는 메인 페이지로 리다이렉트
    if (window.registerAuthListener) {
        window.registerAuthListener(user => {
            if (user) {
                // 로그인 상태 — 정상 사용 가능
            } else {
                // 미로그인 — 메인 페이지로 강제 이동
                window.location.replace("../index.html");
            }
        });
    }

    // ─── 문자 풀 (비밀번호에 사용될 문자 집합) ──────────
    const CHARS = {
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",    // 대문자
        lower: "abcdefghijklmnopqrstuvwxyz",    // 소문자
        digit: "0123456789",                     // 숫자
        special: "!@#$%^&*"                      // 특수문자
    };

    // ─── 비상용 단어 풀 (뉴스 가져오기 실패 시 사용) ────
    const FALLBACK_WORDS = [
        "Apple", "Brave", "Cloud", "Delta", "Eagle", "Flame", "Grape", "Hazel", "Igloo", "Joker",
        "Karma", "Lemon", "Mango", "Noble", "Ocean", "Piano", "Quest", "Radio", "Solar", "Tiger",
        "Union", "Vivid", "Whale", "Xenon", "Yacht", "Zebra", "Alpha", "Berry", "Crisp", "Drive"
    ];

    /**
     * 보안 난수 생성 (Rejection Sampling 알고리즘)
     *
     * 【왜 Math.random()을 쓰지 않는가?】
     * Math.random()은 예측 가능한 의사 난수(PRNG)를 생성하므로 보안 용도에 부적합합니다.
     * window.crypto.getRandomValues()는 운영체제의 엔트로피 소스를 사용하는 CSPRNG입니다.
     *
     * 【Rejection Sampling이란?】
     * 단순히 (난수 % max)를 하면 작은 값이 더 자주 나옵니다(모듈러 바이어스).
     * max의 배수로 범위를 제한하고, 범위 밖의 값은 버리고 다시 뽑습니다.
     *
     * @param {number} max - 상한값 (0 이상 max 미만의 정수 반환)
     * @returns {number} 균등 분포의 안전한 난수
     */
    function secureRandom(max) {
        if (max <= 0) return 0;
        const array = new Uint32Array(1);
        const limit = Math.floor(0x100000000 / max) * max;
        do {
            window.crypto.getRandomValues(array);
        } while (array[0] >= limit);
        return array[0] % max;
    }

    /**
     * 페이지 내 디버그 콘솔에 로그를 출력합니다.
     * window.Logger(중앙 로거)가 있으면 그쪽에도 전달합니다.
     *
     * @param {string} message - 로그 메시지
     * @param {string} type - 로그 유형: 'info', 'warn', 'error', 'success'
     */
    function log(message, type = 'info') {
        // 중앙 Logger(debug-monitor.js)로 전달
        if (window.Logger) {
            const fn = window.Logger[type] || window.Logger.info;
            fn(message);
        }

        // 페이지 내 디버그 콘솔에 출력
        const consoleEl = document.getElementById('debugConsole');
        if (consoleEl) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            const time = new Date().toLocaleTimeString([], { hour12: false });
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    /**
     * Fetches headlines from Google News via RSS Proxy.
     * @param {number} minWords - Minimum number of words required.
     * @returns {Promise<string[]>} Array of word tokens.
     */
    async function fetchNewsSentence(minWords) {
        // Updated to use centralized config
        const PROXY_URL = (window.API_CONFIG && window.API_CONFIG.endpoints && window.API_CONFIG.endpoints.rssProxy)
            ? window.API_CONFIG.endpoints.rssProxy
            : "https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en";

        try {
            log("Fetching headlines from Google News...", 'info');
            const response = await fetch(PROXY_URL);
            const data = await response.json();

            if (data.status !== 'ok') throw new Error("RSS API failed");

            // Select a random item
            const items = data.items;
            if (!items || items.length === 0) throw new Error("No news items found");

            const item = items[secureRandom(items.length)];
            const rawText = item.title + ". " + (item.description || "");

            // Clean HTML tags from description if any
            const cleanTextVal = rawText.replace(/<[^>]*>?/gm, '');

            log(`Selected Source: "${item.title.substring(0, 30)}..."`, 'info');

            // Segment into sentences
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            let sentences = Array.from(segmenter.segment(cleanTextVal))
                .map(s => s.segment.trim())
                .filter(s => s.length > 20); // Filter out short junk

            if (sentences.length === 0) throw new Error("No valid sentences found");

            // Combine sentences until we have enough words
            let combinedTokens = [];
            let combinedSentence = "";

            for (const s of sentences) {
                // Simple split by space for word counting
                const words = s.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w));

                if (combinedTokens.length < minWords) {
                    combinedTokens = combinedTokens.concat(words);
                    combinedSentence += s + " ";
                } else {
                    break;
                }
            }

            // Update global source sentence
            currentSourceSentence = combinedSentence.trim();

            // Add special char at the end for structure
            combinedTokens.push(CHARS.special[secureRandom(CHARS.special.length)]);

            return combinedTokens;

        } catch (e) {
            log(`News Fetch Failed: ${e.message}. Using fallback words.`, 'warn');
            currentSourceSentence = "Fallback Random Words";
            // Fallback generation
            let tokens = [];
            for (let i = 0; i < minWords; i++) {
                tokens.push(FALLBACK_WORDS[secureRandom(FALLBACK_WORDS.length)]);
            }
            tokens.push(CHARS.special[secureRandom(CHARS.special.length)]);
            return tokens;
        }
    }

    /**
     * Extracts characters from tokens to form a password.
     * @param {string[]} sentenceTokens - Array of words/tokens.
     * @param {number} targetLength - Desired password length.
     * @returns {Object} Object containing `password` string and `indices` array.
     */
    function extractPasswordCharacters(sentenceTokens, targetLength) {
        let password = "";
        let highlightedIndices = []; // Stores [wordIndex, charIndex] for each extracted char

        // Last token is always the special char we added
        const specialTokenIndex = sentenceTokens.length - 1;
        const specialChar = sentenceTokens[specialTokenIndex];

        const wordTokens = sentenceTokens.slice(0, -1);

        // We need (targetLength - 1) chars from words, +1 special char
        const neededFromWords = targetLength - 1;

        let charOffset = 0; // Which character of the word we are taking (0 = first letter)
        let collectedCount = 0;

        // Strategy: Take 1st letter of all words, then 2nd letter of all words, etc.
        while (collectedCount < neededFromWords) {
            let extractedInThisPass = 0;

            for (let i = 0; i < wordTokens.length; i++) {
                if (collectedCount >= neededFromWords) break;

                const word = wordTokens[i];

                if (charOffset < word.length) {
                    // Take character at charOffset
                    password += word.charAt(charOffset);
                    highlightedIndices.push([i, charOffset]);
                    collectedCount++;
                    extractedInThisPass++;
                }
            }

            // Safety break if we ran out of characters in all words
            if (extractedInThisPass === 0 && charOffset > 20) {
                log("Warning: Ran out of characters in sentence words. Padding with random.", 'warn');
                break;
            }

            charOffset++;
        }

        // If still not enough (rare case), pad with random
        while (collectedCount < neededFromWords) {
            const charPool = CHARS.upper + CHARS.lower + CHARS.digit;
            password += charPool[secureRandom(charPool.length)];
            collectedCount++;
        }

        // Append special char
        password += specialChar;
        highlightedIndices.push([specialTokenIndex, 0]);

        return { password, indices: highlightedIndices };
    }

    /**
     * Main function to generate password based on UI inputs.
     */
    async function generatePassword() {
        const lengthInput = document.getElementById('length');
        let length = parseInt(lengthInput.value);
        if (length < 8) length = 8;
        if (length > 64) length = 64;

        const resultSection = document.getElementById('resultSection');
        const passwordOutput = document.getElementById('passwordOutput');
        const mnemonicOutput = document.getElementById('mnemonicOutput');
        const debugConsole = document.getElementById('debugConsole');

        // Clear previous
        debugConsole.innerHTML = '';
        resultSection.style.display = 'none';

        log("Starting generation...", 'info');

        // 1. Get Source Material
        // We aim for approx 1.5x words needed to ensure enough first letters.
        // But since we fallback to 2nd/3rd letters, 1:1 is mostly enough.
        const tokens = await fetchNewsSentence(length + 5);

        // 2. Extract Password
        const { password, indices } = extractPasswordCharacters(tokens, length);

        // 3. Render Result
        passwordOutput.innerText = password;

        // Render Mnemonic with highlighting
        mnemonicOutput.innerHTML = '';

        tokens.forEach((token, tokenIdx) => {
            const span = document.createElement('span');
            span.className = 'mnemonic-word';

            // Check if any char in this token was used
            // indices is array of [tokenIdx, charIdx]
            const usedChars = indices.filter(pair => pair[0] === tokenIdx).map(pair => pair[1]);

            if (usedChars.length > 0) {
                // Highlight used characters
                let htmlHTML = "";
                for (let i = 0; i < token.length; i++) {
                    if (usedChars.includes(i)) {
                        htmlHTML += `<span class="highlight-char">${token[i]}</span>`;
                    } else {
                        htmlHTML += token[i];
                    }
                }
                span.innerHTML = htmlHTML;
            } else {
                span.innerText = token;
            }

            mnemonicOutput.appendChild(span);
            // Add space
            mnemonicOutput.appendChild(document.createTextNode(" "));
        });

        resultSection.style.display = 'block';
        log("Password generation complete.", 'success');
    }

    /**
     * Copies the generated password to clipboard.
     */
    function copyToClipboard() {
        const password = document.getElementById('passwordOutput').innerText;
        if (password) {
            navigator.clipboard.writeText(password).then(() => {
                // [UX] alert() 제거 → log()로 대체 (이미 debugConsole이 있음)
                log("Password copied to clipboard!", 'success');
            }).catch(err => {
                log(`Clipboard copy failed: ${err.message}`, 'error');
            });
        }
    }

    /**
     * Opens user's email client with the generated password details.
     */
    function sendEmail() {
        const password = document.getElementById('passwordOutput').innerText;
        const usage = document.getElementById('usage').value || "Service";
        const subject = `New Password for ${usage}`;
        const body = `Service: ${usage}\nPassword: ${password}\n\nGenerated secure password.\n\nSource Sentence:\n"${currentSourceSentence}"`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        log("Opened email client.", 'info');
    }

    // [MAINT] 전역 window 노출 제거 - DOMContentLoaded에서 직접 addEventListener로 연결
    document.addEventListener('DOMContentLoaded', () => {
        const generateBtn = document.getElementById('generateBtn');
        const passwordDisplay = document.getElementById('passwordDisplay');
        const sendEmailBtn = document.getElementById('sendEmailBtn');

        // Generate 버튼
        if (generateBtn) generateBtn.addEventListener('click', generatePassword);
        // 비밀번호 표시 영역 클릭 → 클립보드 복사
        if (passwordDisplay) passwordDisplay.addEventListener('click', copyToClipboard);
        // 이메일 전송 버튼
        if (sendEmailBtn) sendEmailBtn.addEventListener('click', sendEmail);
    });

})();
