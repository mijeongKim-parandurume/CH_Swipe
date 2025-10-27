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
}

// ===== Swipe Gesture Setup =====
function setupSwipeGestures() {
    // Touch events only (no mouse swipe to avoid conflict with OrbitControls)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Mouse is dedicated to OrbitControls only (rotation, zoom)
    // No mouse swipe functionality
}

function handleTouchStart(e) {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = e.touches[0].clientX;
        velocity = 0;
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchX - lastTouchX;
        const deltaY = Math.abs(touchY - touchStartY);

        // Only handle horizontal swipes
        if (Math.abs(deltaX) > deltaY) {
            e.preventDefault();
            velocity = deltaX;
            lastTouchX = touchX;

            swipeAccumulator += deltaX;
            updateSwipeProgress();
        }
    }
}

function handleTouchEnd(e) {
    applySwipeInertia();
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
                    }
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

// ===== Stage Navigation =====
function goToStage(stage) {
    if (stage === currentStage || isAnimating) return;

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

    // Show panel after animation delay
    setTimeout(() => {
        showPanel(layerConfig);
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
