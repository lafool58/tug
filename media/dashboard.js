// Data containing full translation texts for modal rendering
// translatorData is loaded externally from media/translations.js

const modalOverlay = document.getElementById('readerModal');
const modalHeader = document.getElementById('modalHeader');
const modalOutlet = document.getElementById('modalOutlet');
const modalTitle = document.getElementById('modalTitle');
const modalMetaAuthor = document.getElementById('modalMetaAuthor');
const modalMetaScore = document.getElementById('modalMetaScore');
const modalContent = document.getElementById('modalContent');
const modalSourceLink = document.getElementById('modalSourceLink');

// Open Modal and render specific critic review contents
function openReader(key) {
    const data = translatorData[key];
    if (!data) return;

    // Render Header with custom color/gradient
    modalHeader.style.background = data.gradient;
    modalOutlet.innerText = data.outlet;
    modalTitle.innerText = data.title;
    modalMetaAuthor.innerText = `작성자: ${data.author}`;
    modalMetaScore.innerText = `평점: ${data.score}`;
    
    // Render content sections dynamically
    modalContent.innerHTML = '';
    data.sections.forEach(sec => {
        if (sec.title && sec.text) {
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'modal-section-title';
            sectionTitle.innerText = sec.title;
            
            const paragraph = document.createElement('p');
            paragraph.innerText = sec.text;

            modalContent.appendChild(sectionTitle);
            modalContent.appendChild(paragraph);
        } else if (sec.quote) {
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'modal-highlight-quote';
            
            const qParagraph = document.createElement('p');
            qParagraph.innerText = `"${sec.quote}"`;
            
            const qSource = document.createElement('div');
            qSource.className = 'modal-highlight-source';
            qSource.innerText = `— ${sec.quoteSource}`;

            quoteDiv.appendChild(qParagraph);
            quoteDiv.appendChild(qSource);
            modalContent.appendChild(quoteDiv);
        }
    });

    // Set link
    modalSourceLink.href = data.link;

    // Open overlay
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock main scroll
}

// Close Modal
function closeReader(event) {
    if (event && event.target !== modalOverlay && !event.target.classList.contains('modal-close-btn')) {
        return;
    }
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto'; // Unlock main scroll
}

// Animation helper to draw circular gauge bar
function animateGauge(circleId, score, maxScore) {
    const circle = document.getElementById(circleId);
    if (!circle) return;
    
    // Get total circumference from dasharray
    let strokeDasharray = parseFloat(window.getComputedStyle(circle).strokeDasharray);
    
    // Calculate radius and circumference dynamically as a fallback
    const r = parseFloat(circle.getAttribute('r')) || 70;
    const calculatedCircumference = 2 * Math.PI * r;
    
    if (isNaN(strokeDasharray) || strokeDasharray <= 0) {
        strokeDasharray = calculatedCircumference;
    }
    
    // Ensure stroke-dasharray is set explicitly
    circle.style.strokeDasharray = strokeDasharray;
    
    // Calculate offset based on score
    const progress = score / maxScore;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * progress);
    
    // Set dashoffset dynamically with transition
    circle.style.strokeDashoffset = strokeDashoffset;
}

// Initialize and animate all gauges after window load
window.addEventListener('load', () => {
    // Delay slightly to allow the DOM rendering and CSS gradients
    setTimeout(() => {
        // --- 📊 Dynamic Gauge Score Parser ---
        const getScoreFromElement = (selector, defaultValue) => {
            const el = document.querySelector(selector);
            if (!el) return defaultValue;
            const text = el.textContent.trim();
            const score = parseFloat(text);
            return isNaN(score) ? defaultValue : score;
        };

        const getMiniScore = (id, defaultValue) => {
            const circle = document.getElementById(id);
            if (!circle) return defaultValue;
            const wrapper = circle.closest('.mini-gauge-wrapper');
            if (!wrapper) return defaultValue;
            const textEl = wrapper.querySelector('.mini-gauge-text');
            if (!textEl) return defaultValue;
            const score = parseFloat(textEl.textContent.trim());
            return isNaN(score) ? defaultValue : score;
        };

        // Parse scores dynamically from the HTML, with safe fallback defaults for the Master Template preview
        const mainScore = getScoreFromElement('.gauge-number', 8.5);
        const q1 = getMiniScore('gaugeFillKrCritic', 8.2);
        const q2 = getMiniScore('gaugeFillKrAud', 8.6);
        const q3 = getMiniScore('gaugeFillGlCritic', 8.4);
        const q4 = getMiniScore('gaugeFillGlAud', 8.8);

        // Main score (perimeter 440)
        animateGauge('mainGaugeFill', mainScore, 10.0);

        // Q1: 국내 평론가
        animateGauge('gaugeFillKrCritic', q1, 10.0);

        // Q2: 국내 관객
        animateGauge('gaugeFillKrAud', q2, 10.0);

        // Q3: 해외 평론가
        animateGauge('gaugeFillGlCritic', q3, 10.0);

        // Q4: 해외 관객
        animateGauge('gaugeFillGlAud', q4, 10.0);

        // --- 🎬 Dynamic Theater Guide HUD Gauge Animation ---
        const imaxFill = document.querySelector('.imax-gauge-fill');
        const dolbyFill = document.querySelector('.dolby-gauge-fill');
        const fourdxFill = document.querySelector('.fourdx-gauge-fill');
        const standardFill = document.querySelector('.standard-gauge-fill');

        const parseTheaterScore = (fillEl, defaultValue) => {
            if (!fillEl) return defaultValue;
            const row = fillEl.closest('.theater-metric-row');
            if (!row) return defaultValue;
            const scoreSpan = row.querySelector('.theater-metric-score');
            if (!scoreSpan) return defaultValue;
            const text = scoreSpan.textContent;
            const match = text.match(/([0-9.]+)\s*\/\s*10/);
            return match ? parseFloat(match[1]) : parseFloat(text) || defaultValue;
        };

        const imaxScore = parseTheaterScore(imaxFill, 8.5);
        const dolbyScore = parseTheaterScore(dolbyFill, 9.2);
        const fourdxScore = parseTheaterScore(fourdxFill, 8.0);
        const standardScore = parseTheaterScore(standardFill, 7.8);

        if (imaxFill) imaxFill.style.width = (imaxScore * 10) + '%';
        if (dolbyFill) dolbyFill.style.width = (dolbyScore * 10) + '%';
        if (fourdxFill) fourdxFill.style.width = (fourdxScore * 10) + '%';
        if (standardFill) standardFill.style.width = (standardScore * 10) + '%';
    }, 100);
});

// ESC Key close event for modal
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReader();
    }
});

// My Rating Interactive Logic
document.addEventListener('DOMContentLoaded', () => {
    // Sort theater metric rows in descending order of score dynamically
    const theaterGuideCard = document.getElementById('theaterGuideCard');
    if (theaterGuideCard) {
        const rows = Array.from(theaterGuideCard.querySelectorAll('.theater-metric-row'));
        const parseScore = (row) => {
            const scoreSpan = row.querySelector('.theater-metric-score');
            if (!scoreSpan) return 0;
            const text = scoreSpan.textContent;
            const match = text.match(/([0-9.]+)\s*\/\s*10/);
            return match ? parseFloat(match[1]) : parseFloat(text) || 0;
        };
        const hasValidScores = rows.some(r => {
            const val = parseScore(r);
            return !isNaN(val) && val > 0;
        });
        if (hasValidScores) {
            rows.sort((a, b) => parseScore(b) - parseScore(a));
            rows.forEach(row => theaterGuideCard.appendChild(row));
        }
    }

    const stars = document.querySelectorAll('#interactiveStars span');
    const scoreDisplay = document.getElementById('myRatingScore');
    const saveBtn = document.getElementById('saveRatingBtn');
    const confirmMsg = document.getElementById('saveConfirmMsg');

    const movieKey = document.body.getAttribute('data-movie-key') || 'mandalorian';
    const MOVIE_KEY = 'tug_rating_' + movieKey;
    let currentScore = 0;

    // Update star visuals
    const updateStars = (score) => {
        stars.forEach(s => {
            const val = parseInt(s.getAttribute('data-val'));
            s.classList.remove('active', 'half');
            s.style.background = '';
            s.style.webkitBackgroundClip = '';
            s.style.webkitTextFillColor = '';
            
            if (val <= score) {
                s.classList.add('active');
            }
        });
    };

    const commentInput = document.getElementById('commentInput');

    // Load from localStorage
    const loadRating = () => {
        const saved = localStorage.getItem(MOVIE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            currentScore = data.score || 0;
            scoreDisplay.textContent = currentScore.toFixed(1);
            updateStars(currentScore);
            if (commentInput) commentInput.value = data.comment || '';
        } else {
            currentScore = 0;
            scoreDisplay.textContent = "0.0";
            updateStars(0);
            if (commentInput) commentInput.value = '';
        }
    };

    // Save rating to localStorage & cloud helper
    const saveRatingLocallyAndCloud = () => {
        const commentText = commentInput ? commentInput.value.trim() : '';
        if (currentScore === 0 && commentText === '') {
            localStorage.removeItem(MOVIE_KEY);
            pushToCloud(CLOUD_KEY, null);
            pushValueToCloud(CLOUD_KEY.replace('rating', 'comment'), '0');
        } else {
            const data = { score: currentScore, comment: commentText };
            localStorage.setItem(MOVIE_KEY, JSON.stringify(data));
            pushToCloud(CLOUD_KEY, data);
            pushValueToCloud(CLOUD_KEY.replace('rating', 'comment'), safeBtoa(commentText));
        }
    };

    // Star click (whole stars only)
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(star.getAttribute('data-val'));
            // val === 2 means first star; clicking it again resets to 0
            if (val === 2 && currentScore === 2) {
                currentScore = 0;
            } else {
                currentScore = val;
            }
            scoreDisplay.textContent = currentScore.toFixed(1);
            updateStars(currentScore);
            saveRatingLocallyAndCloud();
        });

        // Hover preview (whole stars only)
        star.addEventListener('mousemove', (e) => {
            const val = parseInt(star.getAttribute('data-val'));
            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-val'));
                s.classList.remove('active', 'half');
                s.style.background = '';
                s.style.webkitBackgroundClip = '';
                s.style.webkitTextFillColor = '';
                if (sVal <= val) s.classList.add('active');
            });
        });

        star.addEventListener('mouseleave', () => {
            updateStars(currentScore);
        });
    });

    const SYNC_TOKEN = "9cmvofbs";
    const SYNC_BASE = "https://keyvalue.immanuel.co/api/KeyVal";
    const CLOUD_KEY = MOVIE_KEY.replace('tug_rating_', '') + '_rating';

    function safeBtoa(str) {
        if (!str) return "";
        try {
            const utf8Str = unescape(encodeURIComponent(str));
            const base64 = btoa(utf8Str);
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        } catch(e) {
            return "";
        }
    }

    function safeAtob(safeBase64) {
        if (!safeBase64) return "";
        let base64 = safeBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        try {
            const utf8Str = atob(base64);
            return decodeURIComponent(escape(utf8Str));
        } catch(e) {
            return "";
        }
    }

    function pushValueToCloud(key, val) {
        fetch(`${SYNC_BASE}/UpdateValue/${SYNC_TOKEN}/${key}/${val}`, {
            method: 'POST',
            body: '0'
        }).catch(e => console.error('TUG Cloud Sync: push failed for ' + key, e));
    }

    function pushToCloud(key, value) {
        let cloudVal = "0";
        if (value && typeof value === 'object' && value.score !== undefined) {
            cloudVal = String(value.score).replace('.', '_');
        } else if (value && typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                cloudVal = String(parsed.score || 0).replace('.', '_');
            } catch(e) {
                cloudVal = value.replace('.', '_');
            }
        } else {
            cloudVal = "0";
        }
        pushValueToCloud(key, cloudVal);
    }

    const syncWithCloud = () => {
        fetch(`${SYNC_BASE}/GetValue/${SYNC_TOKEN}/${CLOUD_KEY}`)
            .then(res => res.text())
            .then(text => {
                if (text && text.trim() !== "" && text !== "null") {
                    let cleanVal = text.trim().replace(/^"|"$/g, '');
                    if (cleanVal === "0" || cleanVal === "") {
                        if (localStorage.getItem(MOVIE_KEY)) {
                            localStorage.removeItem(MOVIE_KEY);
                            currentScore = 0;
                            scoreDisplay.textContent = "0.0";
                            updateStars(0);
                            if (commentInput) commentInput.value = "";
                        }
                        return;
                    }
                    const score = parseFloat(cleanVal.replace('_', '.'));
                    
                    // Fetch comment
                    const commentKey = CLOUD_KEY.replace('rating', 'comment');
                    fetch(`${SYNC_BASE}/GetValue/${SYNC_TOKEN}/${commentKey}`)
                        .then(res2 => res2.text())
                        .then(text2 => {
                            let commentText = "";
                            if (text2 && text2.trim() !== "" && text2 !== "null") {
                                let cleanComment = text2.trim().replace(/^"|"$/g, '');
                                commentText = safeAtob(cleanComment);
                            }

                            const localData = JSON.stringify({ score: score, comment: commentText });
                            const saved = localStorage.getItem(MOVIE_KEY);
                            let needUpdate = false;
                            if (!saved) {
                                needUpdate = true;
                            } else {
                                try {
                                    const parsed = JSON.parse(saved);
                                    if (parsed.score !== score || parsed.comment !== commentText) {
                                        needUpdate = true;
                                    }
                                } catch(e) {
                                    needUpdate = true;
                                }
                            }

                            if (needUpdate) {
                                localStorage.setItem(MOVIE_KEY, localData);
                                currentScore = score;
                                scoreDisplay.textContent = currentScore.toFixed(1);
                                updateStars(currentScore);
                                if (commentInput) commentInput.value = commentText;
                            }
                        });
                }
            })
            .catch(e => console.warn('TUG Cloud Sync: pull failed'));
    };

    // Save button
    saveBtn.addEventListener('click', () => {
        saveRatingLocallyAndCloud();
        confirmMsg.classList.add('show');
        setTimeout(() => {
            confirmMsg.classList.remove('show');
        }, 2000);
    });

    loadRating();
    syncWithCloud();
    setInterval(syncWithCloud, 3000);

    // Sync instantly when another tab (e.g. mobile dashboard) updates localStorage
    window.addEventListener('storage', (e) => {
        if (e.key === MOVIE_KEY) loadRating();
    });

    // === 🌎 TUG Translation Self-Verification (Method 1) ===
    const verifyTranslations = () => {
        const isLocalDev = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.protocol === 'file:';
        
        const reviewTextElements = document.querySelectorAll('.review-text-quote, .review-quote-text');
        
        reviewTextElements.forEach(el => {
            const text = el.textContent || el.innerText || "";
            const hasEnglish = /[a-zA-Z]{4,}/.test(text);
            const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
            
            if (hasEnglish && !hasKorean) {
                const cardItem = el.closest('.review-card-item, .review-quote-item');
                if (cardItem) {
                    if (isLocalDev) {
                        cardItem.style.border = '2px dashed #e74c3c';
                        cardItem.style.position = 'relative';
                        cardItem.style.paddingTop = '24px';
                        
                        if (!cardItem.querySelector('.translation-warning-badge')) {
                            const badge = document.createElement('span');
                            badge.className = 'translation-warning-badge';
                            badge.innerText = '⚠️ 번역 누락 감지 (원격 배포 불가)';
                            badge.style.cssText = 'position: absolute; top: 4px; right: 10px; background: #e74c3c; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-family: "Noto Sans KR", sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;';
                            cardItem.appendChild(badge);
                        }
                    } else {
                        cardItem.style.display = 'none';
                    }
                }
            }
        });
    };
    verifyTranslations();
});
