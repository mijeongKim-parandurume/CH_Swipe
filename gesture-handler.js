/**
 * Gesture Handler - MediaPipe Hands Integration
 * Based on original mediapipe.js
 */

// ===== State Variables =====
let hands = null;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;
let detectedHands = [];
let gestureCallbacks = {
    onSwipe: null,
    onRotate: null,
    onZoom: null,
    onStatusUpdate: null,
    // Quiz gesture callbacks
    onQuizTap: null,
    onQuizPinch: null,
    onQuizSwipe: null,
    onQuizCircle: null,
    // Center description callback
    onVictory: null
};

// ===== Helper Functions =====
function distanceBetweenPoints(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

function detectGestures(landmarks) {
    const gestures = [];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5]; // Index finger base
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Calculate distances
    const indexDist = distanceBetweenPoints(indexTip, wrist);
    const middleDist = distanceBetweenPoints(middleTip, wrist);
    const ringDist = distanceBetweenPoints(ringTip, wrist);
    const pinkyDist = distanceBetweenPoints(pinkyTip, wrist);

    // Pointing (index finger extended, others folded) - relaxed conditions
    if (indexDist > 0.13 &&
        indexDist > middleDist + 0.03 &&
        indexDist > ringDist + 0.03 &&
        indexDist > pinkyDist + 0.03) {
        gestures.push('Pointing');
    }

    // Closed fist - all fingers close to wrist
    if (indexDist < 0.12 &&
        middleDist < 0.12 &&
        ringDist < 0.12 &&
        pinkyDist < 0.12) {
        gestures.push('Closed fist');
    }

    // Open hand - all fingers extended
    if (distanceBetweenPoints(thumbTip, wrist) > 0.1 &&
        indexDist > 0.15 &&
        middleDist > 0.15 &&
        ringDist > 0.15 &&
        pinkyDist > 0.15) {
        gestures.push('Open hand');
    }

    // Victory sign - index and middle extended, ring and pinky folded
    if (indexDist > 0.15 &&
        middleDist > 0.15 &&
        ringDist < 0.12 &&
        pinkyDist < 0.12) {
        gestures.push('Victory');
    }

    return gestures;
}

// ===== Drawing Functions =====
function drawHand(detectedHand) {
    if (!window.drawConnectors || !window.drawLandmarks) return;

    window.drawConnectors(canvasCtx, detectedHand.landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
    window.drawLandmarks(canvasCtx, detectedHand.landmarks, { color: '#FF0000', lineWidth: 2 });

    // Draw center point
    canvasCtx.beginPath();
    canvasCtx.arc(detectedHand.canvasX * canvasElement.width,
                  detectedHand.canvasY * canvasElement.height, 5, 0, 2 * Math.PI);
    canvasCtx.fillStyle = '#4a9eff';
    canvasCtx.fill();
    canvasCtx.closePath();
}

function drawHands(hands) {
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw video frame (no mirroring)
    if (videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    }

    // Draw hands (need to mirror hand landmarks for display)
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    for (let i = 0; i < hands.length; i++) {
        drawHand(hands[i]);
    }
    canvasCtx.restore();

    canvasCtx.restore();
}

// ===== MediaPipe Results Processing =====
function onResultsHands(results) {
    let currentlyDetectedHands = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const worldLandmarks = results.multiHandWorldLandmarks[i];

            // Calculate hand center
            let canvasX = 0;
            let canvasY = 0;
            landmarks.forEach(element => {
                canvasX += element.x;
                canvasY += element.y;
            });
            canvasX = canvasX / landmarks.length;
            canvasY = canvasY / landmarks.length;

            // Normalized coordinates
            let x = 1 - 2 * canvasX;
            let y = (1 - 2 * canvasY);

            const gestures = detectGestures(worldLandmarks);

            currentlyDetectedHands.push({
                landmarks,
                worldLandmarks,
                label: results.multiHandedness[i].label,
                x,
                y,
                canvasX,
                canvasY,
                gestures
            });
        }
    }

    // Update detected hands with previous positions
    if (currentlyDetectedHands.length === 0) {
        detectedHands = [];
    } else if (currentlyDetectedHands.length === 1) {
        let hand = currentlyDetectedHands[0];
        if (detectedHands.length === 0) {
            detectedHands.push({
                ...hand,
                prevX: hand.x,
                prevY: hand.y
            });
        } else if (detectedHands.length >= 1) {
            let closestIndex = 0;
            if (detectedHands.length > 1) {
                closestIndex = distanceBetweenPoints(hand, detectedHands[0]) <
                              distanceBetweenPoints(hand, detectedHands[1]) ? 0 : 1;
            }
            detectedHands = [{
                ...hand,
                prevX: detectedHands[closestIndex].x,
                prevY: detectedHands[closestIndex].y
            }];
        }
    } else if (currentlyDetectedHands.length === 2) {
        let hand1 = currentlyDetectedHands[0];
        let hand2 = currentlyDetectedHands[1];

        if (detectedHands.length === 0) {
            detectedHands.push({
                ...hand1,
                prevX: hand1.x,
                prevY: hand1.y
            });
            detectedHands.push({
                ...hand2,
                prevX: hand2.x,
                prevY: hand2.y
            });
        } else if (detectedHands.length === 1) {
            if (distanceBetweenPoints(hand1, detectedHands[0]) <
                distanceBetweenPoints(hand2, detectedHands[0])) {
                detectedHands[0] = {
                    ...hand1,
                    prevX: detectedHands[0].x,
                    prevY: detectedHands[0].y
                };
                detectedHands.push({
                    ...hand2,
                    prevX: hand2.x,
                    prevY: hand2.y
                });
            } else {
                detectedHands[0] = {
                    ...hand2,
                    prevX: detectedHands[0].x,
                    prevY: detectedHands[0].y
                };
                detectedHands.push({
                    ...hand1,
                    prevX: hand1.x,
                    prevY: hand1.y
                });
            }
        } else if (detectedHands.length === 2) {
            if (distanceBetweenPoints(hand1, detectedHands[0]) +
                distanceBetweenPoints(hand2, detectedHands[1]) <
                distanceBetweenPoints(hand2, detectedHands[0]) +
                distanceBetweenPoints(hand1, detectedHands[1])) {
                detectedHands[0] = {
                    ...hand1,
                    prevX: detectedHands[0].x,
                    prevY: detectedHands[0].y
                };
                detectedHands[1] = {
                    ...hand2,
                    prevX: detectedHands[1].x,
                    prevY: detectedHands[1].y
                };
            } else {
                detectedHands[0] = {
                    ...hand2,
                    prevX: detectedHands[0].x,
                    prevY: detectedHands[0].y
                };
                detectedHands[1] = {
                    ...hand1,
                    prevX: detectedHands[1].x,
                    prevY: detectedHands[1].y
                };
            }
        }
    }

    // Draw hands
    drawHands(detectedHands);

    // Process gestures
    processHandGestures(detectedHands);
}

// ===== Gesture Processing =====
// Track previous gestures for quiz detection
let prevHandGesture = null;
let gestureStartTime = 0;
let gestureHoldTime = 0;

function processHandGestures(hands) {
    let isSwipe = false;

    // Update status
    if (gestureCallbacks.onStatusUpdate) {
        if (hands.length > 0) {
            const gestures = hands.map(h => h.gestures.join(', ')).join(' | ');
            gestureCallbacks.onStatusUpdate(`손 감지됨: ${hands.length}개 - ${gestures}`);
        } else {
            gestureCallbacks.onStatusUpdate('손이 감지되지 않음');
        }
    }

    // Check if center description is visible
    const centerDescription = document.getElementById('center-description');
    const isCenterDescriptionVisible = centerDescription && !centerDescription.classList.contains('hidden');

    if (hands.length === 1) {
        const hand = hands[0];
        const currentGesture = hand.gestures[0]; // Primary gesture

        // Track gesture hold time for quiz tap detection
        if (currentGesture === prevHandGesture) {
            gestureHoldTime = Date.now() - gestureStartTime;
        } else {
            prevHandGesture = currentGesture;
            gestureStartTime = Date.now();
            gestureHoldTime = 0;
        }

        // === PRIORITY: Victory gesture for center description ===
        if (hand.gestures.includes('Victory') && gestureHoldTime > 500) {
            if (isCenterDescriptionVisible && gestureCallbacks.onVictory) {
                console.log('✌️ Hand gesture: Victory → Dismiss center description');
                gestureCallbacks.onVictory();
                gestureStartTime = Date.now(); // Reset to avoid repeat
                return; // Stop processing other gestures
            }
        }

        // If center description is visible, ignore all other gestures
        if (isCenterDescriptionVisible) {
            console.log('⚠️ Center description visible, ignoring other gestures');
            return;
        }

        // === QUIZ GESTURES ===

        // 1. Open hand → Pinch out (확대) for quiz
        if (hand.gestures.includes('Open hand') && gestureHoldTime > 500) {
            if (gestureCallbacks.onQuizPinch) {
                console.log('🖐️ Hand gesture: Open hand → Quiz Pinch OUT');
                gestureCallbacks.onQuizPinch({ type: 'pinch', direction: 'out', scale: 1.5 });
                gestureStartTime = Date.now(); // Reset to avoid repeat
            }
        }

        // 2. Closed fist → Tap for quiz
        if (hand.gestures.includes('Closed fist') && gestureHoldTime > 500) {
            if (gestureCallbacks.onQuizTap) {
                console.log('✊ Hand gesture: Closed fist → Quiz Tap');
                gestureCallbacks.onQuizTap({
                    type: 'tap',
                    x: hand.canvasX * window.innerWidth,
                    y: hand.canvasY * window.innerHeight
                });
                gestureStartTime = Date.now(); // Reset to avoid repeat
            }
        }

        // 3. Pointing gesture for swipe (both navigation and quiz)
        if (hand.gestures.includes('Pointing')) {
            // Invert direction: left-to-right = positive (next), right-to-left = negative (prev)
            const swipeDelta = (hand.prevX - hand.x) * 2;

            // For navigation
            if (gestureCallbacks.onSwipe) {
                gestureCallbacks.onSwipe(swipeDelta);
            }

            // For quiz (detect significant horizontal movement)
            const horizontalMovement = Math.abs(hand.x - hand.prevX);
            if (horizontalMovement > 0.05 && gestureCallbacks.onQuizSwipe) {
                const direction = (hand.x - hand.prevX) > 0 ? 'right' : 'left';
                console.log(`👆 Hand gesture: Pointing swipe ${direction} → Quiz Swipe`);
                gestureCallbacks.onQuizSwipe({
                    type: 'swipe-horizontal',
                    direction: direction,
                    distance: horizontalMovement * 1000,
                    deltaX: hand.x - hand.prevX,
                    deltaY: 0
                });
            }

            isSwipe = true;
        }

        // === NAVIGATION GESTURES (original) ===

        // Closed fist for rotation (only when not in quiz mode or already handled)
        if (hand.gestures.includes('Closed fist') && gestureHoldTime < 500) {
            if (gestureCallbacks.onRotate) {
                gestureCallbacks.onRotate(
                    (hand.prevY - hand.y) * 15, // Increased from 5 to 15 (3x more sensitive)
                    (hand.x - hand.prevX) * 15,  // Increased from 5 to 15 (3x more sensitive)
                    0
                );
            }
        }
    } else if (hands.length === 2) {
        const hand1 = hands[0];
        const hand2 = hands[1];

        // Two fists for zoom
        if (hand1.gestures.includes('Closed fist') &&
            hand2.gestures.includes('Closed fist') &&
            hand1.label !== hand2.label) {
            const distance = Math.sqrt(Math.pow(hand1.x - hand2.x, 2) +
                                      Math.pow(hand1.y - hand2.y, 2));
            const prevDistance = Math.sqrt(Math.pow(hand1.prevX - hand2.prevX, 2) +
                                          Math.pow(hand1.prevY - hand2.prevY, 2));

            if (gestureCallbacks.onZoom) {
                gestureCallbacks.onZoom(distance / prevDistance);
            }
        }
    }

    // Reset swipe if not swiping
    if (!isSwipe && gestureCallbacks.onSwipe) {
        gestureCallbacks.onSwipe(0);
    }
}

// ===== Public API =====
window.GestureHandler = {
    init: async function(callbacks) {
        gestureCallbacks = { ...gestureCallbacks, ...callbacks };

        // Get elements
        videoElement = document.getElementById('hand-video');
        canvasElement = document.getElementById('hand-canvas');

        if (!videoElement || !canvasElement) {
            console.error('Video or canvas element not found');
            return false;
        }

        canvasCtx = canvasElement.getContext('2d');

        // Wait for MediaPipe to load
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (typeof window.Hands !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });

        if (typeof window.Hands === 'undefined') {
            console.error('MediaPipe Hands not loaded');
            return false;
        }

        // Initialize MediaPipe Hands
        try {
            hands = new window.Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            hands.onResults(onResultsHands);

            console.log('GestureHandler initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing GestureHandler:', error);
            return false;
        }
    },

    startCamera: async function(deviceId = null) {
        if (!videoElement) return false;

        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = stream;

            // Process frames
            const processFrame = async () => {
                if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && hands) {
                    await hands.send({ image: videoElement });
                }
                requestAnimationFrame(processFrame);
            };
            processFrame();

            return true;
        } catch (error) {
            console.error('Error starting camera:', error);
            return false;
        }
    },

    stopCamera: function() {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        detectedHands = [];
    },

    getCameraList: async function() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting camera list:', error);
            return [];
        }
    }
};
