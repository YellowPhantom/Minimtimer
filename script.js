const canvas = document.getElementById('timer-canvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('ui-container');

// Canvas setup
let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// State variables
let timerMode = 'none'; // 'countdown' or 'stopwatch'
let startTime = 0;
let duration = 0;
let isRunning = false;
let particles = [];
let currentSecondDisplay = -1;
let animationFrameId;

// --- Web Audio API for synthetic sounds ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playPop() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// --- UI Interaction ---
document.getElementById('btn-countdown').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('btn-stopwatch').classList.remove('active');
    document.getElementById('countdown-settings').classList.remove('hidden');
    document.getElementById('stopwatch-settings').classList.add('hidden');
});

document.getElementById('btn-stopwatch').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('btn-countdown').classList.remove('active');
    document.getElementById('stopwatch-settings').classList.remove('hidden');
    document.getElementById('countdown-settings').classList.add('hidden');
});

document.getElementById('start-countdown').addEventListener('click', () => {
    const val = parseInt(document.getElementById('countdown-input').value);
    if(isNaN(val) || val <= 0) return;
    duration = val;
    timerMode = 'countdown';
    startTimer();
});

document.getElementById('start-stopwatch').addEventListener('click', () => {
    timerMode = 'stopwatch';
    startTimer();
});

canvas.addEventListener('click', () => {
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        uiContainer.classList.remove('hidden');
        ctx.clearRect(0, 0, width, height); // Clear screen on reset
    }
});

function startTimer() {
    // Unlock audio context on user gesture
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    startTime = Date.now();
    isRunning = true;
    currentSecondDisplay = -1; // Force visual update
    uiContainer.classList.add('hidden');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    lastTime = Date.now();
    animate();
}

// --- Animation Logic ---
function getElapsedTime() {
    return (Date.now() - startTime) / 1000;
}

function drawCircleFormation(centerVal) {
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Center Text (00:XX format)
    ctx.font = '20px "Courier New", Courier, monospace';
    const mins = Math.floor(centerVal / 60).toString().padStart(2, '0');
    const secs = (centerVal % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}`, width / 2, height / 2);

    // Scattered ring of surrounding numbers
    ctx.font = '14px "Courier New", Courier, monospace';
    const radiusX = Math.min(width, height) * 0.25;
    const radiusY = Math.min(width, height) * 0.18;
    const count = 12;

    for(let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        // Introduce slight asymmetry similar to the video
        const rX = radiusX + Math.sin(i * 2.5) * 15; 
        const rY = radiusY + Math.cos(i * 1.5) * 15;

        const x = width / 2 + Math.cos(angle) * rX;
        const y = height / 2 + Math.sin(angle) * rY;

        // Display numbers relative to the current sequence
        const displayVal = Math.max(0, centerVal + (i - Math.floor(count/2)));
        ctx.fillText(displayVal, x, y);
    }
}

function generateGridParticles(number, totalCount) {
    particles = [];
    const cols = Math.ceil(Math.sqrt(totalCount));
    const rows = Math.ceil(totalCount / cols);

    const spacingX = width / (cols + 1);
    const spacingY = height / (rows + 1);

    for (let i = 0; i < totalCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        particles.push({
            val: number,
            x: width / 2 + (Math.random() - 0.5) * 50, // Burst from center
            y: height / 2 + (Math.random() - 0.5) * 50,
            targetX: spacingX * (col + 1),
            targetY: spacingY * (row + 1)
        });
    }
}

function drawGridParticles() {
    ctx.fillStyle = '#111';
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    particles.forEach(p => {
        // Smooth lerp movement towards grid target
        p.x += (p.targetX - p.x) * 0.08;
        p.y += (p.targetY - p.y) * 0.08;
        ctx.fillText(p.val, p.x, p.y);
    });
}

let lastTime = Date.now();
function animate() {
    if (!isRunning) return;
    
    const now = Date.now();
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    let currentSecond;
    if (timerMode === 'countdown') {
        const remaining = Math.max(0, duration - getElapsedTime());
        currentSecond = Math.ceil(remaining);
        
        if (remaining === 0) {
            isRunning = false;
            generateGridParticles(0, 150); // Final burst of zeros
            playPop();
        }
    } else {
        currentSecond = Math.floor(getElapsedTime());
    }

    // Trigger state changes / Sounds when second changes
    if (currentSecond !== currentSecondDisplay) {
        currentSecondDisplay = currentSecond;

        if (timerMode === 'countdown' && currentSecond <= 10 && currentSecond > 0) {
            // Exponential particle growth: 10s = 1 particle, 1s = 100 particles
            const count = Math.floor(Math.pow(11 - currentSecond, 2));
            generateGridParticles(currentSecond, count);
            playPop();
        } else if (timerMode === 'countdown' && currentSecond === 0) {
            // Handled in completion check
        } else {
            playTick();
        }
    }

    // Draw frame
    if (timerMode === 'countdown') {
        if (currentSecond > 10) {
            drawCircleFormation(currentSecond);
        } else {
            drawGridParticles();
        }
    } else {
        // Stopwatch always uses the floating circle
        drawCircleFormation(currentSecond);
    }

    if (isRunning || (timerMode === 'countdown' && currentSecond === 0)) {
        animationFrameId = requestAnimationFrame(animate);
    }
}