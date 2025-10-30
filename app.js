/**
 * 천상열차분야지도 - Celestial Chart Interactive Experience
 * Main Application Module
 */

// ===== Three.js Imports =====
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ===== Configuration =====
let config = null;

// ===== Three.js Core =====
let scene, camera, renderer, canvas;
let orbitControls;

// ===== Layer Management =====
const layers = [];
let currentStage = 1;
let targetStage = 1;
let progress = 0;
let isAnimating = false;
let direction = 1;

// ===== Swipe Gesture =====
let touchStartX = 0;
let touchStartY = 0;
let swipeAccumulator = 0;
let lastTouchX = 0;
let velocity = 0;
const SWIPE_THRESHOLD = 50;
const INERTIA_DAMPING = 0.92;

// Gesture detection for quiz
let gestureStartTime = 0;
let initialTouchDistance = 0;
let currentTouchDistance = 0;
let maxPinchScale = 1.0;
let touchPath = [];
let isPinchDetected = false;

// ===== Animation =====
let animationStartTime = 0;
let animationDuration = 0;
let currentAnimation = null;

// ===== UI Elements =====
let loadingScreen, loadingProgress, loadingText;
let appContainer, infoPanel, panelToggle;
let panelTitle, panelDescription;
let progressFill, progressMarkers;
let controlsHint, seasonCTA;

// Hand Gesture UI
let gestureToggle, gestureContent, gestureStatusText, handPositionText;
let cameraSelect;
let isGestureEnabled = false;

// Hand gesture swipe accumulator
let handSwipeAccumulator = 0;

// Quiz System
let quizSystem = null;
let quizContainer, quizQuestion, quizHint, quizFeedback;
let quizSkip;

// Center Description System
let centerDescription, centerTitle, centerText, dismissBtn;
let isDescriptionDismissed = false;

// ===== Initialization =====
async function init() {
    try {
        // Load configuration
        const response = await fetch('config.json');
        config = await response.json();

        // Get UI elements
        initUIElements();

        // Initialize Three.js
        initThreeJS();

        // Load all GLB models
        await loadAllModels();

        // Initialize Quiz System
        initQuizSystem();

        // Setup event listeners
        setupEventListeners();

        // Hide loading screen, show app
        hideLoadingScreen();

        // Show first stage
        showStage(1);

        // Auto-hide controls hint after 5 seconds
        setTimeout(() => {
            controlsHint.classList.add('hidden');
        }, 5000);

    } catch (error) {
        console.error('Initialization error:', error);
        updateLoadingText('에러가 발생했습니다. 페이지를 새로고침해주세요.');
    }
}

// ===== UI Elements Initialization =====
function initUIElements() {
    loadingScreen = document.getElementById('loading-screen');
    loadingProgress = document.getElementById('loading-progress');
    loadingText = document.getElementById('loading-text');
    appContainer = document.getElementById('app-container');
    infoPanel = document.getElementById('info-panel');
    panelToggle = document.getElementById('panel-toggle');
    panelTitle = document.getElementById('panel-title');
    panelDescription = document.getElementById('panel-description');
    progressFill = document.getElementById('progress-fill');
    progressMarkers = document.querySelectorAll('.progress-marker');
    controlsHint = document.getElementById('controls-hint');
    seasonCTA = document.getElementById('season-cta');
    canvas = document.getElementById('canvas');

    // Hand gesture elements
    gestureToggle = document.getElementById('gesture-toggle');
    gestureContent = document.getElementById('gesture-content');
    gestureStatusText = document.getElementById('gesture-status-text');
    handPositionText = document.getElementById('hand-position-text');
    cameraSelect = document.getElementById('camera-select');

    // Quiz elements
    quizContainer = document.getElementById('quiz-container');
    quizQuestion = document.getElementById('quiz-question');
    quizHint = document.getElementById('quiz-hint');
    quizFeedback = document.getElementById('quiz-feedback');
    quizSkip = document.getElementById('quiz-skip');

    // Center description elements
    centerDescription = document.getElementById('center-description');
    centerTitle = document.getElementById('center-title');
    centerText = document.getElementById('center-text');
    dismissBtn = document.getElementById('dismiss-description');
}

// ===== Three.js Initialization =====
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(
        config.camera.fov,
        aspect,
        config.camera.near,
        config.camera.far
    );
    camera.position.set(...config.camera.initialPosition);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.performance.maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Orbit Controls
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.screenSpacePanning = false;
    orbitControls.minDistance = 2;
    orbitControls.maxDistance = 10;
    orbitControls.maxPolarAngle = Math.PI;

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point Light for depth
    const pointLight = new THREE.PointLight(0x4a9eff, 0.5, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Start render loop
    animate();
}

// ===== Model Loading =====
async function loadAllModels() {
    const loader = new GLTFLoader();
    const totalModels = config.layers.length;

    for (let i = 0; i < totalModels; i++) {
        const layerConfig = config.layers[i];
        updateLoadingText(`레이어 ${i + 1}/${totalModels} 로딩 중: ${layerConfig.name}`);
        updateLoadingProgress((i / totalModels) * 100);

        try {
            const gltf = await loadModel(loader, layerConfig.file);

            const layerObject = gltf.scene;
            layerObject.visible = false;
            layerObject.userData.config = layerConfig;
            layerObject.userData.animationProgress = 0;
            layerObject.userData.opacity = 0;

            // Rotate all models: X-axis 270 degrees, Z-axis 180 degrees
            layerObject.rotation.set(3 * Math.PI / 2, 0, Math.PI); // X: 270°, Y: 0°, Z: 180°
            layerObject.position.set(0, 0, 0);
            layerObject.scale.set(2.0, 2.0, 2.0); // 2.0x scale

            // Apply initial material settings and reset child transforms
            layerObject.traverse((child) => {
                // Reset position for ALL children (keep rotation and scale as is)
                if (child !== layerObject) {
                    child.position.set(0, 0, 0);
                    // Don't reset child rotation or scale - let parent transforms apply
                }

                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0;

                    // Ensure materials are properly configured
                    if (child.material.map) {
                        child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    }
                }
            });

            scene.add(layerObject);
            layers.push(layerObject);

        } catch (error) {
            console.error(`Error loading ${layerConfig.name}:`, error);
        }
    }

    updateLoadingProgress(100);
    updateLoadingText('로딩 완료!');
}

function loadModel(loader, url) {
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (gltf) => resolve(gltf),
            (xhr) => {
                // Progress callback (optional)
            },
            (error) => reject(error)
        );
    });
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Panel toggle
    panelToggle.addEventListener('click', togglePanel);

    // Progress markers click
    progressMarkers.forEach((marker, index) => {
        marker.addEventListener('click', () => {
            goToStage(index + 1);
        });
    });

    // Swipe gestures
    setupSwipeGestures();

    // Keyboard navigation
    setupKeyboardControls();

    // Accessibility controls
    setupAccessibilityControls();

    // Hand gesture controls
    setupHandGestureControls();

    // Season CTA button
    document.getElementById('season-button').addEventListener('click', () => {
        window.location.href = 'https://starmap.paranduru.me/';
    });

    // Quiz buttons
    setupQuizEventListeners();

    // Center description dismiss button
    dismissBtn.addEventListener('click', dismissDescription);
}

// ===== Center Description Functions =====
function showCenterDescription(layerConfig) {
    // Update center description content
    centerTitle.textContent = layerConfig.title;
    centerText.textContent = layerConfig.description;

    // Show center description
    centerDescription.classList.remove('hidden');

    // Close right panel
    infoPanel.classList.add('closed');
}

function dismissDescription() {
    isDescriptionDismissed = true;

    // Hide center description
    centerDescription.classList.add('hidden');

    // Update right panel with description content
    panelTitle.textContent = centerTitle.textContent;
    panelDescription.textContent = centerText.textContent;

    // Open right panel if closed
    if (infoPanel.classList.contains('closed')) {
        infoPanel.classList.remove('closed');
    }

    // Show quiz container
    showQuizForCurrentStage();
}

function showQuizForCurrentStage() {
    const layerIndex = currentStage - 1;
    const layerConfig = config.layers[layerIndex];

    if (quizSystem && layerConfig.quiz) {
        console.log(`🎯 Starting quiz for stage ${currentStage}...`);
        quizSystem.startQuiz(currentStage);
        console.log(`✅ Quiz started. isQuizActive: ${quizSystem.isQuizActive}`);
    } else {
        console.log(`⚠️ No quiz system or quiz config for stage ${currentStage}`);
    }
}

// ===== Quiz System Initialization =====
function initQuizSystem() {
    console.log('🎮 Initializing Quiz System...');

    if (!window.QuizSystem) {
        console.error('❌ QuizSystem not loaded! Check if quiz-system.js is loaded correctly.');
        return;
    }

    console.log('✅ QuizSystem class found');

    quizSystem = new QuizSystem(config, {
        maxAttempts: 3,
        onQuizComplete: handleQuizComplete,
        onQuizStart: handleQuizStart
    });

    console.log('✅ QuizSystem instance created');

    quizSystem.init({
        quizContainer: quizContainer,
        questionElement: quizQuestion,
        hintElement: quizHint,
        feedbackElement: quizFeedback,
        canvasElement: canvas
    });

    console.log('✅ QuizSystem initialized with UI elements:', {
        quizContainer: !!quizContainer,
        questionElement: !!quizQuestion,
        hintElement: !!quizHint,
        feedbackElement: !!quizFeedback,
        canvasElement: !!canvas
    });
}

// ===== Quiz Event Listeners =====
function setupQuizEventListeners() {
    if (!quizSkip) return;

    // Skip button
    quizSkip.addEventListener('click', () => {
        if (quizSystem) {
            quizSystem.skipQuiz();
        }
    });
}

// ===== Quiz Callbacks =====
function handleQuizStart(stage) {
    console.log(`Quiz started for stage ${stage}`);
    // Quiz system will handle blocking navigation
}

function handleQuizComplete(stage, isCorrect) {
    console.log(`Quiz completed for stage ${stage}, correct: ${isCorrect}`);

    // Show completion effect for final stage
    if (stage === 6 && isCorrect) {
        const feedback = new FeedbackEffects();
        feedback.showCompletionEffect(canvas);
    }

    // Allow user to explore before moving to next stage
    // User can manually swipe to next stage
}

// ===== Swipe Gesture Setup =====
function setupSwipeGestures() {
    console.log('🎮 Setting up touch event listeners on canvas...');

    // Touch events only (no mouse swipe to avoid conflict with OrbitControls)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    console.log('✅ Touch event listeners registered:', {
        canvas: canvas,
        canvasId: canvas.id,
        hasListeners: true
    });

    // Mouse is dedicated to OrbitControls only (rotation, zoom)
    // No mouse swipe functionality
}

function handleTouchStart(e) {
    gestureStartTime = Date.now();
    touchPath = [];
    isPinchDetected = false;
    maxPinchScale = 1.0;

    console.log('👆 Touch START:', {
        touches: e.touches.length,
        quizActive: quizSystem?.isQuizActive,
        currentStage: currentStage
    });

    // If quiz is active, disable OrbitControls immediately for ALL touches
    if (quizSystem?.isQuizActive && orbitControls && orbitControls.enabled) {
        orbitControls.enabled = false;
        console.log('🚫 OrbitControls disabled for quiz (touchstart)');
        e.preventDefault(); // Prevent default to ensure we capture the event
    }

    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = e.touches[0].clientX;
        velocity = 0;

        // Record touch path for circle detection
        touchPath.push({
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        });

        console.log('👆 Single touch at:', e.touches[0].clientX.toFixed(0), e.touches[0].clientY.toFixed(0));
    } else if (e.touches.length === 2) {
        // Two finger gesture - for pinch detection
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
        currentTouchDistance = initialTouchDistance;
        console.log('🖐️ Two finger touch started, initial distance:', initialTouchDistance);
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        // Always record touch path (for quiz gesture detection)
        touchPath.push({
            x: touchX,
            y: touchY,
            time: Date.now()
        });

        const deltaX = touchX - lastTouchX;
        const deltaY = Math.abs(touchY - touchStartY);

        // If quiz is active, prevent all default behavior and don't navigate
        if (quizSystem?.isQuizActive) {
            e.preventDefault(); // Prevent scrolling and other default behaviors
            return; // Just record path, don't navigate
        }

        // Only handle horizontal swipes for stage navigation (not quiz)
        if (Math.abs(deltaX) > deltaY) {
            e.preventDefault();
            velocity = deltaX;
            lastTouchX = touchX;

            swipeAccumulator += deltaX;
            updateSwipeProgress();
        }
    } else if (e.touches.length === 2) {
        // Two finger gesture - track pinch
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        currentTouchDistance = Math.sqrt(dx * dx + dy * dy);

        if (initialTouchDistance > 0) {
            const scale = currentTouchDistance / initialTouchDistance;
            maxPinchScale = Math.max(maxPinchScale, scale);

            console.log('📏 Pinch scale:', scale.toFixed(2), 'max:', maxPinchScale.toFixed(2));

            // If quiz is active and pinch out detected
            if (quizSystem?.isQuizActive && scale > 1.2 && !isPinchDetected) {
                isPinchDetected = true;
                console.log('✅ Pinch OUT detected during move! Scale:', scale);
                quizSystem.handlePinch({ type: 'pinch', scale: scale, direction: 'out' });
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
}

function handleTouchEnd(e) {
    const gestureDuration = Date.now() - gestureStartTime;

    console.log('🏁 Touch ended:', {
        duration: gestureDuration,
        touchPathLength: touchPath.length,
        quizActive: quizSystem?.isQuizActive,
        remainingTouches: e.touches.length
    });

    // Re-enable OrbitControls if it was disabled
    if (orbitControls && !orbitControls.enabled) {
        orbitControls.enabled = true;
        console.log('✅ OrbitControls re-enabled');
    }

    // If quiz is active, analyze gesture and pass to quiz system
    if (quizSystem && quizSystem.isQuizActive) {
        console.log('🎯 Quiz is active, analyzing gesture...');

        // Prevent default behavior
        e.preventDefault();
        e.stopPropagation();

        // If pinch was already detected in touchmove, don't analyze again
        if (!isPinchDetected) {
            analyzeGestureForQuiz(e, gestureDuration);
        } else {
            console.log('✅ Pinch already detected, skipping analysis');
        }

        // Reset gesture tracking
        initialTouchDistance = 0;
        currentTouchDistance = 0;
        maxPinchScale = 1.0;
        isPinchDetected = false;
        touchPath = [];
        return;
    }

    // Otherwise, handle normal stage navigation
    applySwipeInertia();
}

function analyzeGestureForQuiz(e, duration) {
    console.log('🔍 Analyzing gesture for quiz...', {
        touchPathLength: touchPath.length,
        duration: duration,
        initialDistance: initialTouchDistance,
        maxPinchScale: maxPinchScale.toFixed(2)
    });

    // Check for pinch gesture using max scale recorded
    if (initialTouchDistance > 0 && maxPinchScale > 1.2) {
        console.log('✅ Pinch detected in touchend! Max scale:', maxPinchScale);
        quizSystem.handlePinch({ type: 'pinch', scale: maxPinchScale, direction: 'out' });
        return;
    }

    // Log if pinch was attempted but didn't reach threshold
    if (initialTouchDistance > 0) {
        console.log('⚠️ Pinch detected but scale too small:', maxPinchScale.toFixed(2), '(need > 1.2)');
    }

    // Check for tap - ULTRA permissive for debugging
    if (touchPath.length === 0) {
        console.log('⚠️ No touch path recorded!');
        // Even with no path, trigger a tap at default position
        quizSystem.handleTap({
            type: 'tap',
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            distanceFromCenter: 0
        });
        return;
    }

    const start = touchPath[0];
    const end = touchPath[touchPath.length - 1];
    const distance = Math.sqrt(
        Math.pow(end.x - start.x, 2) +
        Math.pow(end.y - start.y, 2)
    );

    console.log('📊 Touch stats:', {
        pathLength: touchPath.length,
        duration: duration,
        distance: distance.toFixed(1)
    });

    // ULTRA PERMISSIVE: Accept ANY single touch as a tap for now
    // This is for debugging - we'll tighten it later
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distFromCenter = Math.sqrt(
        Math.pow(start.x - centerX, 2) +
        Math.pow(start.y - centerY, 2)
    );

    console.log('✅ TAP DETECTED (ultra permissive mode):', distFromCenter < 100 ? 'tap-center' : 'tap', 'at', start.x.toFixed(0), start.y.toFixed(0));
    quizSystem.handleTap({
        type: distFromCenter < 100 ? 'tap-center' : 'tap',
        x: start.x,
        y: start.y,
        distanceFromCenter: distFromCenter
    });
    return;

    // OLD CODE - commented out for debugging
    // Check for tap (minimal movement OR short duration)
    /*
    if (distance < 50 || duration < 300) {
        // Check if tap is in center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const distFromCenter = Math.sqrt(
            Math.pow(start.x - centerX, 2) +
            Math.pow(start.y - centerY, 2)
        );

        console.log('✅ Tap detected:', distFromCenter < 100 ? 'tap-center' : 'tap', 'at', start.x.toFixed(0), start.y.toFixed(0));
        quizSystem.handleTap({
            type: distFromCenter < 100 ? 'tap-center' : 'tap',
            x: start.x,
            y: start.y,
            distanceFromCenter: distFromCenter
        });
        return;
    } else {
        console.log('🤷 Touch moved too much for tap:', distance.toFixed(1), 'px, duration:', duration, 'ms');
    }
    */

    // Check for circle gesture
    if (touchPath.length > 15 && duration > 300) {
        const circleResult = detectCircleGesture();
        if (circleResult) {
            console.log('Circle detected:', circleResult.direction);
            quizSystem.handleCircle({
                type: circleResult.direction === 'clockwise' ? 'circle-clockwise' : 'circle-counterclockwise',
                direction: circleResult.direction,
                degrees: circleResult.degrees
            });
            return;
        }
    }

    // Check for swipe
    if (touchPath.length >= 2) {
        const start = touchPath[0];
        const end = touchPath[touchPath.length - 1];
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        console.log('Swipe analysis:', { deltaX, deltaY, distance });

        if (distance > 80) {
            const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            const isLong = distance > 150;

            if (isHorizontal) {
                const gestureType = isLong ? 'swipe-horizontal-long' : 'swipe-horizontal';
                console.log('Swipe detected:', gestureType);
                quizSystem.handleSwipe({
                    type: gestureType,
                    direction: deltaX > 0 ? 'right' : 'left',
                    distance: distance,
                    deltaX: deltaX,
                    deltaY: deltaY
                });
            }
        }
    }
}

function detectCircleGesture() {
    if (touchPath.length < 15) return null;

    // Calculate center point
    let sumX = 0, sumY = 0;
    for (const point of touchPath) {
        sumX += point.x;
        sumY += point.y;
    }
    const centerX = sumX / touchPath.length;
    const centerY = sumY / touchPath.length;

    // Calculate total angle traversed
    let totalAngle = 0;
    for (let i = 1; i < touchPath.length; i++) {
        const prev = touchPath[i - 1];
        const curr = touchPath[i];

        const angle1 = Math.atan2(prev.y - centerY, prev.x - centerX);
        const angle2 = Math.atan2(curr.y - centerY, curr.x - centerX);

        let deltaAngle = angle2 - angle1;

        // Normalize angle
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        totalAngle += deltaAngle;
    }

    const totalDegrees = Math.abs(totalAngle) * 180 / Math.PI;

    // Check if we've made a circle (at least 270 degrees)
    if (totalDegrees > 270) {
        return {
            direction: totalAngle > 0 ? 'counterclockwise' : 'clockwise',
            degrees: totalDegrees
        };
    }

    return null;
}

function updateSwipeProgress() {
    // Map swipe distance to progress
    const normalizedSwipe = swipeAccumulator / SWIPE_THRESHOLD;

    // Check if trying to swipe right from stage 6
    if (currentStage === 6 && normalizedSwipe > 0.5) {
        // Show season CTA if not already shown
        if (seasonCTA.classList.contains('hidden')) {
            seasonCTA.classList.remove('hidden');
            swipeAccumulator = 0;
            velocity = 0;
            return;
        } else {
            // CTA already shown, navigate to seasons page on additional right swipe
            if (normalizedSwipe > 1.0) {
                window.location.href = 'https://starmap.paranduru.me/';
                return;
            }
        }
        swipeAccumulator = 0;
        velocity = 0;
        return;
    }

    // Determine target stage
    const newTargetStage = Math.max(1, Math.min(6, currentStage + Math.round(normalizedSwipe)));

    if (newTargetStage !== targetStage && !isAnimating) {
        targetStage = newTargetStage;
        direction = targetStage > currentStage ? 1 : -1;

        // Hide CTA if going back from stage 6
        if (direction < 0 && currentStage === 6) {
            seasonCTA.classList.add('hidden');
        }
    }
}

function applySwipeInertia() {
    // Apply inertia effect
    const inertiaInterval = setInterval(() => {
        velocity *= INERTIA_DAMPING;
        swipeAccumulator += velocity;

        updateSwipeProgress();

        if (Math.abs(velocity) < 0.5) {
            clearInterval(inertiaInterval);
            commitStageChange();
        }
    }, 16);
}

function commitStageChange() {
    if (targetStage !== currentStage) {
        goToStage(targetStage);
    }
    swipeAccumulator = 0;
    velocity = 0;
}

// ===== Keyboard Controls =====
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (currentStage > 1) {
                    goToStage(currentStage - 1);
                    // Hide season CTA if going back
                    seasonCTA.classList.add('hidden');
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentStage < 6) {
                    goToStage(currentStage + 1);
                } else if (currentStage === 6) {
                    // Already at stage 6, show season CTA
                    seasonCTA.classList.remove('hidden');
                }
                break;
        }
    });
}

// ===== Accessibility Controls =====
function setupAccessibilityControls() {
    document.getElementById('font-size-increase').addEventListener('click', () => {
        document.body.classList.remove('font-size-small');
        document.body.classList.add('font-size-large');
    });

    document.getElementById('font-size-decrease').addEventListener('click', () => {
        document.body.classList.remove('font-size-large');
        document.body.classList.add('font-size-small');
    });
}

// ===== Hand Gesture Controls =====
async function setupHandGestureControls() {
    let gestureInitialized = false;
    const gesturePanel = document.getElementById('hand-gesture-panel');

    // Toggle gesture activation (not panel visibility)
    gestureToggle.addEventListener('click', async () => {
        // If gesture is already enabled, disable it
        if (isGestureEnabled) {
            window.GestureHandler.stopCamera();
            isGestureEnabled = false;
            gestureToggle.classList.remove('active');
            gestureContent.classList.add('hidden');
            gestureStatusText.textContent = '제스처가 비활성화되었습니다';
            return;
        }

        // Initialize on first activation
        if (!gestureInitialized) {
            gestureContent.classList.remove('hidden');
            gestureStatusText.textContent = '초기화 중...';

            try {
                // Initialize hand gesture with callbacks
                const initialized = await window.GestureHandler.init({
                    onSwipe: handleGestureSwipe,
                    onRotate: handleGestureRotate,
                    onZoom: handleGestureZoom,
                    onStatusUpdate: (status) => {
                        gestureStatusText.textContent = status;
                    },
                    // Quiz gesture callbacks
                    onQuizTap: handleHandGestureTap,
                    onQuizPinch: handleHandGesturePinch,
                    onQuizSwipe: handleHandGestureSwipe,
                    onQuizCircle: handleHandGestureCircle
                });

                if (!initialized) {
                    gestureStatusText.textContent = 'Error: MediaPipe 라이브러리 로딩 실패';
                    return;
                }

                gestureInitialized = true;

                // Populate camera list
                const cameras = await window.GestureHandler.getCameraList();
                if (cameras.length === 0) {
                    gestureStatusText.textContent = 'Error: 카메라를 찾을 수 없습니다';
                    return;
                }

                cameras.forEach((camera, index) => {
                    const option = document.createElement('option');
                    option.value = camera.deviceId;
                    option.textContent = camera.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });

                // Camera selection change
                cameraSelect.addEventListener('change', async () => {
                    if (isGestureEnabled) {
                        window.GestureHandler.stopCamera();
                        const success = await window.GestureHandler.startCamera(cameraSelect.value);
                        if (success) {
                            gestureStatusText.textContent = '손 제스처 활성화됨';
                            isGestureEnabled = true;
                        } else {
                            gestureStatusText.textContent = 'Error: 카메라 시작 실패';
                            isGestureEnabled = false;
                        }
                    }
                });

                // Auto-start with first camera
                const success = await window.GestureHandler.startCamera(cameras[0].deviceId);
                if (success) {
                    gestureStatusText.textContent = '손 제스처 활성화됨';
                    isGestureEnabled = true;
                    gestureToggle.classList.add('active');

                    // Hide panel after 3 seconds
                    setTimeout(() => {
                        gestureContent.classList.add('hidden');
                    }, 3000);
                } else {
                    gestureStatusText.textContent = 'Error: 카메라 시작 실패';
                }
            } catch (error) {
                console.error('Hand gesture setup error:', error);
                gestureStatusText.textContent = 'Error: ' + error.message;
            }
        } else {
            // Gesture already initialized, just start camera
            const success = await window.GestureHandler.startCamera(cameraSelect.value);
            if (success) {
                gestureStatusText.textContent = '손 제스처 활성화됨';
                isGestureEnabled = true;
                gestureToggle.classList.add('active');
                gestureContent.classList.remove('hidden');

                // Hide panel after 3 seconds
                setTimeout(() => {
                    gestureContent.classList.add('hidden');
                }, 3000);
            }
        }
    });

    // Show panel on hover when gesture is active
    gesturePanel.addEventListener('mouseenter', () => {
        if (isGestureEnabled) {
            gestureContent.classList.remove('hidden');
        }
    });

    // Hide panel on mouse leave when gesture is active
    gesturePanel.addEventListener('mouseleave', () => {
        if (isGestureEnabled) {
            gestureContent.classList.add('hidden');
        }
    });
}

// ===== Hand Gesture Callbacks =====
function handleGestureSwipe(deltaX) {
    // Apply decay when no active swipe
    if (deltaX === 0) {
        handSwipeAccumulator *= 0.9;
        if (Math.abs(handSwipeAccumulator) < 1) {
            handSwipeAccumulator = 0;
        }
        return;
    }

    // Accumulate swipe movement
    handSwipeAccumulator += deltaX * 100;

    // Check threshold for stage change
    if (Math.abs(handSwipeAccumulator) > SWIPE_THRESHOLD) {
        if (handSwipeAccumulator > 0) {
            // Swipe right -> next stage
            if (currentStage < 6 && !isAnimating) {
                goToStage(currentStage + 1);
                handSwipeAccumulator = 0; // Reset after successful stage change
            } else if (currentStage === 6) {
                // At stage 6, check if CTA is already shown
                if (seasonCTA.classList.contains('hidden')) {
                    // First right swipe: show CTA
                    seasonCTA.classList.remove('hidden');
                    handSwipeAccumulator = 0; // Reset after showing CTA
                } else {
                    // CTA already shown, second right swipe: navigate to seasons page
                    window.location.href = 'https://starmap.paranduru.me/';
                }
            }
        } else {
            // Swipe left -> previous stage
            if (currentStage > 1 && !isAnimating) {
                goToStage(currentStage - 1);
                seasonCTA.classList.add('hidden');
                handSwipeAccumulator = 0; // Reset after successful stage change
            }
        }
    }
}

function handleGestureRotate(deltaX, deltaY, deltaZ) {
    if (!orbitControls) return;

    // Temporarily disable OrbitControls
    orbitControls.enabled = false;

    // Apply rotation to camera with increased sensitivity
    const rotationSpeed = 0.05; // Increased from 0.01 to 0.05 (5x more sensitive)
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaY * rotationSpeed);
    camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaX * rotationSpeed);
    camera.lookAt(scene.position);

    // Re-enable OrbitControls after a short delay
    setTimeout(() => {
        if (orbitControls) {
            orbitControls.enabled = true;
        }
    }, 100);
}

function handleGestureZoom(scale) {
    if (!orbitControls) return;

    // Apply zoom
    const zoomFactor = 1 / scale;
    const newPosition = camera.position.clone().multiplyScalar(zoomFactor);

    // Clamp to min/max distance
    const distance = newPosition.length();
    if (distance >= orbitControls.minDistance && distance <= orbitControls.maxDistance) {
        camera.position.copy(newPosition);
    }
}

// ===== Hand Gesture Quiz Handlers =====
function handleHandGestureTap(gesture) {
    // Only process if quiz is active
    if (!quizSystem || !quizSystem.isQuizActive) {
        return;
    }

    console.log('✊ Hand gesture TAP received for quiz:', gesture);
    quizSystem.handleTap(gesture);
}

function handleHandGesturePinch(gesture) {
    // Only process if quiz is active
    if (!quizSystem || !quizSystem.isQuizActive) {
        return;
    }

    console.log('🖐️ Hand gesture PINCH received for quiz:', gesture);
    quizSystem.handlePinch(gesture);
}

function handleHandGestureSwipe(gesture) {
    // Only process if quiz is active
    if (!quizSystem || !quizSystem.isQuizActive) {
        return;
    }

    console.log('👆 Hand gesture SWIPE received for quiz:', gesture);
    quizSystem.handleSwipe(gesture);
}

function handleHandGestureCircle(gesture) {
    // Only process if quiz is active
    if (!quizSystem || !quizSystem.isQuizActive) {
        return;
    }

    console.log('⭕ Hand gesture CIRCLE received for quiz:', gesture);
    quizSystem.handleCircle(gesture);
}

// ===== Stage Navigation =====
function goToStage(stage) {
    if (stage === currentStage || isAnimating) return;

    // Block stage navigation if quiz is active
    if (quizSystem && quizSystem.isQuizActive) {
        console.log('Cannot change stage: Quiz is active');
        return;
    }

    direction = stage > currentStage ? 1 : -1;
    targetStage = stage;

    if (direction > 0) {
        // Moving forward - animate new layer in
        showStage(stage);
    } else {
        // Moving backward - reverse animate recent layer out
        hideStage(currentStage);
        currentStage = stage;
        updateUI();
    }
}

function showStage(stage) {
    console.log(`🎬 Showing stage ${stage}...`);

    isAnimating = true;
    currentStage = stage;

    const layerIndex = stage - 1;
    const layer = layers[layerIndex];
    const layerConfig = config.layers[layerIndex];

    layer.visible = true;

    // Start animation
    animationStartTime = Date.now();
    animationDuration = layerConfig.duration;
    currentAnimation = {
        layer,
        type: layerConfig.animationType,
        stage
    };

    // Update UI
    updateUI();

    // Reset description dismissed state
    isDescriptionDismissed = false;

    // Hide quiz container
    quizContainer.classList.add('hidden');

    // Show center description after animation delay
    setTimeout(() => {
        showCenterDescription(layerConfig);
    }, config.animation.panelDelay);
}

function hideStage(stage) {
    const layerIndex = stage - 1;
    const layer = layers[layerIndex];
    const layerConfig = config.layers[layerIndex];

    isAnimating = true;
    animationStartTime = Date.now();
    animationDuration = layerConfig.duration;
    currentAnimation = {
        layer,
        type: layerConfig.animationType,
        stage,
        reverse: true
    };
}

// ===== Animation Loop =====
function animate() {
    requestAnimationFrame(animate);

    // Update orbit controls
    orbitControls.update();

    // Update current animation
    if (currentAnimation) {
        updateLayerAnimation();
    }

    // Render scene
    renderer.render(scene, camera);
}

function updateLayerAnimation() {
    const elapsed = Date.now() - animationStartTime;
    const rawProgress = Math.min(elapsed / animationDuration, 1.0);
    const easedProgress = easeOutCubic(rawProgress);

    const { layer, type, reverse, stage } = currentAnimation;
    const targetOpacity = reverse ? 0 : 1;
    const startOpacity = reverse ? 1 : 0;

    const currentOpacity = startOpacity + (targetOpacity - startOpacity) * easedProgress;

    // Apply animation based on type
    switch (type) {
        case 'fadeIn':
            animateFadeIn(layer, easedProgress);
            break;
        case 'strokeDrawing':
            animateStrokeDrawing(layer, easedProgress);
            break;
        case 'radialExpand':
            animateRadialExpand(layer, easedProgress);
            break;
        case 'circularStroke':
            animateCircularStroke(layer, easedProgress);
            break;
        case 'galaxyReveal':
            animateGalaxyReveal(layer, easedProgress);
            break;
    }

    // Apply opacity to all meshes
    layer.traverse((child) => {
        if (child.isMesh) {
            child.material.opacity = currentOpacity;
        }
    });

    // Check if animation is complete
    if (rawProgress >= 1.0) {
        finishAnimation(layer, reverse, stage);
    }
}

function finishAnimation(layer, reverse, stage) {
    if (reverse) {
        // Set to ghost opacity when reversing
        layer.traverse((child) => {
            if (child.isMesh) {
                child.material.opacity = config.opacity.ghost;
            }
        });
    } else {
        // Apply opacity decay to previous layers
        applyOpacityDecay(stage);

        // Don't auto-show season CTA - wait for user to press right arrow again
    }

    currentAnimation = null;
    isAnimating = false;
}

function applyOpacityDecay(currentStage) {
    layers.forEach((layer, index) => {
        const stage = index + 1;
        let targetOpacity;

        if (stage === currentStage) {
            targetOpacity = config.opacity.current;
        } else if (stage < currentStage) {
            targetOpacity = config.opacity.previous;
        } else {
            targetOpacity = 0;
        }

        layer.traverse((child) => {
            if (child.isMesh && layer.visible) {
                child.material.opacity = targetOpacity;
            }
        });
    });
}

// ===== Animation Types =====
function animateFadeIn(layer, progress) {
    // Simple fade in with optional sparkle effect
    // Just use opacity, no scale animation to keep geometry consistent
    layer.traverse((child) => {
        if (child.isMesh) {
            child.material.opacity = progress;
        }
    });
}

function animateStrokeDrawing(layer, progress) {
    // Stroke drawing effect for constellation lines
    layer.traverse((child) => {
        if (child.isMesh && child.geometry) {
            // Use morph targets or custom shader for line drawing
            // For simplicity, using opacity-based reveal
            const threshold = progress;
            child.visible = Math.random() < threshold;
        }
    });
}

function animateRadialExpand(layer, progress) {
    // Radial expansion from center - using opacity instead of scale
    layer.traverse((child) => {
        if (child.isMesh) {
            child.material.opacity = progress;
        }
    });
}

function animateCircularStroke(layer, progress) {
    // Circular stroke drawing (0 to 360 degrees)
    // Simple opacity-based reveal without rotation
    layer.traverse((child) => {
        if (child.isMesh) {
            // Gradually reveal the circle
            child.material.opacity = progress;
        }
    });
}

function animateGalaxyReveal(layer, progress) {
    // Galaxy reveal with noise fade
    layer.traverse((child) => {
        if (child.isMesh) {
            // Apply gradient reveal using opacity only
            child.material.opacity = progress;
        }
    });
}

// ===== UI Updates =====
function updateUI() {
    // Update progress bar
    const progressPercent = ((currentStage - 1) / 5) * 100;
    progressFill.style.width = `${progressPercent}%`;

    // Update progress markers
    progressMarkers.forEach((marker, index) => {
        const stage = index + 1;
        marker.classList.remove('active', 'completed');

        if (stage === currentStage) {
            marker.classList.add('active');
        } else if (stage < currentStage) {
            marker.classList.add('completed');
        }
    });
}

function showPanel(layerConfig) {
    panelTitle.textContent = layerConfig.title;
    panelDescription.textContent = layerConfig.description;

    // Open panel if closed
    infoPanel.classList.remove('closed');
}

function togglePanel() {
    infoPanel.classList.toggle('closed');
}

// ===== Utility Functions =====
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function updateLoadingProgress(percent) {
    loadingProgress.style.width = `${percent}%`;
}

function updateLoadingText(text) {
    loadingText.textContent = text;
}

function hideLoadingScreen() {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    }, 500);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== Start Application =====
init();
