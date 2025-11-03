/**
 * Tutorial System
 * Step-by-step tutorial for hand gesture controls
 */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.completed = false;

        // Tutorial steps configuration
        this.steps = [
            {
                icon: '✋',
                title: '손 제스처 컨트롤',
                text: '손 제스처로 천문도를 탐험하세요',
                instruction: '오른쪽 위의 손 모양 버튼을 눌러 제스처 트래킹을 활성화하세요',
                checkComplete: () => window.isGestureEnabled === true
            },
            {
                icon: '✌️',
                title: 'Victory 제스처',
                text: '설명창을 닫으려면',
                instruction: '검지와 중지를 펴고 0.5초간 유지하세요 (Victory 제스처)',
                requiredGesture: 'Victory'
            },
            {
                icon: '☝️',
                title: '퀴즈 정답 선택',
                text: '퀴즈의 정답을 제스처로 선택합니다',
                instruction: '1번이 정답이면 검지만 펴고, 2번이 정답이면 검지와 중지를 펴세요',
                requiredGesture: 'One finger' // or 'Two fingers'
            },
            {
                icon: '✊',
                title: '모델 회전',
                text: '주먹을 쥐고 손을 움직이세요',
                instruction: '주먹을 쥔 상태로 손을 움직여 모델을 회전시킬 수 있습니다',
                requiredGesture: 'Closed fist'
            },
            {
                icon: '✊✊',
                title: '확대/축소',
                text: '양손으로 주먹을 쥐세요',
                instruction: '양손 주먹을 쥐고 거리를 조절하여 모델을 확대/축소할 수 있습니다',
                requiresTwoHands: true
            },
            {
                icon: '👍',
                title: '스와이프 이동',
                text: '엄지손가락으로 방향을 가리키세요',
                instruction: '나머지 손가락은 접고, 엄지로 오른쪽을 가리키면 다음 단계로 이동합니다',
                requiredGesture: 'Thumbs up'
            }
        ];

        // UI elements
        this.container = null;
        this.stepElement = null;
        this.iconElement = null;
        this.titleElement = null;
        this.textElement = null;
        this.instructionElement = null;

        // Gesture detection
        this.gestureCheckInterval = null;

        // Step 3 tracking (finger counting)
        this.step3_oneFingerDetected = false;
        this.step3_twoFingersDetected = false;

        // Gesture cooldown to prevent rapid progression
        this.isTransitioning = false;
        this.lastGestureTime = 0;
    }

    init() {
        // Get UI elements
        this.container = document.getElementById('tutorial-container');
        this.stepElement = document.getElementById('tutorial-step');
        this.iconElement = document.getElementById('tutorial-icon');
        this.titleElement = document.getElementById('tutorial-title');
        this.textElement = document.getElementById('tutorial-text');
        this.instructionElement = document.getElementById('tutorial-instruction');

        console.log('✅ Tutorial system initialized');
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;

        // Hide all other UI elements during tutorial
        const infoPanel = document.getElementById('info-panel');
        const quizContainer = document.getElementById('quiz-container');
        const progressBar = document.querySelector('.progress-bar');
        const seasonCTA = document.getElementById('season-cta');
        const canvas = document.getElementById('canvas');

        if (infoPanel) infoPanel.classList.add('hidden');
        if (quizContainer) quizContainer.classList.add('hidden');
        if (progressBar) progressBar.style.display = 'none';
        if (seasonCTA) seasonCTA.classList.add('hidden');
        if (canvas) canvas.style.display = 'none'; // Hide 3D canvas during tutorial

        this.showStep(0);
        this.startGestureDetection();
        console.log('🎓 Tutorial started');
    }

    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;

        // Reset transitioning flag for new step
        this.isTransitioning = false;

        // Reset step 3 tracking when entering step 3
        if (stepIndex === 2) {
            this.step3_oneFingerDetected = false;
            this.step3_twoFingersDetected = false;
        }

        // Update UI
        this.stepElement.textContent = `${stepIndex + 1}/${this.steps.length}`;
        this.iconElement.textContent = step.icon;
        this.titleElement.textContent = step.title;
        this.textElement.textContent = step.text;
        this.instructionElement.textContent = step.instruction;

        // Show container
        this.container.classList.remove('hidden');

        console.log(`📖 Tutorial step ${stepIndex + 1}: ${step.title}`);
    }

    nextStep() {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this.showStep(this.currentStep);
        } else {
            this.complete();
        }
    }

    complete() {
        this.isActive = false;
        this.completed = true;
        this.container.classList.add('hidden');
        this.stopGestureDetection();

        // Restore UI elements
        const infoPanel = document.getElementById('info-panel');
        const progressBar = document.querySelector('.progress-bar');
        const canvas = document.getElementById('canvas');

        if (infoPanel) infoPanel.classList.remove('hidden');
        if (progressBar) progressBar.style.display = '';
        if (canvas) canvas.style.display = ''; // Show 3D canvas after tutorial

        console.log('🎉 Tutorial completed!');

        // Trigger callback if exists
        if (this.onComplete) {
            this.onComplete();
        }
    }

    startGestureDetection() {
        // Check for step completion every 100ms
        this.gestureCheckInterval = setInterval(() => {
            this.checkStepComplete();
        }, 100);
    }

    stopGestureDetection() {
        if (this.gestureCheckInterval) {
            clearInterval(this.gestureCheckInterval);
            this.gestureCheckInterval = null;
        }
    }

    checkStepComplete() {
        if (!this.isActive) return;
        if (this.isTransitioning) return; // Don't check during transition

        const step = this.steps[this.currentStep];

        // Special check for step 0 (gesture tracking activation)
        if (step.checkComplete && step.checkComplete()) {
            this.isTransitioning = true; // Prevent multiple calls
            console.log('✅ Step completed:', step.title);
            setTimeout(() => this.nextStep(), 1000);
            return;
        }

        // Check for required gesture from MediaPipe
        if (step.requiredGesture) {
            // This will be called from gesture-handler.js via callback
        }

        // Check for two hands requirement
        if (step.requiresTwoHands) {
            // This will be called from gesture-handler.js via callback
        }
    }

    // Called from gesture-handler.js when gesture is detected
    onGestureDetected(gestureName, handCount = 1) {
        if (!this.isActive) return;
        if (this.isTransitioning) return; // Ignore gestures during transition

        const now = Date.now();
        const step = this.steps[this.currentStep];

        // Cooldown: ignore gestures within 500ms of last gesture
        if (now - this.lastGestureTime < 500) {
            return;
        }

        console.log(`🎓 Tutorial step ${this.currentStep + 1} received gesture: ${gestureName}`);

        // Step 2: Victory gesture ONLY (not Two fingers)
        if (this.currentStep === 1) {
            if (gestureName === 'Victory' && !this.isTransitioning) {
                this.isTransitioning = true;
                this.lastGestureTime = now;
                console.log('✅ Victory gesture detected!');
                setTimeout(() => this.nextStep(), 1000);
            }
            return;
        }

        // Special case for step 3 (finger counting) - require BOTH gestures
        // Accept One finger and Two fingers, but NOT Victory or Pointing
        if (this.currentStep === 2) {
            if (gestureName === 'One finger' && !this.step3_oneFingerDetected) {
                this.step3_oneFingerDetected = true;
                this.lastGestureTime = now;
                console.log('✅ One finger detected (1/2)');
                // Update instruction to guide user
                this.instructionElement.textContent = '좋습니다! 이제 검지와 중지를 함께 펴세요 (2번 답변)';
            } else if (gestureName === 'Two fingers' && !this.step3_twoFingersDetected) {
                this.step3_twoFingersDetected = true;
                this.lastGestureTime = now;
                console.log('✅ Two fingers detected (2/2)');
                // Update instruction to guide user if they haven't done 1 finger yet
                if (!this.step3_oneFingerDetected) {
                    this.instructionElement.textContent = '좋습니다! 이제 검지만 펴세요 (1번 답변)';
                }
            }

            // Both gestures detected? Move to next step
            if (this.step3_oneFingerDetected && this.step3_twoFingersDetected && !this.isTransitioning) {
                this.isTransitioning = true;
                console.log('🎉 Both finger counting gestures completed!');
                setTimeout(() => this.nextStep(), 1000);
            }
            return;
        }

        // Check if gesture matches requirement
        if (step.requiredGesture && gestureName === step.requiredGesture && !this.isTransitioning) {
            this.isTransitioning = true;
            this.lastGestureTime = now;
            console.log('✅ Correct gesture detected:', gestureName);
            setTimeout(() => this.nextStep(), 1000);
            return;
        }

        // Check for two hands
        if (step.requiresTwoHands && handCount === 2 && !this.isTransitioning) {
            this.isTransitioning = true;
            this.lastGestureTime = now;
            console.log('✅ Two hands detected');
            setTimeout(() => this.nextStep(), 1000);
            return;
        }
    }

    skip() {
        this.complete();
    }
}

// Export as global
window.TutorialSystem = TutorialSystem;
