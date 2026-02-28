/*
  Countdown timer logic.  
  Uses system time as source of truth.  
  Keeps state in localStorage so it survives reloads or background.
*/

const STORAGE_KEY = 'countdown-timer-state';

// DOM references
const setupEl = document.getElementById('setup');
const runningEl = document.getElementById('running');
const doneEl = document.getElementById('done');
const displayEl = document.getElementById('display');
const displayDoneEl = document.getElementById('displayDone');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const doneResetBtn = document.getElementById('doneResetBtn');
const progressCircle = document.getElementById('progressCircle');
const progressCircleDone = document.getElementById('progressCircleDone');

// precompute circumference of ring (r=140)
const CIRCUMFERENCE = 2 * Math.PI * 140;

let tickInterval = null;

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const secs = total % 60;
    const mins = Math.floor(total / 60) % 60;
    const hrs = Math.floor(total / 3600);
    if (hrs) {
        return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    }
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function showScreen(name) {
    setupEl.classList.toggle('hidden', name !== 'setup');
    runningEl.classList.toggle('hidden', name !== 'running');
    doneEl.classList.toggle('hidden', name !== 'done');
}

function updateDisplay(remaining) {
    displayEl.textContent = formatTime(remaining);
}

function updateRing(progress) {
    // progress in [0,1]
    const offset = CIRCUMFERENCE * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
    if (progressCircleDone) {
        progressCircleDone.style.strokeDashoffset = offset;
    }
}

function startTimer(durationMs, existingTotal) {
    const endDate = Date.now() + durationMs;
    const total = existingTotal || durationMs;
    const state = { status: 'running', endDate, totalDuration: total };
    saveState(state);
    // ring should start full
    updateRing(1);
    runLoop(state);
}

function pauseTimer() {
    const state = loadState();
    if (!state || state.status !== 'running') return;
    const remaining = state.endDate - Date.now();
    const newState = { status: 'paused', remaining, totalDuration: state.totalDuration };
    saveState(newState);
    showScreen('running');
    updateDisplay(remaining);
    updateRing(remaining / state.totalDuration);
    stopLoop();
}

function resumeTimer() {
    const state = loadState();
    if (!state || state.status !== 'paused') return;
    startTimer(state.remaining, state.totalDuration);
}

function resetTimer() {
    clearState();
    stopLoop();
    showScreen('setup');
}

function runLoop(state) {
    stopLoop();
    showScreen('running');
    // ensure pause button shows PAUSE style
    pauseBtn.textContent = 'PAUSE';
    pauseBtn.classList.remove('primary');
    pauseBtn.classList.add('secondary');
    function tick() {
        const now = Date.now();
        const remaining = state.endDate - now;
        if (remaining <= 0) {
            finishTimer();
            return;
        }
        updateDisplay(remaining);
        const prog = remaining / state.totalDuration;
        updateRing(prog);
    }
    tick();
    tickInterval = setInterval(() => {
        const currentState = loadState();
        if (!currentState || currentState.status !== 'running') {
            stopLoop();
            return;
        }
        state.endDate = currentState.endDate; // in case resumed
        state.totalDuration = currentState.totalDuration;
        tick();
    }, 200);
}

function stopLoop() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

function finishTimer() {
    clearState();
    stopLoop();
    // set ring empty and show glow on DONE text
    updateRing(0);
    if (displayDoneEl) {
        displayDoneEl.classList.add('done-glow');
        // remove glow after animation
        setTimeout(() => displayDoneEl.classList.remove('done-glow'), 1000);
    }
    showScreen('done');
}

// wire events
startBtn.addEventListener('click', () => {
    const mins = parseInt(minutesInput.value, 10) || 0;
    const secs = parseInt(secondsInput.value, 10) || 0;
    const totalMs = (mins * 60 + secs) * 1000;
    if (totalMs <= 0) return;
    startTimer(totalMs);
});
pauseBtn.addEventListener('click', () => {
    const state = loadState();
    if (state && state.status === 'running') {
        pauseTimer();
        pauseBtn.textContent = 'RESUME';
        pauseBtn.classList.remove('secondary');
        pauseBtn.classList.add('primary');
    } else if (state && state.status === 'paused') {
        resumeTimer();
        pauseBtn.textContent = 'PAUSE';
        pauseBtn.classList.remove('primary');
        pauseBtn.classList.add('secondary');
    }
});
resetBtn.addEventListener('click', resetTimer);
doneResetBtn.addEventListener('click', resetTimer);

// initialize on load
window.addEventListener('load', () => {
    const state = loadState();
    if (state) {
        if (state.status === 'running') {
            runLoop(state);
        } else if (state.status === 'paused') {
            showScreen('running');
            pauseBtn.textContent = 'RESUME';
            updateDisplay(state.remaining);
            updateRing(state.remaining / state.totalDuration);
        }
    } else {
        showScreen('setup');
    }
});
