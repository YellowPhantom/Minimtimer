const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');
const timeInput = document.getElementById('time-input');

let width, height;
let audioCtx;
let isRunning = false;
let startTime = 0;
let duration = 0;
let lastSecond = -1;
let animationFrameId;
let lastRenderTime = 0;
let ringRotation = 0;

// High-DPI Display Scaling for crystal clear text
function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset scale before applying
}
window.addEventListener('resize', resize);
resize();

// --- Web Audio API Engine ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playHeartbeat() {
    if (!audioCtx) return;
    const playThump = (freq, timeOffset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + timeOffset + 0.1);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + timeOffset + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + timeOffset);
        osc.stop(audioCtx.currentTime + timeOffset + 0.1);
    };
    playThump(60, 0);      // First beat
    playThump(50, 0.15);   // Second beat (echo)
}

function playRapidPop() {
    if (!audioCtx) return;
    // Rapid satisfying 3-burst trill for the ripple expansion
    for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500 + (i * 150), audioCtx.currentTime + (i * 0.04));
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + (i * 0.04) + 0.05);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + (i * 0.04));
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (i * 0.04) + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + (i * 0.04));
        osc.stop(audioCtx.currentTime + (i * 0.04) + 0.05);
    }
}

// --- Interaction ---
document.getElementById('start-btn').addEventListener('click', () => {
    const val = parseInt(timeInput.value);
    if (isNaN(val) || val <= 0) return;
    
    initAudio();
    duration = val;
    startTime = Date.now();
    isRunning = true;
    lastSecond = -1;
    lastRenderTime = Date.now();
    
    controls.classList.add('hidden');
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animate();
});

canvas.addEventListener('pointerdown', () => {
    if (isRunning) {
        isRunning = false;
        controls.classList.remove('hidden');
        ctx.clearRect(0, 0, width, height);
    }
});

// --- Render Engine ---
function drawPhase1(sec, delta) {
    // Smooth CCW rotation
    ringRotation -= delta * 0.5; // 0.5 radians per second

    // Center MM:SS
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px system-ui, -apple-system, sans-serif';
    
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    ctx.fillText(`${m}:${s}`, width / 2, height / 2);

    // Tight 9-number ring
    const radius = 120;
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    
    for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2 + ringRotation;
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        ctx.fillText(sec + i, x, y);
    }
}

function drawPhase2(sec, remaining) {
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';

    // Progress goes from 1.0 (at 9s) to 10.0 (at 0s)
    const progress = 10 - remaining; 
    const currentRings = Math.max(1, Math.floor(progress));
    const pulse = progress % 1; // 0 to 1 over the course of each second
    
    // Smooth spring expansion burst
    const easePulse = 1 - Math.pow(1 - pulse, 4);
    const baseSpacing = 45;
    const dynamicSpacing = baseSpacing + (progress * 2.5) + (easePulse * 8);

    for (let n = 0; n <= currentRings; n++) {
        if (n === 0) {
            // Absolute Center
            ctx.font = '700 48px system-ui, -apple-system, sans-serif';
            ctx.fillText(sec, width / 2, height / 2);
            ctx.font = '600 24px system-ui, -apple-system, sans-serif';
            continue;
        }
        
        // Hexagonal perimeter multiplication
        const items = n * 6;
        const radius = n * dynamicSpacing;
        const offsetAngle = (n % 2 === 0) ? 0 : (Math.PI / items); // Interlocks concentric shapes
        
        // Fade in the outermost ring
        let opacity = 1;
        if (n === currentRings) {
            opacity = pulse; 
        }
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;

        for (let i = 0; i < items; i++) {
            const angle = (i / items) * Math.PI * 2 + offsetAngle;
            const x = width / 2 + Math.cos(angle) * radius;
            const y = height / 2 + Math.sin(angle) * radius;
            ctx.fillText(sec, x, y);
        }
    }
}

function animate() {
    if (!isRunning) return;
    
    const now = Date.now();
    const delta = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    const elapsed = (now - startTime) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const currentSecond = Math.ceil(remaining);

    ctx.clearRect(0, 0, width, height);

    // Audio & State Triggers
    if (currentSecond !== lastSecond) {
        if (currentSecond > 9) {
            playHeartbeat();
        } else if (currentSecond > 0 && lastSecond !== -1) {
            playRapidPop(); // Trigger synchronized rapid geometric expansion sounds
        } else if (currentSecond === 0 && lastSecond !== -1) {
            playRapidPop(); 
        }
        lastSecond = currentSecond;
    }

    // Render Phases
    if (currentSecond > 9) {
        drawPhase1(currentSecond, delta);
    } else if (currentSecond > 0) {
        drawPhase2(currentSecond, remaining);
    } else {
        isRunning = false;
        controls.classList.remove('hidden');
        ctx.clearRect(0, 0, width, height);
        return; // Halt loop gracefully
    }

    animationFrameId = requestAnimationFrame(animate);
}