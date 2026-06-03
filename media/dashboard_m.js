const movieKey = document.body.getAttribute('data-movie-key') || 'mandalorian';
const stars = Array.from(document.querySelectorAll('.star-icon'));
const commentInput = document.getElementById('commentInput');
const submitBtn = document.getElementById('submitBtn');
const saveToast = document.getElementById('saveToast');

let selectedRating = 0;

// Base64 helper functions (synced with desktop)
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

const saveRatingLocallyAndCloud = () => {
    const commentText = commentInput ? commentInput.value.trim() : '';
    if (selectedRating === 0 && commentText === '') {
        localStorage.removeItem('tug_rating_' + movieKey);
        pushToCloud(movieKey + '_rating', null);
        pushValueToCloud(movieKey + '_comment', '0');
    } else {
        const dataToSave = {
            score: selectedRating * 2,
            comment: commentText,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('tug_rating_' + movieKey, JSON.stringify(dataToSave));
        pushToCloud(movieKey + '_rating', dataToSave);
        pushValueToCloud(movieKey + '_comment', safeBtoa(commentText));
    }
};

// Interactive Stars logic (whole stars only)
stars.forEach(star => {
    star.addEventListener('click', (e) => {
        const value = parseInt(star.getAttribute('data-value'));
        if (value === 1 && selectedRating === 1) {
            selectedRating = 0;
        } else {
            selectedRating = value;
        }
        updateStars(selectedRating);
        saveRatingLocallyAndCloud();
    });

    star.addEventListener('touchstart', (e) => {
        const value = parseInt(star.getAttribute('data-value'));
        highlightStars(value);
    });

    star.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const targetStar = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetStar && targetStar.classList.contains('star-icon')) {
            const value = parseInt(targetStar.getAttribute('data-value'));
            highlightStars(value);
        }
    });

    star.addEventListener('touchend', (e) => {
        updateStars(selectedRating);
    });

    star.addEventListener('mousemove', (e) => {
        const value = parseInt(star.getAttribute('data-value'));
        highlightStars(value);
    });
});

document.getElementById('starsContainer').addEventListener('mouseleave', () => {
    updateStars(selectedRating);
});

function highlightStars(value) {
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        star.classList.remove('active', 'half');
        star.style.background = '';
        star.style.webkitBackgroundClip = '';
        star.style.webkitTextFillColor = '';
        if (starVal <= value) star.classList.add('active');
    });
}

function updateStars(value) {
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        star.classList.remove('active', 'half');
        star.style.background = '';
        star.style.webkitBackgroundClip = '';
        star.style.webkitTextFillColor = '';
        if (starVal <= value) star.classList.add('active');
    });
}

// Load saved data from LocalStorage
function loadRatingData() {
    const savedData = localStorage.getItem('tug_rating_' + movieKey);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data) {
                selectedRating = Math.round((data.score || 0) / 2);
                if (commentInput) commentInput.value = data.comment || '';
                updateStars(selectedRating);
            }
        } catch (e) {
            console.error('Error loading rating data', e);
        }
    } else {
        selectedRating = 0;
        if (commentInput) commentInput.value = '';
        updateStars(0);
    }
}

const SYNC_TOKEN = "9cmvofbs";
const SYNC_BASE = "https://keyvalue.immanuel.co/api/KeyVal";

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

    fetch(`${SYNC_BASE}/UpdateValue/${SYNC_TOKEN}/${key}/${cloudVal}`, {
        method: 'POST',
        body: '0'
    }).catch(e => console.error('TUG Cloud Sync: push failed', e));
}

const syncWithCloud = () => {
    const ratingKey = movieKey + '_rating';
    fetch(`${SYNC_BASE}/GetValue/${SYNC_TOKEN}/${ratingKey}`)
        .then(res => res.text())
        .then(text => {
            if (text && text.trim() !== "" && text !== "null") {
                let cleanVal = text.trim().replace(/^"|"$/g, '');
                if (cleanVal === "0" || cleanVal === "") {
                    const savedData = localStorage.getItem('tug_rating_' + movieKey);
                    if (savedData) {
                        localStorage.removeItem('tug_rating_' + movieKey);
                        selectedRating = 0;
                        updateStars(0);
                        if (commentInput) commentInput.value = '';
                    }
                    return;
                }
                const score = parseFloat(cleanVal.replace('_', '.'));
                
                // Fetch comment
                const commentKey = movieKey + '_comment';
                fetch(`${SYNC_BASE}/GetValue/${SYNC_TOKEN}/${commentKey}`)
                    .then(res2 => res2.text())
                    .then(text2 => {
                        let commentText = "";
                        if (text2 && text2.trim() !== "" && text2 !== "null") {
                            let cleanComment = text2.trim().replace(/^"|"$/g, '');
                            commentText = safeAtob(cleanComment);
                        }

                        const localData = JSON.stringify({ score: score, comment: commentText, timestamp: new Date().toISOString() });
                        const saved = localStorage.getItem('tug_rating_' + movieKey);
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
                            localStorage.setItem('tug_rating_' + movieKey, localData);
                            selectedRating = Math.round(score / 2);
                            updateStars(selectedRating);
                            if (commentInput) commentInput.value = commentText;
                        }
                    });
            }
        })
        .catch(e => console.warn('TUG Cloud Sync: pull failed'));
};

// Save rating data to LocalStorage & Cloud
submitBtn.addEventListener('click', () => {
    saveRatingLocallyAndCloud();
    
    // Show toast message
    saveToast.style.display = 'inline-flex';
    submitBtn.textContent = '저장 완료!';
    submitBtn.style.background = '#27ae60';
    
    setTimeout(() => {
        saveToast.style.display = 'none';
        submitBtn.textContent = '평가 저장하기';
        submitBtn.style.background = '#c0392b';
    }, 2500);
});

// Data containing full translation texts for modal rendering (synced exactly with desktop)
// translatorData is loaded externally from media/translations.js

// Modal Elements
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
    document.body.style.overflow = ''; // Unlock main scroll
}

// Initialize rating data and animate theater guide gauges reactively on load
loadRatingData();
syncWithCloud();
setInterval(syncWithCloud, 3000);

// Sync instantly when another tab (e.g. desktop dashboard) updates localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'tug_rating_' + movieKey) loadRatingData();
});

// Dynamically sort theater format recommendations in descending order of score (Mobile)
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.theater-guide-widget');
    if (container) {
        const rows = Array.from(container.querySelectorAll('.theater-metric-row'));
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
            rows.forEach(row => container.appendChild(row));
        }
    }

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

// Animation helper to draw circular gauge bar (Mobile)
function animateGauge(circleId, score, maxScore) {
    const circle = document.getElementById(circleId);
    if (!circle) return;
    
    // Calculate radius and circumference dynamically
    const r = parseFloat(circle.getAttribute('r')) || 20;
    const calculatedCircumference = 2 * Math.PI * r;
    
    let strokeDasharray = parseFloat(window.getComputedStyle(circle).strokeDasharray);
    if (isNaN(strokeDasharray) || strokeDasharray <= 0) {
        strokeDasharray = calculatedCircumference;
    }
    
    // Ensure stroke-dasharray is set explicitly
    circle.style.strokeDasharray = strokeDasharray;
    
    const progress = score / maxScore;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * progress);
    
    circle.style.strokeDashoffset = strokeDashoffset;
}

// Initialize and animate all mobile gauges after DOMContentLoaded / Load
window.addEventListener('load', () => {
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
            const wrapper = circle.closest('.mini-circle-wrapper') || circle.closest('.mini-gauge');
            if (!wrapper) return defaultValue;
            const textEl = wrapper.querySelector('.mini-score-val') || wrapper.querySelector('.mini-gauge-text');
            if (!textEl) return defaultValue;
            const score = parseFloat(textEl.textContent.trim());
            return isNaN(score) ? defaultValue : score;
        };

        // Parse scores dynamically from the HTML, with safe fallback defaults for the Master Template preview
        const mainScore = getScoreFromElement('.gauge-score', 8.5);
        const q1 = getMiniScore('gaugeFillKrCritic', 8.2);
        const q2 = getMiniScore('gaugeFillKrAud', 8.6);
        const q3 = getMiniScore('gaugeFillGlCritic', 8.4);
        const q4 = getMiniScore('gaugeFillGlAud', 8.8);

        // Main score circle
        animateGauge('mainGaugeFill', mainScore, 10.0);

        // Mini Q1-Q4 circles
        animateGauge('gaugeFillKrCritic', q1, 10.0);
        animateGauge('gaugeFillKrAud', q2, 10.0);
        animateGauge('gaugeFillGlCritic', q3, 10.0);
        animateGauge('gaugeFillGlAud', q4, 10.0);

        // --- 🎬 Dynamic Theater Guide HUD Gauge Animation ---
        const imaxFill = document.querySelector('.theater-guide-widget .imax-gauge-fill');
        const dolbyFill = document.querySelector('.theater-guide-widget .dolby-gauge-fill');
        const fourdxFill = document.querySelector('.theater-guide-widget .fourdx-gauge-fill');
        const standardFill = document.querySelector('.theater-guide-widget .standard-gauge-fill');

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
    }, 150);
});
