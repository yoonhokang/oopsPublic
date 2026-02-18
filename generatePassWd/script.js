// Restored Log Function
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

// Auth Listener for Header UI
if (firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        console.log("AuthStateChanged:", user ? user.email : "No User");
        renderAuthUI(user);

        if (!user) {
            // Strict Auth Redirect
            window.location.replace("../index.html");
        }
    });
} else {
    console.error("firebase.auth not available!");
}

// Character Sets (No longer directly used for generation, but kept for reference if needed)
const CHARS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digit: '0123456789',
    special: '!@#*'
};

// Word Pools for Grammatical Sentence Generation
const ADJECTIVES = [
    'Big', 'Small', 'Fast', 'Slow', 'Happy', 'Sad', 'Cold', 'Hot', 'Red', 'Blue',
    'Green', 'Dark', 'Bright', 'Loud', 'Quiet', 'Hard', 'Soft', 'New', 'Old', 'Rich',
    'Poor', 'Wise', 'Cool', 'Warm', 'Deep', 'High', 'Wet', 'Dry', 'Clean', 'Dirty',
    'Tiny', 'Giant', 'Round', 'Flat', 'Broad', 'Sharp', 'Azure', 'Crimson', 'Golden', 'Dim',
    'Shiny', 'Eager', 'Fierce', 'Jolly', 'Kind', 'Rough', 'Silky', 'Sticky', 'Fuzzy', 'Rapid',
    'Swift', 'Ancient', 'Modern', 'Brief', 'Cruel', 'Gentle', 'Proud', 'Humble', 'Sour', 'Sweet',
    'Bitter', 'Salty', 'Spicy', 'Tasty', 'Faint', 'Heavy', 'Light', 'Misty', 'Clear', 'Opaque',
    'Vivid', 'Pale', 'Dull', 'Fancy', 'Plain', 'Vast', 'Narrow', 'Steep', 'Level', 'Smooth',
    'Bumpy', 'Grumpy', 'Lazy', 'Busy', 'Wild', 'Tame', 'Calm', 'Windy', 'Rainy', 'Sunny',
    'Snowy', 'Icy', 'Holy', 'Evil', 'Good', 'Bad', 'Fit', 'Fat', 'Thin', 'Thick'
];

const NOUNS = [
    'cat', 'dog', 'man', 'woman', 'bird', 'fish', 'car', 'bus', 'sky', 'sun',
    'moon', 'star', 'tree', 'flower', 'book', 'pen', 'phone', 'computer', 'code', 'data',
    'game', 'food', 'water', 'fire', 'wind', 'earth', 'music', 'love', 'hope', 'dream',
    'panda', 'tiger', 'eagle', 'shark', 'whale', 'beetle', 'river', 'mountain', 'forest', 'galaxy',
    'nebula', 'storm', 'robot', 'drone', 'laser', 'pixel', 'cyber', 'server', 'sofa', 'lamp',
    'mirror', 'clock', 'piano', 'spoon', 'logic', 'magic', 'power', 'glory', 'truth', 'chaos',
    'city', 'town', 'village', 'road', 'path', 'gate', 'door', 'key', 'lock', 'box',
    'bag', 'hat', 'shoe', 'ship', 'boat', 'plane', 'train', 'bike', 'king', 'queen',
    'prince', 'hero', 'villain', 'ghost', 'witch', 'wizard', 'angel', 'demon', 'soul', 'mind',
    'heart', 'body', 'face', 'eye', 'hand', 'foot', 'arm', 'leg', 'bone', 'blood'
];

const VERBS = [
    'eats', 'drinks', 'runs', 'walks', 'sees', 'hears', 'likes', 'hates', 'makes', 'breaks',
    'takes', 'gives', 'finds', 'loses', 'knows', 'wants', 'needs', 'feels', 'plays', 'works',
    'calls', 'helps', 'stops', ' starts', 'opens', 'closes', 'pulls', 'pushes', 'buys', 'sells',
    'jumps', 'flies', 'swims', 'dances', 'climbs', 'crawls', 'sits', 'stands', 'sleeps', 'wakes',
    'talks', 'sings', 'shouts', 'whispers', 'writes', 'reads', 'draws', 'paints', 'cooks', 'bakes',
    'cleans', 'washes', 'drives', 'rides', 'flies', 'sails', 'throws', 'catches', 'kicks', 'hits',
    'loves', 'fears', 'hopes', 'dreams', 'thinks', 'learns', 'solves', 'guesses', 'wins', 'loses',
    'leads', 'follows', 'joins', 'leaves', 'meets', 'greets', 'hides', 'seeks', 'builds', 'burns',
    'grows', 'shrinks', 'changes', 'turns', 'moves', 'stays', 'waits', 'rushes', 'smiles', 'laughs',
    'cries', 'shines', 'glows', 'burns', 'freezes', 'melts', 'flows', 'blows', 'falls', 'rises'
];

const PREPOSITIONS = [
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'up', 'down', 'over', 'under',
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind',
    'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'inside', 'into', 'near', 'off',
    'out', 'outside', 'past', 'through', 'toward', 'under', 'upon', 'within', 'without', 'via'
];

const NUMBERS = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const ADVERBS = [
    'quickly', 'slowly', 'loudly', 'quietly', 'happily', 'sadly', 'badly', 'well', 'hard', 'softly',
    'bravely', 'calmly', 'eagerly', 'gladly', 'joyfully', 'kindly', 'madly', 'proudly', 'wisely', 'blindly',
    'boldly', 'brightly', 'busily', 'clearly', 'closely', 'cruelly', 'darkly', 'deeply', 'fairly', 'freely',
    'fully', 'gently', 'high', 'justly', 'lightly', 'low', 'near', 'neatly', 'newly', 'oddly',
    'often', 'only', 'openly', 'poorly', 'rarely', 'really', 'richly', 'rightly', 'rough', 'safely'
];

const SPECIALS = [
    '!', '@', '#', '*'
];

/**
 * Secure Random Number Generator using window.crypto
 * @param {number} max - Exclusive upper bound
 * @returns {number} Random integer in [0, max)
 */
function secureRandom(max) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
}

/**
 * Fisher-Yates Shuffle using secure random
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = secureRandom(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function generatePassword() {
    const lengthInput = document.getElementById('length');
    let length = parseInt(lengthInput.value);

    if (isNaN(length) || length < 8) {
        alert("Password length must be at least 8.");
        lengthInput.value = 8;
        length = 8;
    }

    log(`Generating password of length ${length}...`);

    // 1. Fetch Sentence (News or Internal Fallback)
    let sentenceTokens = [];

    try {
        log("Fetching news from Google RSS...");
        // Pass 'length' to ensure we get enough words if possible
        sentenceTokens = await fetchNewsSentence(length);
        log(`News sentence fetched: [${sentenceTokens.join(' ')}]`);
    } catch (error) {
        log(`News fetch failed (${error.message}). Falling back to internal generator.`, 'warn');
        sentenceTokens = generateNaturalSentence();
        log(`Internal sentence generated: [${sentenceTokens.join(' ')}]`);
    }

    // 2. Adaptive Extraction
    // Extract 'length' characters from the sentence tokens.
    const extractionResult = extractPasswordCharacters(sentenceTokens, length);
    const password = extractionResult.password;
    const highlightedIndices = extractionResult.indices; // Array of arrays: [ [charIdx, charIdx], ... ] per word

    log(`Extracted password: ${password}`);

    // 3. Update UI
    displayResult(password, sentenceTokens, highlightedIndices);
}

/**
 * Fetches sentences from Google News RSS via a proxy.
 * Logic:
 * 1. Fetch RSS JSON.
 * 2. Select random article (N-th).
 * 3. Extract description text.
 * 4. Split using Intl.Segmenter (handles U.S., etc.).
 * 5. Select FIRST sentence. Append next sentences if needed.
 * 6. Append random special char at the very end.
 */
async function fetchNewsSentence(minWords) {
    const RSS_URL = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
    const PROXY_URL = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(RSS_URL);

    const response = await fetch(PROXY_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.status !== 'ok') throw new Error('RSS API error');

    const articles = data.items;
    if (!articles || articles.length === 0) throw new Error('No articles found');

    // Pick N-th Article
    const articleIdx = secureRandom(articles.length);
    const article = articles[articleIdx];
    log(`Selected Article [${articleIdx}]: ${article.title.substring(0, 30)}...`);

    // Extract text from description (fallback to title if empty)
    let rawText = article.description || article.title || "";
    let cleanTextVal = cleanHtml(rawText);

    // Split into sentences using Intl.Segmenter for better accuracy (e.g. "U.S.")
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    // Filter out empty or text that is too short to be a real sentence
    let sentences = Array.from(segmenter.segment(cleanTextVal))
        .map(s => s.segment.trim())
        .filter(s => s.length > 20);

    // If description sentences are poor, try title
    if (sentences.length === 0) {
        log("Description sentences poor, using title.");
        cleanTextVal = cleanHtml(article.title);
        sentences = [cleanTextVal.trim()];
    }

    let combinedTokens = [];
    let sentenceIdx = 0;

    // Loop to collect enough words
    while (combinedTokens.length < minWords && sentenceIdx < sentences.length) {
        const sentence = sentences[sentenceIdx];
        const tokens = sentence.split(/\s+/);

        // Append tokens
        combinedTokens = combinedTokens.concat(tokens);

        log(`Added Sentence [${sentenceIdx}] (${tokens.length} words): ${sentence.substring(0, 30)}...`);
        sentenceIdx++;
    }

    // Append Special Character at the very end
    const special = SPECIALS[secureRandom(SPECIALS.length)];
    combinedTokens.push(special);

    return combinedTokens;
}

function cleanHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

function generateNaturalSentence() {
    // Template A: [Adj(Upper)] + [Noun] + [Verb] + [Prep] + [Number] + [Adj] + [Noun] + [Special]
    // Structure: 8 tokens

    let tokens = [];

    // 0: Adj (Upper)
    tokens.push(ADJECTIVES[secureRandom(ADJECTIVES.length)]);

    // 1: Noun
    tokens.push(NOUNS[secureRandom(NOUNS.length)]);

    // 2: Verb
    tokens.push(VERBS[secureRandom(VERBS.length)]);

    // 3: Prep
    tokens.push(PREPOSITIONS[secureRandom(PREPOSITIONS.length)]);

    // 4: Number
    tokens.push(NUMBERS[secureRandom(NUMBERS.length)]);

    // 5: Adj (Lower)
    tokens.push(ADJECTIVES[secureRandom(ADJECTIVES.length)].toLowerCase());

    // 6: Noun
    tokens.push(NOUNS[secureRandom(NOUNS.length)]);

    // 7: Special
    tokens.push(SPECIALS[secureRandom(SPECIALS.length)]);

    return tokens;
}

function extractPasswordCharacters(sentenceTokens, targetLength) {
    let password = "";
    let highlightedIndices = []; // Stores [wordIndex, charIndex] for each extracted char

    // We need to ensure the LAST token (Special char) is always included.
    // So we effectively extract (targetLength - 1) characters from the words (tokens 0 to N-2)
    // and then append the special char (token N-1).

    const specialTokenIndex = sentenceTokens.length - 1;
    const specialChar = sentenceTokens[specialTokenIndex];

    // Words are all tokens except the last one
    const wordTokens = sentenceTokens.slice(0, -1);

    // We need this many chars from the words
    const neededFromWords = targetLength - 1;

    let charOffset = 0; // 0 = 1st letter, 1 = 2nd letter, etc.
    let collectedCount = 0;

    // Adaptive Cyclic Extraction from Words
    while (collectedCount < neededFromWords) {
        let extractedInThisPass = 0;

        for (let i = 0; i < wordTokens.length; i++) {
            if (collectedCount >= neededFromWords) break;

            const word = wordTokens[i];

            if (charOffset < word.length) {
                password += word.charAt(charOffset);
                highlightedIndices.push([i, charOffset]);
                collectedCount++;
                extractedInThisPass++;
            }
        }

        if (extractedInThisPass === 0 && charOffset > 20) {
            log("Warning: Ran out of characters in sentence words. Padding with random.", 'warn');
            break;
        }

        charOffset++;
    }

    // If still short, pad with random
    while (collectedCount < neededFromWords) {
        const charPool = CHARS.upper + CHARS.lower + CHARS.digit;
        password += charPool[secureRandom(charPool.length)];
        collectedCount++;
    }

    // Finally, append the Special Character
    password += specialChar;
    // The special char is usually 1 char long, so index 0
    highlightedIndices.push([specialTokenIndex, 0]);

    return { password, indices: highlightedIndices };
}

function displayResult(password, tokens, highlightedIndices) {
    const resultSection = document.getElementById('resultSection');
    const passwordOutput = document.getElementById('passwordOutput');
    const mnemonicOutput = document.getElementById('mnemonicOutput');

    resultSection.style.display = 'flex';
    passwordOutput.textContent = password;

    // Organize highlights by word index
    // highlightingMap[wordIndex] = Set(charIndices)
    const highlightingMap = {};
    if (highlightedIndices) {
        highlightedIndices.forEach(([wordIdx, charIdx]) => {
            if (!highlightingMap[wordIdx]) highlightingMap[wordIdx] = new Set();
            highlightingMap[wordIdx].add(charIdx);
        });
    }

    const sentenceHTML = tokens.map((word, wordIdx) => {
        const highlights = highlightingMap[wordIdx];
        let wordHtml = "";

        for (let i = 0; i < word.length; i++) {
            if (highlights && highlights.has(i)) {
                wordHtml += `<span class="word-highlight">${word[i]}</span>`;
            } else {
                wordHtml += word[i];
            }
        }
        return wordHtml;
    }).join('<span class="char-break"> </span>');

    mnemonicOutput.innerHTML = sentenceHTML;
    log("UI Updated.");
}

function copyToClipboard() {
    const password = document.getElementById('passwordOutput').textContent;
    if (!password) return;

    navigator.clipboard.writeText(password).then(() => {
        const hint = document.querySelector('.copy-hint');
        const originalText = hint.textContent;
        hint.textContent = "Copied!";
        hint.style.opacity = 1;
        setTimeout(() => {
            hint.textContent = originalText;
            hint.style.opacity = "";
        }, 1500);
    });
}

function sendEmail() {
    const password = document.getElementById('passwordOutput').textContent;
    if (!password) {
        alert("Please generate a password first.");
        return;
    }

    const usage = document.getElementById('usage').value || "Unknown Service";
    const mnemonicHTML = document.getElementById('mnemonicOutput').innerText; // Use innerText to get plain words

    const subject = `[Password] ${usage}`;
    const body = `Service: ${usage}\n\nPassword: ${password}\n\nSource Sentence: ${mnemonicHTML}\n\nGenerated by Secure Password Generator`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;
    log("Email client triggered.");
}
