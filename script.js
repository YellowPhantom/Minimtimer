const canvas = document.getElementById('timer-canvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('ui-container');

// State variables
let timerMode = 'none'; 
let startTime = 0;
let duration = 0;
let isRunning = false;
let particles = [];
let currentSecondDisplay = -1;
let animationFrameId;
let width, height;

// Retina Display Scaling for crisp text
function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Lazy-loaded Audio Context (Fixes Safari/iOS block)
let audioCtx;
function playSound(type) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
}

// UI Interaction
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

// Touch/Click to stop
canvas.addEventListener('pointerdown', () => {
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        uiContainer.classList.remove('hidden');
        ctx.clearRect(0, 0, width, height);
    }
});

function startTimer() {
    playSound('tick'); // Unlocks audio context securely
    startTime = Date.now();
    isRunning = true;
    currentSecondDisplay = -1; 
    uiContainer.classList.add('hidden');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animate();
}

// Animation & Physics Logic
function getElapsedTime() {
    return (Date.now() - startTime) / 1000;
}

function drawCircleFormation(centerVal) {
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "SF Mono", "Courier New", monospace';
    const mins = Math.floor(centerVal / 60).toString().padStart(2, '0');
    const secs = (centerVal % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}`, width / 2, height / 2);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "SF Mono", "Courier New", monospace';
    const radius = Math.min(width, height) * 0.3;
    const count = 12;

    for(let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 - (Math.PI / 2);
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        const displayVal = Math.max(0, centerVal + i);
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
            x: width / 2 + (Math.random() - 0.5) * 20, 
            y: height / 2 + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 0,
            targetX: spacingX * (col + 1),
            targetY: spacingY * (row + 1)
        });
    }
}

function drawGridParticles() {
    ctx.fillStyle = '#111';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "SF Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Spring Physics Implementation
    const tension = 0.12;
    const friction = 0.75;

    particles.forEach(p => {
        p.vx += (p.targetX - p.x) * tension;
        p.vy += (p.targetY - p.y) * tension;
        p.vx *= friction;
        p.vy *= friction;
        
        p.x += p.vx;
        p.y += p.vy;
        
        ctx.fillText(p.val, p.x, p.y);
    });
}

function animate() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, width, height);

    let currentSecond;
    if (timerMode === 'countdown') {
        const remaining = Math.max(0, duration - getElapsedTime());
        currentSecond = Math.ceil(remaining);
        
        if (remaining === 0) {
            isRunning = false;
            generateGridParticles(0, 150);
            playSound('pop');
            drawGridParticles();
            return; // Halt loop
        }
    } else {
        currentSecond = Math.floor(getElapsedTime());
    }

    if (currentSecond !== currentSecondDisplay) {
        currentSecondDisplay = currentSecond;

        if (timerMode === 'countdown' && currentSecond <= 10 && currentSecond > 0) {
            const count = Math.floor(Math.pow(11 - currentSecond, 2));
            generateGridParticles(currentSecond, count);
            playSound('pop');
        } else {
            playSound('tick');
        }
    }

    if (timerMode === 'countdown') {
        if (currentSecond > 10) drawCircleFormation(currentSecond);
        else drawGridParticles();
    } else {
        drawCircleFormation(currentSecond);
    }

    animationFrameId = requestAnimationFrame(animate);
}