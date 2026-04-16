import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

const video = document.getElementById('camera-video');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const uiLayer = document.getElementById('ui-layer');
const startBtn = document.getElementById('start-button');
const debugLayer = document.getElementById('debug-layer');
const dState = document.getElementById('debug-state');
const dRatio = document.getElementById('debug-ratio');
const dAlpha = document.getElementById('debug-alpha');

const urlParams = new URLSearchParams(window.location.search);
const isDebug = urlParams.has('debug') && urlParams.get('debug') === '1';

if (isDebug) {
    debugLayer.style.display = 'block';
}

let faceLandmarker;
let state = "NEAR";
let smoothedRatio = 0.4;
let currentAlpha = 0.0;
let lastFaceDetectedTime = 0;
let lastVideoTime = -1;
let hasPhoto = false;

const THRESHOLD_RESET = 0.25;
const THRESHOLD_CAPTURE = 0.21;
const THRESHOLD_FAR = 0.15;
const ALPHA_SMOOTHING = 0.15;
const RATIO_SMOOTHING = 0.15;
let captureFlash = 0.0;

const photoCanvas = document.createElement('canvas');
const photoCtx = photoCanvas.getContext('2d');

async function initModels() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
    });
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            photoCanvas.width = video.videoWidth;
            photoCanvas.height = video.videoHeight;
            uiLayer.style.opacity = '0';
            setTimeout(() => { uiLayer.style.display = 'none'; }, 500);
            requestAnimationFrame(predictWebcam);
        });
    } catch (e) {
        startBtn.textContent = "Error";
    }
}

startBtn.addEventListener('click', async () => {
    startBtn.style.opacity = '0.5';
    startBtn.style.pointerEvents = 'none';
    await initModels();
    await startCamera();
});

function capturePhoto() {
    photoCtx.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
    // Trigger visual hint that snapshot occurred
    captureFlash = 1.0;
    hasPhoto = true;
}

function predictWebcam() {
    if (video.videoWidth > 0 && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        photoCanvas.width = video.videoWidth;
        photoCanvas.height = video.videoHeight;
    }

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        let startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(video, startTimeMs);
        
        if (results.faceLandmarks.length > 0) {
            lastFaceDetectedTime = startTimeMs;
            const landmarks = results.faceLandmarks[0];
            
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            for (const lm of landmarks) {
                if (lm.x < minX) minX = lm.x;
                if (lm.x > maxX) maxX = lm.x;
                if (lm.y < minY) minY = lm.y;
                if (lm.y > maxY) maxY = lm.y;
            }
            
            const sizePx = Math.max((maxX - minX) * video.videoWidth, (maxY - minY) * video.videoHeight);
            const faceRatio = sizePx / Math.max(video.videoWidth, video.videoHeight);
            
            smoothedRatio = smoothedRatio * (1 - RATIO_SMOOTHING) + faceRatio * RATIO_SMOOTHING;
        }
    }
    
    let timeSinceFace = performance.now() - lastFaceDetectedTime;
    let targetAlpha = 0.0;
    
    if (timeSinceFace > 1000) {
        state = "NEAR";
        hasPhoto = false;
        smoothedRatio = THRESHOLD_RESET;
    } else {
        if (state === "NEAR") {
            if (smoothedRatio < THRESHOLD_CAPTURE) {
                capturePhoto();
                state = "TRANSITION";
            }
        } else if (state === "TRANSITION" || state === "FAR") {
            if (smoothedRatio > THRESHOLD_RESET) {
                state = "NEAR";
            } else {
                targetAlpha = (THRESHOLD_CAPTURE - Math.min(smoothedRatio, THRESHOLD_CAPTURE)) / (THRESHOLD_CAPTURE - THRESHOLD_FAR);
                targetAlpha = Math.max(0, Math.min(1, targetAlpha));
                
                if (targetAlpha === 1.0) state = "FAR";
                else state = "TRANSITION";
            }
        }
    }
    
    if (!hasPhoto) targetAlpha = 0.0;
    
    currentAlpha = currentAlpha * (1 - ALPHA_SMOOTHING) + targetAlpha * ALPHA_SMOOTHING;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = Math.max(0, 1.0 - currentAlpha);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    if (currentAlpha > 0.001) {
        ctx.globalAlpha = currentAlpha;
        ctx.drawImage(photoCanvas, 0, 0, canvas.width, canvas.height);
    }
    
    ctx.globalAlpha = 1.0;
    
    if (captureFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${captureFlash * 0.15})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        captureFlash -= 0.1;
    }
    
    if (isDebug) {
        dState.innerText = state;
        dRatio.innerText = smoothedRatio.toFixed(3);
        dAlpha.innerText = currentAlpha.toFixed(3);
    }
    
    requestAnimationFrame(predictWebcam);
}
