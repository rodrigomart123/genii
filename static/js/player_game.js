import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, onValue, update as rtdbUpdate, get as rtdbGet } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { auth, db, rtdb } from "../firebase-config.js";
import { recordGame, updateStreak } from "./gamification.js";
import { checkMissionsAfterGame, progressMission } from "./daily-missions.js";
const params = new URLSearchParams(window.location.search);
const pin = params.get('pin');
if (!pin) {
    window.location.href = "join.html";
}
const DOM = {
    loadingOverlay: document.getElementById('loading-overlay'),
    mainHeader: document.getElementById('main-header'),
    headerTitle: document.getElementById('header-title'),
    qCounter: document.getElementById('q-counter'),
    scoreDisplay: document.getElementById('score-display'),
    stage: document.getElementById('stage'),
    statusOverlay: document.getElementById('status-overlay'),
    statusTitle: document.getElementById('status-title'),
    statusSubtitle: document.getElementById('status-subtitle'),
    endScreen: document.getElementById('end-screen'),
    finalScore: document.getElementById('final-score'),
};
let currentUser = null;
let hasAnsweredCurrentQuestion = false;
let currentQuestionIndex = -1;
let myScore = 0;
let myCorrectCount = 0;
let totalQuestionsPlayed = 0;
let gameColors = ['color-blue', 'color-red', 'color-green', 'color-orange'];
let currentGameStatus = 'waiting';
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
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const myPlayerRef = ref(rtdb, `live_games/${pin}/players/${user.uid}`);
        const myPlayerSnap = await rtdbGet(myPlayerRef);
        if (!myPlayerSnap.exists()) {
            if (window.showGeniiToast) window.showGeniiToast("Não está registado nesta sala.", "error");
            setTimeout(() => window.location.href = "join.html", 200);
            return;
        }
        const streakResult = await updateStreak(user.uid);
        if (streakResult.isNewDay) {
            await progressMission(user.uid, 'daily_login');
        }
        listenToGame();
    } else {
        window.location.href = `login.html?returnUrl=player_game.html?pin=${pin}`;
    }
});
function listenToGame() {
    const gameRef = ref(rtdb, `live_games/${pin}`);
    if (currentUser) {
        let hasSeenMyDoc = false;
        const myPlayerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        onValue(myPlayerRef, (snap) => {
            if (snap.exists()) {
                hasSeenMyDoc = true;
            } else if (hasSeenMyDoc && !window.isGameFinishedLocally) {
                if (window.showGeniiToast) window.showGeniiToast("Foi removido da sala pelo anfitrião.", "error");
                showStatusOverlay("Foi removido", "O anfitrião removeu-o da sala.", "fa-ban");
                setTimeout(() => window.location.href = "join.html", 3000);
            }
        });
    }
    onValue(gameRef, (snap) => {
        if (!snap.exists()) {
            if (window.isGameFinishedLocally) return;
            const cachedStr = localStorage.getItem(`genii_game_state_${pin}`);
            if (cachedStr) {
                try {
                    const cachedData = JSON.parse(cachedStr);
                    if (cachedData && (cachedData.status === 'finished' || cachedData.status === 'cancelled')) {
                        window.isGameFinishedLocally = true;
                        renderPlayerEndDashboard(cachedData).catch(console.error);
                        return;
                    }
                } catch (e) {
                    console.error("Erro ao ler cache do jogo:", e);
                }
            }
            if (window.showGeniiToast) window.showGeniiToast("O jogo não existe ou foi encerrado.", "error");
            showStatusOverlay("Sala Encerrada", "O anfitrião fechou a sala.", "fa-door-closed");
            setTimeout(() => window.location.href = "join.html", 3000);
            return;
        }
        const gameData = snap.val();
        if (gameData) {
            localStorage.setItem(`genii_game_state_${pin}`, JSON.stringify(gameData));
        }
        if (gameData.theme_colors && Array.isArray(gameData.theme_colors) && gameData.theme_colors.length >= 4) {
            gameColors = gameData.theme_colors;
        }
        const status = gameData.status;
        currentGameStatus = status;
        DOM.loadingOverlay.style.display = 'none';
        if (status !== 'pre_question') {
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.style.display = 'none';
            if (status !== 'question_results') {
                const bar = document.getElementById("footer-feedback");
                if (bar) bar.classList.remove("visible");
            }
        }
        if (status === 'lobby' || status === 'waiting') {
            showStatusOverlay("A preparar...", "O jogo está prestes a começar!", "fa-hourglass-half");
            hasAnsweredCurrentQuestion = false;
            currentQuestionIndex = -1;
        }
        else if (status === 'paused') {
            showStatusOverlay("Jogo pausado", "O anfitrião pausou o jogo. Relaxa!", "fa-pause");
        }
        else if (status === 'pre_question') {
            hideStatusOverlay();
            const questionText = gameData.pre_question_text || "Próxima pergunta...";
            const questionImage = gameData.pre_question_image || "";
            runPreQuestionCountdown(questionText, questionImage);
            hasAnsweredCurrentQuestion = false;
        }
        else if (status === 'question_active') {
            const qIdx = gameData.current_question_index ?? 0;
            if (qIdx !== currentQuestionIndex) {
                currentQuestionIndex = qIdx;
                hasAnsweredCurrentQuestion = false;
            }
            if (!hasAnsweredCurrentQuestion) {
                hideStatusOverlay();
                if (gameData.current_question) {
                    renderQuestion(gameData.current_question, qIdx);
                }
                DOM.qCounter.textContent = `${qIdx + 1} / ${gameData.current_question?.totalQuestions || '?'}`;
            } else {
                showStatusOverlay("Resposta registada!", "Aguarda pelos outros jogadores...", "fa-check-circle");
            }
        }
        else if (status === 'question_results') {
            if (gameData.current_question) {
                showResultFeedback(gameData.current_question);
            }
            hasAnsweredCurrentQuestion = false;
        }
        else if (status === 'leaderboard') {
            showStatusOverlay("Ranking", "Veja a sua posição no pódio!", "fa-trophy");
            fetchMyScore();
        }
        else if (status === 'cancelled' || status === 'finished') {
            window.isGameFinishedLocally = true;
            fetchMyScore();
            if (window.showGeniiToast) window.showGeniiToast("Jogo terminado!", "success");
            renderPlayerEndDashboard(gameData).catch(console.error);
            recordMultiplayerResult(gameData);
        }
    }, (error) => {
        console.error("Erro ao ouvir o jogo:", error);
        if (window.showGeniiToast) window.showGeniiToast("Erro de ligação.", "error");
    });
}
function renderQuestion(question, index) {
    const oldCards = DOM.stage.querySelectorAll('.question-card');
    oldCards.forEach(c => {
        c.classList.remove('slide-active');
        c.classList.add('slide-out');
        setTimeout(() => c.remove(), 600);
    });
    const card = document.createElement('div');
    card.className = 'question-card slide-in';
    card.id = `player-card-${index}`;
    const questionText = getQuestionText(question);
    const imageUrl = getImageUrl(question);
    const options = normalizeOptions(question.options || question.answers);
    const type = question.type || 'quiz';
    const answerColors = question.answerColors || {};
    const answerImages = question.answerImages || {};
    if (type === 'slide') {
        card.classList.add('slide-mode');
        const slideBody = (question.body || '').replace(/\n/g, '<br>');
        const hasImage = imageUrl && imageUrl.trim() !== "";
        card.innerHTML = `
            <div class="slide-presentation-card">
                <div class="slide-title-banner">${questionText}</div>
                ${hasImage ? `<div class="slide-media-area has-image"><img src="${imageUrl}" onclick="window.openLightbox('${imageUrl}')" title="Clique para ampliar"></div>` : ''}
                ${slideBody ? `<div class="slide-body-bubble">${slideBody}</div>` : ''}
            </div>
        `;
        hasAnsweredCurrentQuestion = true;
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
                <div class="option-btn opt-true" data-index="0" onclick="window._selectAnswer(0, this)">
                    <div class="opt-icon"><i class="fa-solid fa-check"></i></div> Verdadeiro
                </div>
                <div class="option-btn opt-false" data-index="1" onclick="window._selectAnswer(1, this)">
                    <div class="opt-icon"><i class="fa-solid fa-xmark"></i></div> Falso
                </div>
            `;
        } else if (type === 'typing') {
            optionsHtml = `
                <div class="typing-game-container">
                    <input type="text" class="typing-game-input" id="typing-input-${index}" placeholder="Escreva a sua resposta..." autocomplete="off">
                    <button class="typing-game-submit" onclick="window._selectTypingAnswer(${index})">
                        <i class="fa-solid fa-paper-plane"></i> Enviar
                    </button>
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
                    <div class="option-btn ${colorClass}" data-index="${i}" ${visibility} ${styleAttr} onclick="window._selectAnswer(${i}, this)">
                        <div class="opt-icon">${letters[i]}</div>
                        ${imgHtml}
                        ${opt}
                    </div>
                `;
            });
        }
        card.innerHTML = `
            ${mediaHtml}
            <div class="question-text">${questionText}</div>
            <div class="options-grid">${optionsHtml}</div>
        `;
    }
    DOM.stage.appendChild(card);
    resetHeader();
    if (type === 'typing') {
        const input = card.querySelector(`#typing-input-${index}`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') window._selectTypingAnswer(index);
            });
            setTimeout(() => input.focus(), 700);
        }
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.classList.remove('slide-in');
            card.classList.add('slide-active');
        });
    });
}
window._selectAnswer = async (answerIndex, btnElement) => {
    if (!currentUser || hasAnsweredCurrentQuestion || currentGameStatus !== 'question_active') return;
    hasAnsweredCurrentQuestion = true;
    const card = btnElement.closest('.question-card');
    if (card) card.classList.add('locked');
    btnElement.style.border = '4px solid white';
    btnElement.style.transform = 'scale(1.05)';
    const allBtns = card ? card.querySelectorAll('.option-btn') : [];
    allBtns.forEach(btn => {
        if (btn !== btnElement) {
            btn.classList.add('dimmed');
        }
    });
    DOM.headerTitle.innerHTML = '<i class="fa-solid fa-clock"></i> A aguardar...';
    try {
        const playerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        await rtdbUpdate(playerRef, {
            answerIndex: answerIndex,
            answeredAt: Date.now()
        });
    } catch (error) {
        console.error("Erro ao enviar resposta:", error);
        if (window.showGeniiToast) window.showGeniiToast("Erro ao enviar resposta.", "error");
        hasAnsweredCurrentQuestion = false;
        if (card) card.classList.remove('locked');
        allBtns.forEach(btn => btn.classList.remove('dimmed'));
        btnElement.style.border = '';
        btnElement.style.transform = '';
    }
};
window._selectTypingAnswer = async (qIndex) => {
    if (!currentUser || hasAnsweredCurrentQuestion || currentGameStatus !== 'question_active') return;
    const input = document.getElementById(`typing-input-${qIndex}`);
    if (!input) return;
    const answer = input.value.trim();
    if (!answer) return;
    hasAnsweredCurrentQuestion = true;
    input.disabled = true;
    const container = input.closest('.typing-game-container');
    if (container) {
        const btn = container.querySelector('.typing-game-submit');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-check"></i> Enviada'; }
    }
    DOM.headerTitle.innerHTML = '<i class="fa-solid fa-clock"></i> A aguardar...';
    try {
        const playerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        await rtdbUpdate(playerRef, {
            typingAnswer: answer,
            answeredAt: Date.now()
        });
    } catch (error) {
        console.error("Erro ao enviar resposta:", error);
        if (window.showGeniiToast) window.showGeniiToast("Erro ao enviar resposta.", "error");
        hasAnsweredCurrentQuestion = false;
        input.disabled = false;
    }
};
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
function showResultFeedback(question) {
    const correctIdx = getCorrectIndex(question);
    const type = question.type || 'quiz';
    const card = DOM.stage.querySelector('.question-card');
    if (!card) {
        showStatusOverlay("Tempo esgotado!", "Vê os resultados no ecrã do Host", "fa-clock");
        return;
    }
    card.classList.add('locked');
    if (type === 'typing') {
        const accepted = question.acceptedAnswers || [];
        const container = card.querySelector('.typing-game-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div style="font-weight:700; color:#00b894; margin-bottom:8px;"><i class="fa-solid fa-check-circle"></i> Respostas aceites:</div>
                    <div>${accepted.map(a => `<span style="display:inline-block; background:#e8f8f5; color:#00b894; padding:4px 12px; border-radius:20px; margin:3px; font-weight:600;">${a}</span>`).join('')}</div>
                </div>
            `;
        }
        fetchMyTypingAnswerAndShowHeader(question, accepted);
    } else {
        fetchMyAnswerAndShowHeader(question, correctIdx);
    }
}
async function fetchMyTypingAnswerAndShowHeader(question, acceptedAnswers) {
    try {
        const playerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        const playerSnap = await rtdbGet(playerRef);
        if (playerSnap.exists()) {
            const pData = playerSnap.val();
            const myTyping = (pData.typingAnswer || '').toLowerCase().trim();
            myScore = pData.score || 0;
            DOM.scoreDisplay.textContent = myScore;
            totalQuestionsPlayed++;
            const accepted = acceptedAnswers.map(a => a.toLowerCase().trim());
            const isCorrect = myTyping && accepted.includes(myTyping);
            const correctText = acceptedAnswers[0] || "";
            showFeedbackBar(isCorrect, correctText, !myTyping);
            if (isCorrect) {
                myCorrectCount++;
                DOM.mainHeader.classList.add('header-correct');
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-check'></i> CORRETO!";
            } else if (myTyping) {
                DOM.mainHeader.classList.add('header-wrong');
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-xmark'></i> INCORRETO";
            } else {
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-clock'></i> Não respondeste";
            }
        }
    } catch (e) {
        console.error("Erro ao buscar resposta:", e);
    }
}
async function fetchMyAnswerAndShowHeader(question, correctIdx) {
    try {
        const playerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        const playerSnap = await rtdbGet(playerRef);
        if (playerSnap.exists()) {
            const pData = playerSnap.val();
            const myAnswer = pData.answerIndex;
            myScore = pData.score || 0;
            DOM.scoreDisplay.textContent = myScore;
            totalQuestionsPlayed++;
            const isCorrect = (myAnswer === correctIdx);
            const card = DOM.stage.querySelector('.question-card');
            if (card) {
                const allBtns = card.querySelectorAll('.option-btn');
                allBtns.forEach(btn => {
                    const idx = parseInt(btn.getAttribute('data-index'));
                    btn.classList.remove('dimmed', 'correct', 'wrong');
                    btn.style.border = '';
                    btn.style.transform = '';
                    if (idx === correctIdx) {
                        btn.classList.add('correct');
                    } else if (myAnswer !== null && myAnswer !== undefined && idx === myAnswer) {
                        btn.classList.add('wrong');
                    } else {
                        btn.classList.add('dimmed');
                    }
                });
            }
            const options = normalizeOptions(question.options || question.answers);
            let correctText = "";
            if (question.type === 'boolean') {
                correctText = correctIdx === 0 ? "Verdadeiro" : "Falso";
            } else if (options && correctIdx >= 0 && correctIdx < options.length) {
                correctText = options[correctIdx];
            }
            showFeedbackBar(isCorrect, correctText, myAnswer === null || myAnswer === undefined);
            if (isCorrect) {
                myCorrectCount++;
                DOM.mainHeader.classList.add('header-correct');
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-check'></i> CORRETO!";
            } else if (myAnswer !== null && myAnswer !== undefined) {
                DOM.mainHeader.classList.add('header-wrong');
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-xmark'></i> INCORRETO";
            } else {
                DOM.headerTitle.innerHTML = "<i class='fa-solid fa-clock'></i> Não respondeste";
            }
        }
    } catch (e) {
        console.error("Erro ao buscar resposta:", e);
    }
}
function showFeedbackBar(isCorrect, correctText, isTimeout = false) {
    const bar = document.getElementById("footer-feedback");
    const iconI = document.getElementById("feedback-icon-i");
    const title = document.getElementById("feedback-title");
    const subtitle = document.getElementById("feedback-subtitle");
    if (!bar) return;
    bar.className = "footer-feedback-bar";
    if (isCorrect) {
        bar.classList.add("correct");
        if (iconI) iconI.className = "fa-solid fa-check";
        if (title) title.textContent = "Excelente!";
        if (subtitle) subtitle.textContent = "";
    } else {
        bar.classList.add("wrong");
        if (iconI) iconI.className = "fa-solid fa-xmark";
        if (title) title.textContent = isTimeout ? "O tempo acabou!" : "Não foi desta...";
        if (subtitle) {
            subtitle.innerHTML = correctText
                ? `A resposta correta era: <strong>${correctText}</strong>`
                : "";
        }
    }
    bar.classList.add("visible");
}
async function fetchMyScore() {
    if (!currentUser) return;
    try {
        const playerRef = ref(rtdb, `live_games/${pin}/players/${currentUser.uid}`);
        const playerSnap = await rtdbGet(playerRef);
        if (playerSnap.exists()) {
            myScore = playerSnap.val().score || 0;
            DOM.scoreDisplay.textContent = myScore;
        }
    } catch (e) {
        console.error("Erro ao buscar score:", e);
    }
}
function showStatusOverlay(title, subtitle, icon = "fa-hourglass-half") {
    const cards = DOM.stage.querySelectorAll('.question-card');
    cards.forEach(c => c.style.display = 'none');
    DOM.statusOverlay.style.display = 'flex';
    DOM.statusTitle.textContent = title;
    DOM.statusSubtitle.textContent = subtitle;
    const iconEl = DOM.statusOverlay.querySelector('.status-icon');
    if (iconEl) {
        iconEl.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        if (icon === 'fa-hourglass-half' || icon === 'fa-clock') {
            iconEl.classList.add('status-icon-pulse');
        } else {
            iconEl.classList.remove('status-icon-pulse');
        }
    }
}
function hideStatusOverlay() {
    DOM.statusOverlay.style.display = 'none';
    const cards = DOM.stage.querySelectorAll('.question-card');
    cards.forEach(c => c.style.display = 'flex');
}
function resetHeader() {
    DOM.mainHeader.className = 'game-header';
    DOM.headerTitle.textContent = '';
}
let _hasRecordedResult = false;
async function recordMultiplayerResult(gameData) {
    if (!currentUser || _hasRecordedResult) return;
    _hasRecordedResult = true;
    try {
        let position = 0;
        try {
            const playersSnap = await rtdbGet(ref(rtdb, `live_games/${pin}/players`));
            const scores = [];
            if (playersSnap.exists()) {
                Object.keys(playersSnap.val()).forEach(key => {
                    scores.push({ uid: key, score: playersSnap.val()[key].score || 0 });
                });
            }
            scores.sort((a, b) => b.score - a.score);
            position = scores.findIndex(s => s.uid === currentUser.uid) + 1;
        } catch (e) {
            console.error("Erro ao buscar posição:", e);
        }
        const earnedXp = await recordGame(currentUser.uid, {
            correctCount: myCorrectCount,
            totalQuestions: totalQuestionsPlayed,
            isPublicQuiz: false,
            isMultiplayer: true,
            position
        });
        const isPerfect = totalQuestionsPlayed > 0 && myCorrectCount === totalQuestionsPlayed;
        await checkMissionsAfterGame(currentUser.uid, {
            isPerfect,
            isPublicQuiz: false
        });
    } catch (e) {
        console.error('Erro ao gravar resultado multiplayer:', e);
    }
}
function runPreQuestionCountdown(questionText, questionImage) {
    const startScreen = document.getElementById('start-screen');
    const titleContainer = document.getElementById('start-title-container');
    const quizTitle = document.getElementById('start-quiz-title');
    const countdownContainer = document.getElementById('countdown-container');
    const loadingFill = document.getElementById('question-loading-fill');
    const loadingMedia = document.getElementById('loading-media-area');
    if (startScreen) startScreen.style.display = 'flex';
    if (titleContainer) titleContainer.style.display = 'flex';
    if (countdownContainer) countdownContainer.style.display = 'none';
    if (quizTitle) quizTitle.innerText = questionText || "Próxima pergunta...";
    if (loadingMedia) {
        if (questionImage && questionImage.trim() !== "") {
            loadingMedia.innerHTML = `<img src="${questionImage}" alt="Imagem da Pergunta">`;
            loadingMedia.style.display = 'flex';
        } else {
            loadingMedia.innerHTML = '';
            loadingMedia.style.display = 'none';
        }
    }
    if (loadingFill) {
        loadingFill.style.animation = 'none';
        loadingFill.offsetHeight;
        loadingFill.style.animation = 'loadingProgress 3s ease-out forwards';
    }
    setTimeout(() => {
        if (titleContainer) titleContainer.style.display = 'none';
        if (countdownContainer) countdownContainer.style.display = 'flex';
        let i = 0;
        const nums = [3, 2, 1];
        if (window.playerCountdownInterval) clearTimeout(window.playerCountdownInterval);
        function tick() {
            if (i < nums.length) {
                countdownContainer.innerHTML = `
                    <div class="blob-wrapper">
                        <div class="genii-blob dark"></div>
                        <div class="genii-blob"></div>
                    </div>
                    <div class="countdown-number">${nums[i]}</div>`;
                i++;
                window.playerCountdownInterval = setTimeout(tick, 1000);
            } else {
                if (startScreen) startScreen.style.display = 'none';
                if (countdownContainer) countdownContainer.style.display = 'none';
            }
        }
        tick();
    }, 3000);
}
function showTimesUp() {
    const timesUpScreen = document.getElementById('times-up-screen');
    if(timesUpScreen) timesUpScreen.style.display = 'flex';
}
async function renderPlayerEndDashboard(gameData) {
    DOM.endScreen.innerHTML = '<div id="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin fa-4x" style="color:white;"></i><h2 style="font-family:\'Fredoka\';margin-top:20px;color:white;">A calcular resultados...</h2></div>';
    DOM.endScreen.style.display = 'flex';
    DOM.endScreen.style.background = '#0AC7BE';
    try {
        let allPlayers = [];
        const playersVal = gameData?.players || {};
        Object.keys(playersVal).forEach(key => {
            const d = playersVal[key];
            allPlayers.push({
                uid: key,
                name: d.name || d.displayName || d.nickname || "Jogador",
                score: d.score || 0,
                correctCount: d.correctCount || 0,
                incorrectCount: d.incorrectCount || 0,
                missedCount: d.missedCount || 0,
                avatar: d.avatar || d.photoURL || null
            });
        });
        allPlayers.sort((a, b) => b.score - a.score);
        let myIndex = allPlayers.findIndex(p => p.uid === currentUser.uid);
        let myData = allPlayers[myIndex] || { score: 0, correctCount: 0, incorrectCount: 0, missedCount: 0, name: "Eu" };
        let myRankNum = myIndex !== -1 ? myIndex + 1 : 0;
        let myRankText = myRankNum + "º Place";
        if (myRankNum === 1) myRankText = "1º Lugar";
        else if (myRankNum === 2) myRankText = "2º Lugar";
        else if (myRankNum === 3) myRankText = "3º Lugar";
        else myRankText = myRankNum + "º Lugar";
        const totalAnswers = myData.correctCount + myData.incorrectCount + myData.missedCount;
        const accuracy = totalAnswers === 0 ? 0 : Math.round((myData.correctCount / totalAnswers) * 100);
        let accColor = '';
        if (accuracy < 50) accColor = 'bp-acc-bad';
        else if (accuracy < 80) accColor = 'bp-acc-mid';
        const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);
        const getAvatar = (p, size) => {
            if (window.renderGeniiAvatar) {
                let avatarHtml = window.renderGeniiAvatar(p, size);
                return `<div style="border-radius:50%;overflow:hidden;width:${size};height:${size};">${avatarHtml}</div>`;
            }
            return `<div style="width:${size};height:${size};border-radius:50%;background:linear-gradient(135deg,#6C5CE7,#00D2BA);display:flex;align-items:center;justify-content:center;color:white;font-family:Fredoka;font-weight:800;font-size:calc(${size} * 0.5);">${(p.name || 'G').charAt(0).toUpperCase()}</div>`;
        };
        const displayList = allPlayers.slice(0, 3).map((p, i) => {
            let r = i + 1;
            let rm = r === 1 ? '1º' : r === 2 ? '2º' : '3º';
            return `
                <div class="bp-top3-row">
                    <span class="bp-top3-rank">${rm}</span>
                    <div class="bp-top3-ava">${getAvatar(p, '40px')}</div>
                    <span class="bp-top3-name">${p.name}</span>
                    <span class="bp-top3-pts">${formatNumber(p.score)} pts</span>
                </div>
            `;
        }).join('');
        DOM.endScreen.innerHTML = `
            <div id="player-end-dashboard">
                <div class="bp-end-card">
                    <div class="bp-placement-title">${myRankText}</div>
                    <div class="bp-my-avatar">${getAvatar(myData, '80px')}</div>
                    <div class="bp-my-name">${myData.name}</div>
                    <div class="bp-my-score">${formatNumber(myData.score)} pts</div>
                    <div class="bp-top3-list">
                        ${displayList}
                    </div>
                    <div class="bp-accuracy-section">
                        <div class="bp-acc-left">
                            <span class="bp-acc-lbl">Precisão:</span>
                            <span class="bp-acc-val">${myData.correctCount} / ${totalAnswers}</span>
                        </div>
                        <div class="bp-acc-right ${accColor}">
                            ${accuracy}%
                        </div>
                    </div>
                </div>
                <a href="join.html" class="bp-exit">Sair do Jogo</a>
            </div>
        `;
        if (myRankNum <= 3 && window.confetti) {
            confetti({ particleCount: 200, spread: 180, origin: { y: 0.1 }, zIndex: 3000 });
        }
    } catch(err) {
        console.error(err);
        DOM.endScreen.innerHTML = '<div style="padding:40px;text-align:center;"><h2>Resultados Finais</h2><a href="join.html">Sair</a></div>';
    }
}
