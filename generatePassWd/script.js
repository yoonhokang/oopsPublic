// Hybrid Auth Migration
// Dependencies: firebase-auth.js, js/api-config.js, js/auth.js

(function () {
    "use strict";

    let currentSourceSentence = ""; // Store for email

    // Auth Guard & UI
    if (window.registerAuthListener) {
        window.registerAuthListener(user => {
            if (user) {
                // User is logged in
            } else {
                // Strict Auth Redirect for Generator as requested
                window.location.replace("../index.html");
            }
        });
    }

    // [Core Logic - Unchanged]
    // 비밀번호 생성 로직은 클라이언트 사이드 연산이므로 변경 없음.

    const CHARS = {
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        lower: "abcdefghijklmnopqrstuvwxyz",
        digit: "0123456789",
        special: "!@#$%^&*"
    };

    // Fallback Word Pool
    const FALLBACK_WORDS = [
        "Apple", "Brave", "Cloud", "Delta", "Eagle", "Flame", "Grape", "Hazel", "Igloo", "Joker",
        "Karma", "Lemon", "Mango", "Noble", "Ocean", "Piano", "Quest", "Radio", "Solar", "Tiger",
        "Union", "Vivid", "Whale", "Xenon", "Yacht", "Zebra", "Alpha", "Berry", "Crisp", "Drive"
    ];

    /**
     * Generates a secure random number within a range.
     * @param {number} max - The upper bound (exclusive).
     * @returns {number} A random integer between 0 and max-1.
     */
    function secureRandom(max) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
    }

    /**
     * Logs messages to the specific debug console and browser console.
     * @param {string} message - The message to log.
     * @param {string} [type='info'] - Log type: 'info', 'warn', 'error', 'success'.
     */
    function log(message, type = 'info') {
        const consoleEl = document.getElementById('debugConsole');
        if (consoleEl) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            const time = new Date().toLocaleTimeString([], { hour12: false });
            entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        // console.log(`[${type.toUpperCase()}] ${message}`); // Removed for Production Cleanliness
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
                alert("Password copied to clipboard!");
                log("Copied to clipboard.", 'success');
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

    // Export functions globally
    window.generatePassword = generatePassword;
    window.copyToClipboard = copyToClipboard;
    window.sendEmail = sendEmail;

})();
