import { auth, db, rtdb } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, get as rtdbGet, update as rtdbUpdate, remove, set as rtdbSet, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
const urlParams = new URLSearchParams(window.location.search);
const pin = urlParams.get('pin');
if (!pin) {
    if (window.showGeniiToast) window.showGeniiToast("PIN não encontrado na URL.", "error");
    setTimeout(() => window.location.href = "join.html", 2000);
}
const DOM = {
    loadingOverlay: document.getElementById('loading-overlay'),
    gamePinEl: document.getElementById('game-pin'),
    playerCountEl: document.getElementById('player-count-display'),
    answersReceivedEl: document.getElementById('answers-received'),
    totalPlayersEl: document.getElementById('total-players'),
    qCounterEl: document.getElementById('q-counter'),
    headerTitle: document.getElementById('header-title'),
    mainHeader: document.getElementById('main-header'),
    stage: document.getElementById('stage'),
    leaderboardScreen: document.getElementById('leaderboard-screen'),
    endScreen: document.getElementById('end-screen'),
};
DOM.gamePinEl.textContent = pin;
const gameDocRef = ref(rtdb, `live_games/${pin}`);
let quizData = null;
let currentQuizId = null;
let currentHostId = null;
let currentQuestionIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let totalPlayers = 0;
let answersCount = [0, 0, 0, 0];
let totalAnswered = 0;
let isQuestionActive = false;
let playerScores = {};
let gameColors = ['color-blue', 'color-red', 'color-green', 'color-orange'];
let isMuted = false;
  let globalTotalCorrect = 0;
  let globalTotalIncorrect = 0;
  let globalTotalMissed = 0;
const bgMusic = document.getElementById('bg-music');
const sfxCorrect = document.getElementById('sfx-correct');
const sfxWrong = document.getElementById('sfx-wrong');
if (bgMusic) bgMusic.volume = 0.2;
if (sfxCorrect) sfxCorrect.volume = 0.6;
if (sfxWrong) sfxWrong.volume = 0.5;
window.toggleAudio = () => {
    isMuted = !isMuted;
    const btn = document.getElementById('muteBtn');
    const icon = document.getElementById('soundIcon');
    if (isMuted) {
        if (bgMusic) bgMusic.pause();
        if (btn) btn.classList.add('muted');
        if (icon) icon.className = "fa-solid fa-volume-xmark";
    } else {
        if (bgMusic) bgMusic.play().catch(() => {});
        if (btn) btn.classList.remove('muted');
        if (icon) icon.className = "fa-solid fa-volume-high";
    }
};
function playSound(type) {
    if (isMuted) return;
    const sfx = type === 'correct' ? sfxCorrect : sfxWrong;
    if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
}
function runCountdown(question) {
    return new Promise(resolve => {
        const startScreen = document.getElementById('start-screen');
        const titleContainer = document.getElementById('start-title-container');
        const quizTitle = document.getElementById('start-quiz-title');
        const countdownContainer = document.getElementById('countdown-container');
        const loadingSpinner = document.getElementById('loading-spinner');
        if (startScreen) startScreen.style.display = 'flex';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (titleContainer) titleContainer.style.display = 'flex';
        if (quizTitle) quizTitle.innerText = getQuestionText(question);
        if (countdownContainer) countdownContainer.style.display = 'none';
        const loadingMedia = document.getElementById('loading-media-area');
        const imageUrl = getImageUrl(question);
        if (loadingMedia) {
            if (imageUrl && imageUrl.trim() !== "") {
                loadingMedia.innerHTML = `<img src="${imageUrl}" alt="Imagem da Pergunta">`;
                loadingMedia.style.display = 'flex';
            } else {
                loadingMedia.innerHTML = '';
                loadingMedia.style.display = 'none';
            }
        }
        const loadingFill = document.getElementById('question-loading-fill');
        if (loadingFill) {
            loadingFill.style.animation = 'none';
            loadingFill.offsetHeight;
            loadingFill.style.animation = 'loadingProgress 3s linear forwards';
        }
        rtdbUpdate(gameDocRef, {
            status: 'pre_question',
            pre_question_text: getQuestionText(question),
            pre_question_image: imageUrl || ""
        }).catch(console.error);
        setTimeout(() => {
            if (titleContainer) titleContainer.style.display = 'none';
            if (countdownContainer) countdownContainer.style.display = 'flex';
            const nums = [3, 2, 1];
            let i = 0;
            function showNext() {
                if (!countdownContainer) return resolve();
                countdownContainer.innerHTML = '';
                if (i < nums.length) {
                    countdownContainer.innerHTML = `
                        <div class="blob-wrapper">
                            <div class="genii-blob dark"></div>
                            <div class="genii-blob"></div>
                        </div>
                        <div class="countdown-number">${nums[i]}</div>`;
                    i++;
                    setTimeout(showNext, 1000);
                } else {
                    countdownContainer.style.display = 'none';
                    if (startScreen) startScreen.style.display = 'none';
                    if (!isMuted && bgMusic) bgMusic.play().catch(() => {});
                    resolve();
                }
            }
            showNext();
        }, 3000);
    });
}
function darkenColor(hex, amount = 40) {
    hex = hex.replace('#', '');
    let r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
    let g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
    let b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function getContrastTextColor(hex) {
    if (!hex) return '#2D3436';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    const r = parseInt(c.substring(0,2), 16);
    const g = parseInt(c.substring(2,4), 16);
    const b = parseInt(c.substring(4,6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#2D3436' : '#FFFFFF';
}
function shuffleOptionsArray(optionsArray, correctIndex) {
    if (!optionsArray || optionsArray.length < 2) return { shuffled: optionsArray, newCorrect: correctIndex };
    const indices = optionsArray.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const shuffled = indices.map(i => optionsArray[i]);
    const newCorrect = indices.indexOf(correctIndex);
    return { shuffled, newCorrect };
}
function normalizeOptions(raw) {
    if (!raw) return ["", "", "", ""];
    if (Array.isArray(raw)) {
        const result = raw.map(item => {
            if (item === null || item === undefined) return "";
            if (typeof item === 'object') return item.text || item.answer || item.label || String(item);
            return String(item);
        });
        while (result.length < 4) result.push("");
        return result.slice(0, 4);
    }
    if (typeof raw === 'object') {
        if (raw.A !== undefined) return [raw.A, raw.B || "", raw.C || "", raw.D || ""].map(String);
        if (raw.a !== undefined) return [raw.a, raw.b || "", raw.c || "", raw.d || ""].map(String);
        const vals = Object.values(raw).map(v => {
            if (v === null || v === undefined) return "";
            if (typeof v === 'object') return v.text || v.answer || v.label || String(v);
            return String(v);
        });
        while (vals.length < 4) vals.push("");
        return vals.slice(0, 4);
    }
    return ["", "", "", ""];
}
function getQuestionText(q) {
    return q.question_text || q.question || q.text || q.questionText || "Slide sem texto";
}
function getImageUrl(q) {
    return q.imageUrl || q.image || q.mediaUrl || q.image_url || q.mediaURL || "";
}
function getCorrectIndex(q) {
    const raw = q.correct_option ?? q.correctOption ?? q.correct ?? q.answer ?? null;
    if (raw === null || raw === undefined) return -1;
    if (typeof raw === 'number') return raw;
    const letterMap = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    if (typeof raw === 'string' && letterMap[raw] !== undefined) return letterMap[raw];
    if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (typeof first === 'number') return first;
        if (typeof first === 'string' && letterMap[first] !== undefined) return letterMap[first];
    }
    if (raw === true || raw === "true" || raw === "Verdadeiro") return 0;
    if (raw === false || raw === "false" || raw === "Falso") return 1;
    return -1;
}
async function initGame() {
    try {
        const gameSnap = await rtdbGet(gameDocRef);
        if (!gameSnap.exists()) {
            if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
            if (window.showGeniiToast) window.showGeniiToast("Jogo não encontrado ou já terminado!", "error");
            setTimeout(() => window.location.href = "studio.html", 2000);
            return;
        }
        const gameData = gameSnap.val();
        if (gameData.theme_colors && Array.isArray(gameData.theme_colors) && gameData.theme_colors.length >= 4) {
            gameColors = gameData.theme_colors;
        }
        const quizId = gameData.quizId || gameData.quiz_id;
        currentQuizId = quizId || null;
        currentHostId = gameData.hostId || gameData.host_id || "unknown";
        const currentStatus = gameData.status;
        if (currentStatus === 'finished' || currentStatus === 'cancelled') {
            window.isGameFinished = true;
            if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
            if (!quizId && gameData.questions) {
                quizData = gameData;
            } else if (quizId) {
                const quizSnap = await getDoc(doc(db, "quizzes", quizId));
                if (quizSnap.exists()) quizData = quizSnap.data();
            }
            const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
            if (playersSnap.exists()) {
                Object.keys(playersSnap.val()).forEach(key => {
                    const d = playersSnap.val()[key];
                    playerScores[key] = {
                        name: d.name || d.displayName || d.nickname || "Jogador",
                        score: d.score || 0,
                        avatar: d.avatar || d.photoURL || ""
                    };
                    globalTotalCorrect += d.correctCount || 0;
                    globalTotalIncorrect += d.incorrectCount || 0;
                    globalTotalMissed += d.missedCount || 0;
                });
            }
            const sorted = Object.entries(playerScores)
                .map(([uid, data]) => ({ uid, ...data }))
                .sort((a, b) => b.score - a.score);
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.style.display = 'none';
            DOM.mainHeader.style.display = 'none';
            DOM.endScreen.innerHTML = buildFinalPodium(sorted);
            DOM.endScreen.style.display = 'flex';
            const btnDash = document.getElementById('btn-show-dashboard');
            if (btnDash) {
                btnDash.addEventListener('click', () => {
                    DOM.endScreen.innerHTML = buildHostDashboardHTML(sorted);
                    attachExitListener();
                });
            }
            return;
        }
        if (!quizId && gameData.questions) {
            quizData = gameData;
        } else if (quizId) {
            const quizSnap = await getDoc(doc(db, "quizzes", quizId));
            if (!quizSnap.exists()) {
            if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
            if (window.showGeniiToast) window.showGeniiToast("Quiz não encontrado!", "error");
                setTimeout(() => window.location.href = "my_sets.html", 2000);
                return;
            }
            quizData = quizSnap.data();
        } else {
            if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
            if (window.showGeniiToast) window.showGeniiToast("Dados do quiz em falta!", "error");
            setTimeout(() => window.location.href = "my_sets.html", 2000);
            return;
        }
        if (!quizData.questions || quizData.questions.length === 0) {
            if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
            if (window.showGeniiToast) window.showGeniiToast("Este quiz não tem perguntas!", "error");
            setTimeout(() => window.location.href = "my_sets.html", 2000);
            return;
        }
        const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
        if (playersSnap.exists()) {
            Object.keys(playersSnap.val()).forEach(key => {
                const d = playersSnap.val()[key];
                playerScores[key] = {
                    name: d.name || d.displayName || d.nickname || "Jogador",
                    score: d.score || 0,
                    avatar: d.avatar || ""
                };
            });
        }
        listenToPlayers();
        await startQuestion(0);
    } catch (error) {
        console.error("Erro ao inicializar o jogo:", error);
        if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
        if (window.showGeniiToast) window.showGeniiToast("Erro ao carregar o jogo.", "error");
        setTimeout(() => window.location.href = "my_sets.html", 2000);
    }
}
async function startQuestion(index) {
    currentQuestionIndex = index;
    if (!quizData.questions || index >= quizData.questions.length) {
        await finishGame();
        return;
    }
    const question = quizData.questions[index];
    if (window.confetti) window.confetti.reset();
    isQuestionActive = false;
    answersCount = [0, 0, 0, 0];
    totalAnswered = 0;
    DOM.answersReceivedEl.textContent = "0";
    resetHeader();
    DOM.mainHeader.style.display = '';
    DOM.leaderboardScreen.style.display = 'none';
    DOM.endScreen.style.display = 'none';
    if(DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
    const feedbackBar = document.getElementById("footer-feedback");
    if (feedbackBar) feedbackBar.classList.remove("visible");
    const oldCards = DOM.stage.querySelectorAll('.question-card');
    oldCards.forEach(c => c.remove());
    const normalizedOptions = normalizeOptions(question.options || question.answers);
    const imageUrl = getImageUrl(question);
    const questionText = getQuestionText(question);
    let finalCorrectIndex = getCorrectIndex(question);
    let finalCorrectOption = question.correct_option ?? question.correctOption ?? question.correct ?? question.answer ?? "A";
    if (question.shuffleOptions && normalizedOptions.length > 1) {
        const { shuffled, newCorrect } = shuffleOptionsArray(normalizedOptions, finalCorrectIndex);
        question._shuffledOptions = shuffled;
        question._shuffledCorrectIndex = newCorrect;
        finalCorrectIndex = newCorrect;
        finalCorrectOption = ['A', 'B', 'C', 'D'][newCorrect] || "A";
    }
    await runCountdown(question);
    isQuestionActive = true;
    renderQuestion(question, index);
    timeLeft = question.timeLimit || question.time_limit || question.time || 30;
    const isSlide = question.type === 'slide';
    const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
    if (playersSnap.exists()) {
        const clearUpdates = {};
        Object.keys(playersSnap.val()).forEach(key => {
            clearUpdates[`live_games/${pin}/players/${key}/answerIndex`] = null;
            clearUpdates[`live_games/${pin}/players/${key}/typingAnswer`] = null;
        });
        await rtdbUpdate(ref(rtdb), clearUpdates);
    }
    const finalOptions = question._shuffledOptions || normalizedOptions;
    const firestoreCorrectOption = question._shuffledCorrectIndex !== undefined
        ? ['A', 'B', 'C', 'D'][question._shuffledCorrectIndex] || "A"
        : (question.correct_option ?? question.correctOption ?? question.correct ?? question.answer ?? "A");
    await rtdbUpdate(gameDocRef, {
        status: 'question_active',
        current_question_index: index,
        current_question: {
            question_text: questionText,
            options: finalOptions,
            image: imageUrl,
            type: question.type || 'quiz',
            points: question.points || 1000,
            timeLimit: timeLeft,
            totalQuestions: quizData.questions.length,
            answerColors: question.answerColors || null,
            answerStyles: question.answerStyles || null,
            answerImages: question.answerImages || null,
            body: question.body || null,
        },
        question_start_time: Date.now(),
        question_end_time: Date.now() + (timeLeft * 1000)
    });
    clearInterval(timerInterval);
    if (!isSlide) {
        timerInterval = setInterval(() => {
            timeLeft--;
            const timerEl = document.getElementById('timer-display');
            if (timerEl) {
                timerEl.textContent = timeLeft;
                if (timeLeft <= 5) timerEl.classList.add('timer-warning');
                else timerEl.classList.remove('timer-warning');
            }
            if (timeLeft <= 0) endQuestion();
        }, 1000);
    } else {
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.innerHTML = '<i class="fa-solid fa-book-open"></i>';
            timerEl.classList.remove('timer-warning');
        }
    }
}
function renderQuestion(question, index) {
    const container = DOM.stage;
    const oldCards = container.querySelectorAll('.question-card');
    oldCards.forEach(c => {
        c.classList.remove('slide-active');
        c.classList.add('slide-out');
        setTimeout(() => c.remove(), 600);
    });
    const card = document.createElement('div');
    card.className = 'question-card slide-in';
    card.id = `card-${index}`;
    const questionText = getQuestionText(question);
    const imageUrl = getImageUrl(question);
    const options = question._shuffledOptions || normalizeOptions(question.options || question.answers);
    const type = question.type || 'quiz';
    const timeLimit = question.timeLimit || question.time_limit || question.time || 30;
    const answerColors = question.answerColors || {};
    const answerImages = question.answerImages || {};
    if (type === 'slide') {
        card.classList.add('slide-mode');
        const slideBody = (question.body || '').replace(/\n/g, '<br>');
        const hasImage = imageUrl && imageUrl.trim() !== "";
        card.innerHTML = `
            <div class="slide-presentation-card">
                <div style="position: relative; width: 100%; display: flex; justify-content: center; margin-bottom: 15px;">
                    <div class="slide-title-banner" style="margin: 0;">${questionText}</div>
                    <button class="btn-host-action host-slide-skip" id="btn-action" style="position: absolute; right: 15px; bottom: -25px; z-index: 10;">Saltar <i class="fa-solid fa-chevron-right"></i></button>
                </div>
                ${hasImage ? `<div class="slide-media-area has-image"><img src="${imageUrl}" onclick="window.openLightbox('${imageUrl}')" title="Clique para ampliar"></div>` : ''}
                ${slideBody ? `<div class="slide-body-bubble">${slideBody}</div>` : ''}
            </div>
        `;
    } else {
        let mediaHtml = '';
        if (imageUrl && imageUrl.trim() !== "") {
            mediaHtml = `<div class="media-area" style="display:block"><img src="${imageUrl}" alt="Imagem do slide" style="cursor:zoom-in;" onclick="window.openLightbox('${imageUrl}')"></div>`;
        }
        let optionsHtml = '';
        const letters = ['A', 'B', 'C', 'D'];
        const keyMap = ['A', 'B', 'C', 'D'];
        if (type === 'boolean') {
            optionsHtml = `
                <div class="option-btn opt-true" data-index="0"><div class="opt-icon"><i class="fa-solid fa-check"></i></div><span class="answer-text">Verdadeiro</span><span class="answer-count" id="count-0">0</span></div>
                <div class="option-btn opt-false" data-index="1"><div class="opt-icon"><i class="fa-solid fa-xmark"></i></div><span class="answer-text">Falso</span><span class="answer-count" id="count-1">0</span></div>
            `;
        } else if (type === 'typing') {
            const accepted = question.acceptedAnswers || [];
            const acceptedList = accepted.length > 0
                ? accepted.map(a => `<span class="typing-accepted-tag">${a}</span>`).join(' ')
                : '<em style="color:#999;">Nenhuma resposta definida</em>';
            optionsHtml = `
                <div class="typing-host-display">
                    <div class="typing-host-label"><i class="fa-solid fa-keyboard"></i> Modo Escrever - Respostas aceites:</div>
                    <div class="typing-accepted-list">${acceptedList}</div>
                </div>
            `;
        } else {
            const answerStyles = question.answerStyles || {};
            options.forEach((opt, i) => {
                if (i >= 4) return;
                const visibility = (!opt || opt.trim() === "") ? 'style="visibility:hidden; pointer-events:none;"' : '';
                const key = keyMap[i];
                const customColor = answerColors[key];
                const ansImg = answerImages[key];
                const styles = answerStyles[key] || {};
                let styleAttr = '';
                let colorClass = gameColors[i];
                if (customColor) {
                    const textColor = styles.textColor || getContrastTextColor(customColor);
                    const fw = styles.bold ? ' font-weight:900;' : '';
                    const fi = styles.italic ? ' font-style:italic;' : '';
                    styleAttr = `style="background:${customColor}; box-shadow: 0 5px 0 ${darkenColor(customColor)}; color:${textColor};${fw}${fi}"`;
                    colorClass = '';
                } else {
                    styleAttr = '';
                    colorClass = 'color-neutral';
                    const extra = [];
                    if (styles.textColor) extra.push(`color:${styles.textColor}`);
                    if (styles.bold) extra.push('font-weight:900');
                    if (styles.italic) extra.push('font-style:italic');
                    if (extra.length) styleAttr = `style="${extra.join(';')};"`;
                }
                const imgHtml = ansImg ? `<img src="${ansImg}" class="opt-ans-img" alt="">` : '';
                optionsHtml += `
                    <div class="option-btn ${colorClass}" data-index="${i}" ${visibility} ${styleAttr}>
                        <div class="opt-icon">${letters[i]}</div>
                        ${imgHtml}
                        <span class="answer-text">${opt}</span>
                        <span class="answer-count" id="count-${i}">0</span>
                    </div>
                `;
            });
        }
        card.innerHTML = `
            <div class="controls-section">
                <div class="timer-container" id="timer-display">${timeLimit}</div>
                <button class="btn-host-action" id="btn-action">Saltar</button>
            </div>
            ${mediaHtml}
            <div class="question-text">${questionText}</div>
            <div class="options-grid">${optionsHtml}</div>
        `;
    }
    container.appendChild(card);
    DOM.qCounterEl.textContent = `${index + 1} / ${quizData.questions.length}`;
    const btnAction = card.querySelector('.btn-host-action');
    if (btnAction) {
        btnAction.addEventListener('click', handleActionButton);
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.classList.remove('slide-in');
            card.classList.add('slide-active');
        });
    });
}
async function handleActionButton() {
    const btnAction = document.getElementById('btn-action');
    const feedbackBtn = document.getElementById('feedback-btn');
    if (btnAction) btnAction.disabled = true;
    if (feedbackBtn) feedbackBtn.disabled = true;
    try {
        if (isQuestionActive) {
            await endQuestion();
        } else {
            await showLeaderboard();
        }
    } catch (err) {
        console.error('Erro no botão de ação:', err);
    } finally {
        if (btnAction) btnAction.disabled = false;
        if (feedbackBtn) feedbackBtn.disabled = false;
    }
}
async function endQuestion() {
    if (!isQuestionActive) return;
    isQuestionActive = false;
    clearInterval(timerInterval);
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
        timerEl.textContent = "0";
        timerEl.classList.remove('timer-warning');
    }
    const question = quizData.questions[currentQuestionIndex];
    const type = question.type || 'quiz';
    const isSlide = type === 'slide';
    if (!isSlide) {
        try {
            await calculateScores();
        } catch (err) {
            console.error('Erro ao calcular scores:', err);
        }
    }
    const correctIdx = question._shuffledCorrectIndex !== undefined ? question._shuffledCorrectIndex : getCorrectIndex(question);
    const card = document.getElementById(`card-${currentQuestionIndex}`);
    if (card && !isSlide) {
        if (type === 'typing') {
            const accepted = question.acceptedAnswers || [];
            const displayEl = card.querySelector('.typing-host-display');
            if (displayEl) {
                displayEl.innerHTML = `
                    <div class="typing-host-label"><i class="fa-solid fa-check-circle" style="color:#00b894;"></i> Respostas aceites:</div>
                    <div class="typing-accepted-list">${accepted.map(a => `<span class="typing-accepted-tag">${a}</span>`).join(' ')}</div>
                    <div style="margin-top:8px; font-size:0.85rem; color:#888;"><i class="fa-solid fa-reply"></i> ${totalAnswered} respostas recebidas</div>
                `;
            }
        } else {
            const allBtns = card.querySelectorAll('.option-btn');
            allBtns.forEach((btn, i) => {
                const countEl = btn.querySelector('.answer-count');
                if (countEl) {
                    countEl.style.display = 'inline-block';
                    countEl.textContent = answersCount[i] || 0;
                }
                const idx = parseInt(btn.getAttribute('data-index'));
                if (idx === correctIdx) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('dimmed');
                }
            });
        }
    }
    if (!isSlide) {
        DOM.mainHeader.classList.add('header-correct');
        let correctText = "";
        if (type === 'typing') {
            const accepted = question.acceptedAnswers || [];
            correctText = accepted[0] || "?";
            DOM.headerTitle.innerHTML = `<i class="fa-solid fa-check"></i> Resposta: ${correctText}`;
        } else {
            correctText = getCorrectAnswerText(question, correctIdx, question._shuffledOptions);
            DOM.headerTitle.innerHTML = `<i class="fa-solid fa-check"></i> Resposta: ${correctText}`;
        }
        showHostFeedbackBar(correctText);
    } else {
        DOM.mainHeader.classList.add('header-correct');
        DOM.headerTitle.innerHTML = `<i class="fa-solid fa-presentation-screen"></i> Slide concluído`;
    }
    const btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.textContent = "Ver Ranking";
    }
    if (!isSlide) {
        const firestoreCorrectOption = question._shuffledCorrectIndex !== undefined
            ? ['A', 'B', 'C', 'D'][question._shuffledCorrectIndex] || "A"
            : (question.correct_option ?? question.correctOption ?? question.correct ?? question.answer ?? "A");
        const shuffledOptions = question._shuffledOptions || normalizedOptions;
        try {
            await rtdbUpdate(gameDocRef, {
                status: 'question_results',
                'current_question/correct_option': firestoreCorrectOption,
                'current_question/acceptedAnswers': question.acceptedAnswers || null,
                'current_question/shuffledOptions': shuffledOptions,
            });
        } catch (err) {
            console.error('Erro ao atualizar estado do jogo:', err);
        }
    } else {
        try {
            await rtdbUpdate(gameDocRef, {
                status: 'question_results',
            });
        } catch (err) {
            console.error('Erro ao atualizar estado do jogo:', err);
        }
    }
}
function getCorrectAnswerText(question, correctIdx, shuffledOptions) {
    const options = shuffledOptions || normalizeOptions(question.options || question.answers);
    if (question.type === 'boolean') {
        return correctIdx === 0 ? "Verdadeiro" : "Falso";
    }
    if (correctIdx >= 0 && correctIdx < options.length) return options[correctIdx];
    return "?";
}
function showHostFeedbackBar(correctText) {
    const bar = document.getElementById("footer-feedback");
    const iconI = document.getElementById("feedback-icon-i");
    const title = document.getElementById("feedback-title");
    const subtitle = document.getElementById("feedback-subtitle");
    if (!bar) return;
    bar.className = "footer-feedback-bar";
    bar.classList.add("correct");
    if (iconI) iconI.className = "fa-solid fa-check";
    if (title) title.textContent = "A resposta correta era:";
    if (subtitle) {
        subtitle.innerHTML = correctText ? `<strong>${correctText}</strong>` : "";
    }
    bar.classList.add("visible");
}
async function calculateScores() {
    const question = quizData.questions[currentQuestionIndex];
    const correctIdx = question._shuffledCorrectIndex !== undefined ? question._shuffledCorrectIndex : getCorrectIndex(question);
    const maxPoints = question.points || 1000;
    const timeLimit = question.timeLimit || question.time_limit || question.time || 30;
    const type = question.type || 'quiz';
    const acceptedAnswers = (question.acceptedAnswers || []).map(a => a.toLowerCase().trim());
    let correctThisRound = 0;
    let incorrectThisRound = 0;
    let missedThisRound = 0;
    const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
    const scoreUpdates = {};
    if (playersSnap.exists()) {
        Object.keys(playersSnap.val()).forEach(key => {
            const pData = playersSnap.val()[key];
            const uid = key;
            const base = `live_games/${pin}/players/${uid}`;
            if (!playerScores[uid]) {
                playerScores[uid] = {
                    name: pData.name || pData.displayName || pData.nickname || "Jogador",
                    score: pData.score || 0,
                    avatar: pData.avatar || pData.photoURL || ""
                };
            }
            let isCorrect = false;
            if (type === 'typing') {
                const typingAnswer = (pData.typingAnswer || '').toLowerCase().trim();
                isCorrect = typingAnswer !== '' && acceptedAnswers.includes(typingAnswer);
            } else {
                const answerIdx = pData.answerIndex;
                isCorrect = answerIdx !== null && answerIdx !== undefined && answerIdx === correctIdx;
            }
            if (isCorrect) {
                correctThisRound++;
                const answeredAt = pData.answeredAt || Date.now();
                const gameStartTime = Date.now() - ((timeLimit - timeLeft) * 1000);
                const timeTaken = Math.max(0, (answeredAt - gameStartTime) / 1000);
                const speedBonus = Math.max(0.5, 1 - (timeTaken / timeLimit));
                const earnedPoints = Math.round(maxPoints * speedBonus);
                playerScores[uid].score += earnedPoints;
                scoreUpdates[`${base}/score`] = playerScores[uid].score;
                scoreUpdates[`${base}/correctCount`] = (pData.correctCount || 0) + 1;
            } else {
                const answerIdx = pData.answerIndex;
                const typingAnswer = pData.typingAnswer;
                if ((answerIdx !== null && answerIdx !== undefined) || (typingAnswer && typingAnswer.trim() !== '')) {
                    incorrectThisRound++;
                    scoreUpdates[`${base}/incorrectCount`] = (pData.incorrectCount || 0) + 1;
                } else {
                    missedThisRound++;
                    scoreUpdates[`${base}/missedCount`] = (pData.missedCount || 0) + 1;
                }
            }
        });
    }
    globalTotalCorrect += correctThisRound;
    globalTotalIncorrect += incorrectThisRound;
    globalTotalMissed += missedThisRound;
    if (Object.keys(scoreUpdates).length > 0) {
        await rtdbUpdate(ref(rtdb), scoreUpdates);
    }
}
function buildBarChartHTML(sorted, isLastQuestion) {
    const barColors = ['#FF4757', '#8C7AE6', '#00D2BA', '#FFA502', '#6C5CE7'];
    const top5 = sorted.slice(0, 5);
    const maxScore = top5.length > 0 ? Math.max(top5[0].score, 1) : 1;
    if (top5.length === 0) {
        const btnText = isLastQuestion
            ? 'Ver Resultados Finais'
            : '<i class="fa-solid fa-arrow-right"></i> Continuar';
        return `
            <div class="leaderboard-wrapper">
                <h1 class="lb-title"><i class="fa-solid fa-ranking-star"></i> Ranking</h1>
                <p class="lb-subtitle">Nenhum jogador encontrado.</p>
                <button class="btn-leaderboard-action" id="btn-leaderboard-action">${btnText}</button>
            </div>`;
    }
    const barsHtml = top5.map((p, i) => {
        const pct = p.score === 0 ? 0 : Math.max(8, Math.round((p.score / maxScore) * 100));
        const color = barColors[i % barColors.length];
        const avatarHTML = window.renderGeniiAvatar
            ? window.renderGeniiAvatar(p, '44px')
            : `<div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:Fredoka;font-weight:700;color:white;">${(p.name || 'G').charAt(0).toUpperCase()}</div>`;
        return `
            <div class="bar-row" style="animation-delay:${i * 0.1}s">
                <span class="bar-rank">${i + 1}</span>
                <div class="bar-avatar">${avatarHTML}</div>
                <div class="bar-info">
                    <div class="bar-name">${p.name}</div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${color}, ${color}dd);"></div>
                    </div>
                </div>
                <span class="bar-points">${p.score}</span>
            </div>`;
    }).join('');
    const btnText = isLastQuestion
        ? 'Ver Resultados Finais'
        : '<i class="fa-solid fa-arrow-right"></i> Próxima Pergunta';
    return `
        <div class="leaderboard-wrapper">
            <h1 class="lb-title"><i class="fa-solid fa-ranking-star"></i> Ranking</h1>
            <div class="bar-chart-section">${barsHtml}</div>
            <button class="btn-leaderboard-action" id="btn-leaderboard-action">${btnText}</button>
        </div>`;
}
function buildFinalPodium(sorted) {
    const p1 = sorted[0];
    const p2 = sorted[1];
    const p3 = sorted[2];
    const getPlayerHtml = (p, rank) => {
        if (!p) {
            return '<div class="bp-player-wrap bp-ghost" style="visibility:hidden; height:100px;"></div>';
        }
        const avatarSize = rank === 1 ? '100px' : '80px';
        let avatarHtml = '';
        if (window.renderGeniiAvatar) {
            avatarHtml = window.renderGeniiAvatar(p, avatarSize);
        } else {
            avatarHtml = `<div style="width:${avatarSize};height:${avatarSize};border-radius:50%;background:linear-gradient(135deg,#6C5CE7,#00D2BA);display:flex;align-items:center;justify-content:center;color:white;font-family:Fredoka;font-weight:800;font-size:2.5rem;">${(p.name || 'G').charAt(0).toUpperCase()}</div>`;
        }
        const formattedScore = new Intl.NumberFormat('pt-PT').format(p.score);
        return `
            <div class="bp-player-wrap">
                <div class="bp-avatar">${avatarHtml}</div>
                <div class="bp-ribbon" title="${p.name}">${p.name}</div>
            </div>
        `;
    };
    return `
        <div class="blooket-podium-wrapper">
            <div class="bp-header">
                <h1 class="bp-title">Classificação Final</h1>
            </div>
            <div class="bp-stage">
                <div class="bp-column place-2 ${!p2 ? 'bp-ghost-block' : ''}">
                    ${getPlayerHtml(p2, 2)}
                    <div class="bp-block rank-2">
                        <div class="bp-rank-text">2º</div>
                        ${p2 ? `<div class="bp-score">${new Intl.NumberFormat('pt-PT').format(p2.score)} pts</div>` : ''}
                    </div>
                </div>
                <div class="bp-column place-1 ${!p1 ? 'bp-ghost-block' : ''}">
                    ${getPlayerHtml(p1, 1)}
                    <div class="bp-block rank-1">
                        <div class="bp-rank-text">1º</div>
                        ${p1 ? `<div class="bp-score">${new Intl.NumberFormat('pt-PT').format(p1.score)} pts</div>` : ''}
                    </div>
                </div>
                <div class="bp-column place-3 ${!p3 ? 'bp-ghost-block' : ''}">
                    ${getPlayerHtml(p3, 3)}
                    <div class="bp-block rank-3">
                        <div class="bp-rank-text">3º</div>
                        ${p3 ? `<div class="bp-score">${new Intl.NumberFormat('pt-PT').format(p3.score)} pts</div>` : ''}
                    </div>
                </div>
                <div class="bp-base-shadow"></div>
            </div>
            <button id="btn-show-dashboard" class="btn-show-report">
                Ver Relatório <i class="fa-solid fa-chart-pie"></i>
            </button>
        </div>
    `;
}
function buildHostDashboardHTML(sorted) {
    const totalAnswers = globalTotalCorrect + globalTotalIncorrect + globalTotalMissed;
    const accuracy = totalAnswers === 0 ? 0 : Math.round((globalTotalCorrect / totalAnswers) * 100);
    const sidebarHtml = sorted.map((p, i) => {
        let rankClass = '';
        if (i === 0) rankClass = 'gold';
        else if (i === 1) rankClass = 'silver';
        else if (i === 2) rankClass = 'bronze';
        const rankIcon = i < 3 ? '<i class="fa-solid fa-crown"></i>' : (i + 1);
        return `
            <div class="lb-row" style="animation: fadeInLeft ${0.3 + (i * 0.1)}s ease forwards;">
                <div class="lb-rank ${rankClass}">${rankIcon}</div>
                <div class="lb-avatar" style="background:transparent; padding:0; overflow:hidden;">${window.renderGeniiAvatar ? window.renderGeniiAvatar(p, '36px') : `<div style="background:transparent;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;">${(p.name || 'G').charAt(0).toUpperCase()}</div>`}</div>
                <div class="lb-details">
                    <span class="lb-name">${p.name}</span>
                    <span class="lb-score">${p.score} pts</span>
                </div>
            </div>
        `;
    }).join('');
    return `
        <div class="dashboard-container" style="animation: fadeInUp 0.5s ease-out;">
            <div class="dashboard-main">
                <div class="dashboard-header">
                    <h1><i class="fa-solid fa-chart-pie" style="color: var(--genii-purple);"></i> Relatório da Turma</h1>
                    <button id="btn-exit-dashboard" class="btn-dashboard-action" style="border: none; cursor: pointer; font-family: 'Fredoka', sans-serif;">
                        <i class="fa-solid fa-house"></i> Sair / Dashboard
                    </button>
                </div>
                <div class="dashboard-stats-grid">
                    <div class="stat-card correct">
                        <i class="fa-solid fa-check stat-icon" style="color: #00b894;"></i>
                        <div class="stat-value">${globalTotalCorrect}</div>
                        <div class="stat-label">Corretas</div>
                    </div>
                    <div class="stat-card incorrect">
                        <i class="fa-solid fa-xmark stat-icon" style="color: #ff7675;"></i>
                        <div class="stat-value">${globalTotalIncorrect}</div>
                        <div class="stat-label">Incorretas</div>
                    </div>
                    <div class="stat-card missed">
                        <i class="fa-solid fa-minus stat-icon" style="color: #b2bec3;"></i>
                        <div class="stat-value">${globalTotalMissed}</div>
                        <div class="stat-label">Não Respondidas</div>
                    </div>
                </div>
                <div class="dashboard-chart-card">
                    <div class="donut-chart" style="--p: ${accuracy}%;" data-accuracy="${accuracy}"></div>
                    <div class="chart-legend">
                        <h2>Precisão Média</h2>
                        <div class="legend-item">
                            <div class="legend-color correct"></div>
                            <span>Corretas (${accuracy}%)</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color incorrect"></div>
                            <span>Incorretas (${100 - accuracy}%)</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dashboard-sidebar">
                <div class="sidebar-header">
                    <i class="fa-solid fa-ranking-star"></i> Tabela Final
                </div>
                <div class="sidebar-list">
                    ${sidebarHtml || '<div style="padding: 20px; text-align: center; color: #888;">Sem jogadores.</div>'}
                </div>
            </div>
        </div>
    `;
}
function attachExitListener() {
    const btnExit = document.getElementById('btn-exit-dashboard');
    if (btnExit) {
        btnExit.addEventListener('click', async () => {
            btnExit.disabled = true;
            btnExit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A sair...';
            try {
                await remove(ref(rtdb, `live_games/${pin}`));
                window.isGameDeleted = true;
            } catch (err) {
                console.error('Erro ao deletar jogo finalizado:', err);
            }
            window.location.href = 'studio.html';
        });
    }
}
  async function showLeaderboard() {
    resetHeader();
    const feedbackBar = document.getElementById("footer-feedback");
    if (feedbackBar) feedbackBar.classList.remove("visible");
    try {
        await rtdbUpdate(gameDocRef, { status: 'leaderboard' });
    } catch (err) {
        console.error('Erro ao atualizar estado:', err);
    }
    const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
    if (playersSnap.exists()) {
        Object.keys(playersSnap.val()).forEach(key => {
            const d = playersSnap.val()[key];
            const uid = key;
            if (playerScores[uid]) {
                playerScores[uid].score = d.score || playerScores[uid].score;
            } else {
                playerScores[uid] = {
                    name: d.name || d.displayName || d.nickname || "Jogador",
                    score: d.score || 0,
                    avatar: d.avatar || ""
                };
            }
        });
    }
    const sorted = Object.entries(playerScores)
        .map(([uid, data]) => ({ uid, ...data }))
        .sort((a, b) => b.score - a.score);
    const isLastQuestion = currentQuestionIndex >= quizData.questions.length - 1;
    DOM.leaderboardScreen.innerHTML = buildBarChartHTML(sorted, isLastQuestion);
    const btn = document.getElementById('btn-leaderboard-action');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                DOM.leaderboardScreen.style.display = 'none';
                if (isLastQuestion) {
                    await finishGame();
                } else {
                    await startQuestion(currentQuestionIndex + 1);
                }
            } catch (err) {
                console.error('Erro ao avançar do leaderboard:', err);
                btn.disabled = false;
            }
        });
    }
    DOM.leaderboardScreen.style.display = 'flex';
    if (sorted.length > 0) {
        const geniiColors = ['#0c71c3', '#e02424', '#198754', '#d97706', '#f59e0b', '#7c3aed'];
        const duration = 800;
        const end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 8, angle: 270, spread: 180, origin: { x: Math.random(), y: -0.2 }, colors: geniiColors, scalar: 1.5, shapes: ['square', 'circle'], gravity: 3, drift: 0, ticks: 100, zIndex: 1500 });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
}
async function finishGame() {
    clearInterval(timerInterval);
    resetHeader();
    DOM.mainHeader.style.display = 'none';
    DOM.leaderboardScreen.style.display = 'none';
    const feedbackBar = document.getElementById("footer-feedback");
    if (feedbackBar) feedbackBar.classList.remove("visible");
    try {
        await rtdbUpdate(gameDocRef, { status: 'finished' });
        window.isGameFinished = true;
    } catch (err) {
        console.error('Erro ao finalizar jogo:', err);
    }
    if (currentQuizId) {
        try {
            const quizRef = doc(db, "quizzes", currentQuizId);
            await updateDoc(quizRef, {
                playCount: increment(1),
                weeklyPlays: increment(1),
                lastPlayedAt: serverTimestamp()
            });
        } catch (err) {
            console.error('Erro ao incrementar playCount:', err);
        }
    }
    const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
    let playersHistoryList = [];
    if (playersSnap.exists()) {
        Object.keys(playersSnap.val()).forEach(key => {
            const d = playersSnap.val()[key];
            const uid = key;
            if (playerScores[uid]) {
                playerScores[uid].score = d.score || playerScores[uid].score;
            }
            playersHistoryList.push({
                uid: uid,
                name: d.name || d.displayName || d.nickname || "Jogador",
                score: d.score || 0,
                correctCount: d.correctCount || 0,
                incorrectCount: d.incorrectCount || 0,
                missedCount: d.missedCount || 0,
                avatar: d.avatar || d.photoURL || null
            });
        });
    }
    const sorted = Object.entries(playerScores)
        .map(([uid, data]) => ({ uid, ...data }))
        .sort((a, b) => b.score - a.score);
    try {
        const gameHistoryRef = doc(collection(db, "game_history"));
        await setDoc(gameHistoryRef, {
            pin: pin,
            quizId: currentQuizId || "inline_quiz",
            quizTitle: quizData?.title || "Quiz Personalizado",
            hostId: currentHostId,
            date: serverTimestamp(),
            players: playersHistoryList,
            playerIds: playersHistoryList.map(p => p.uid),
            globalTotalCorrect: globalTotalCorrect,
            globalTotalIncorrect: globalTotalIncorrect,
            globalTotalMissed: globalTotalMissed
        });
    } catch(err) {
        console.error("Erro ao gravar histórico:", err);
    }
    DOM.endScreen.innerHTML = buildFinalPodium(sorted);
      DOM.endScreen.style.display = 'flex';
      const btnDash = document.getElementById('btn-show-dashboard');
      if (btnDash) {
          btnDash.addEventListener('click', () => {
              DOM.endScreen.innerHTML = buildHostDashboardHTML(sorted);
              attachExitListener();
          });
      }
    const geniiColors = ['#0c71c3', '#e02424', '#198754', '#d97706', '#f59e0b', '#7c3aed'];
    const duration = 800;
    const end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 8, angle: 270, spread: 180, origin: { x: Math.random(), y: -0.2 }, colors: geniiColors, scalar: 1.5, shapes: ['square', 'circle'], gravity: 3, drift: 0, ticks: 100, zIndex: 1500 });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}
function listenToPlayers() {
    const playersRef = ref(rtdb, `live_games/${pin}/players`);
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val() || {};
        const playerKeys = Object.keys(players);
        totalPlayers = playerKeys.length;
        DOM.playerCountEl.textContent = totalPlayers;
        DOM.totalPlayersEl.textContent = totalPlayers;
        if (!isQuestionActive) return;
        let currentAnswers = 0;
        let newAnswersCount = [0, 0, 0, 0];
        playerKeys.forEach(key => {
            const playerData = players[key];
            const playerAnswer = playerData.answerIndex;
            const typingAnswer = playerData.typingAnswer;
            if ((playerAnswer !== undefined && playerAnswer !== null) || (typingAnswer && typingAnswer.trim() !== '')) {
                currentAnswers++;
                if (playerAnswer !== undefined && playerAnswer !== null && playerAnswer >= 0 && playerAnswer < 4) {
                    newAnswersCount[playerAnswer]++;
                }
            }
        });
        answersCount = newAnswersCount;
        totalAnswered = currentAnswers;
        DOM.answersReceivedEl.textContent = currentAnswers;
        if (currentAnswers >= totalPlayers && totalPlayers > 0 && timeLeft > 0) {
            endQuestion();
        }
    });
}
function initQuestionNav() {
    const navBtn = document.getElementById('qNavBtn');
    const navSelect = document.getElementById('qNavSelect');
    if (!navBtn || !navSelect || !quizData) return;
    navSelect.innerHTML = '';
    quizData.questions.forEach((q, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        const preview = getQuestionText(q).substring(0, 50);
        opt.textContent = `Pergunta ${i + 1}: ${preview}`;
        if (i === currentQuestionIndex) opt.selected = true;
        navSelect.appendChild(opt);
    });
    navBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = navSelect.style.display === 'block';
        navSelect.style.display = isVisible ? 'none' : 'block';
    });
    navSelect.addEventListener('change', async (e) => {
        const targetIdx = parseInt(e.target.value);
        if (targetIdx === currentQuestionIndex) {
            navSelect.style.display = 'none';
            return;
        }
        if (!isQuestionActive && !window.confirm(`Saltar para a pergunta ${targetIdx + 1}?`)) {
            navSelect.style.display = 'none';
            return;
        }
        navSelect.style.display = 'none';
        clearInterval(timerInterval);
        isQuestionActive = false;
        await startQuestion(targetIdx);
    });
    document.addEventListener('click', () => {
        if (navSelect) navSelect.style.display = 'none';
    });
}
setTimeout(initQuestionNav, 1000);
let isPaused = false;
let pauseTimerRemaining = 0;
window.togglePause = function() {
    const pauseScreen = document.getElementById('pause-screen');
    const pauseIcon = document.getElementById('pauseIcon');
    if (!pauseScreen) return;
    if (!isPaused) {
        isPaused = true;
        pauseTimerRemaining = timeLeft;
        clearInterval(timerInterval);
        pauseScreen.style.display = 'flex';
        if (pauseIcon) pauseIcon.className = "fa-solid fa-play";
        rtdbUpdate(gameDocRef, { status: 'paused' }).catch(console.error);
    } else {
        isPaused = false;
        pauseScreen.style.display = 'none';
        if (pauseIcon) pauseIcon.className = "fa-solid fa-pause";
        if (isQuestionActive) {
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('timer-display');
                if (timerEl) {
                    timerEl.textContent = timeLeft;
                    if (timeLeft <= 5) timerEl.classList.add('timer-warning');
                    else timerEl.classList.remove('timer-warning');
                }
                if (timeLeft <= 0) endQuestion();
            }, 1000);
        }
        rtdbUpdate(gameDocRef, { status: 'question_active' }).catch(console.error);
    }
};
document.addEventListener('click', (e) => {
    const resumeBtn = e.target.closest('#btn-resume');
    if (resumeBtn && isPaused) {
        window.togglePause();
    }
});
function resetHeader() {
    DOM.mainHeader.className = 'game-header';
    DOM.headerTitle.textContent = quizData?.title || "Genii";
}
let _authToken = null;
onAuthStateChanged(auth, (user) => {
    if (user) {
        user.getIdToken().then(t => _authToken = t).catch(() => {});
    } else {
        window.location.href = "login.html";
    }
});
window.addEventListener('beforeunload', (e) => {
    if (window.isGameFinished || window.isGameDeleted) return;
    try {
        fetch(`https://playgenii-default-rtdb.europe-west1.firebasedatabase.app/live_games/${pin}.json`, {
            method: 'PUT',
            body: JSON.stringify(null),
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
        });
    } catch (err) {
        console.warn('Falha no cleanup unload:', err);
    }
});
window.openLightbox = function(url) {
    const overlay = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (overlay && img) {
        img.src = url;
        overlay.style.display = 'flex';
    }
};
window.closeLightbox = function() {
    const overlay = document.getElementById('lightbox');
    if (overlay) overlay.style.display = 'none';
};
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeLightbox();
});
initGame();
const feedbackBtn = document.getElementById("feedback-btn");
if (feedbackBtn) {
    feedbackBtn.addEventListener("click", handleActionButton);
}
