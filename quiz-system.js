/**
 * Quiz System Module
 * Manages interactive quiz for each stage
 */

class QuizSystem {
    constructor(config, options = {}) {
        this.config = config;
        this.options = options;

        // Modules
        this.narrator = new AudioNarrator();
        this.feedback = new FeedbackEffects();
        this.gestureDetector = null;

        // State
        this.currentStage = null;
        this.currentQuiz = null;
        this.isQuizActive = false;
        this.isQuizCompleted = {};
        this.attemptCount = 0;
        this.maxAttempts = options.maxAttempts || 3;

        // UI elements
        this.quizContainer = null;
        this.questionElement = null;
        this.hintElement = null;
        this.feedbackElement = null;

        // Callbacks
        this.onQuizComplete = options.onQuizComplete || null;
        this.onQuizStart = options.onQuizStart || null;
    }

    /**
     * Initialize quiz system with UI elements
     * @param {Object} elements - UI element references
     */
    init(elements) {
        this.quizContainer = elements.quizContainer;
        this.questionElement = elements.questionElement;
        this.hintElement = elements.hintElement;
        this.feedbackElement = elements.feedbackElement;
        this.canvasElement = elements.canvasElement;

        // Note: Gesture detection is handled by app.js
        // which calls handlePinch, handleSwipe, handleTap, handleCircle directly
    }

    /**
     * Start quiz for a stage
     * @param {number} stage - Stage number (1-6)
     */
    startQuiz(stage) {
        console.log(`🎯 QuizSystem.startQuiz() called for stage ${stage}`);

        const layerConfig = this.config.layers[stage - 1];
        if (!layerConfig || !layerConfig.quiz) {
            console.warn(`⚠️ No quiz config for stage ${stage}`);
            return;
        }

        console.log('📋 Quiz config:', layerConfig.quiz);

        this.currentStage = stage;
        this.currentQuiz = layerConfig.quiz;
        this.isQuizActive = true;
        this.attemptCount = 0;

        console.log(`✅ Quiz state set: isQuizActive=${this.isQuizActive}, gestureType=${this.currentQuiz.gestureType}`);

        // Show quiz UI
        this.showQuizUI();

        // Play narration
        this.playNarration();

        // Callback
        if (this.onQuizStart) {
            this.onQuizStart(stage);
        }

        console.log('🎯 Quiz UI shown and ready for gestures');
    }

    /**
     * Show quiz UI
     */
    showQuizUI() {
        if (!this.quizContainer) return;

        this.quizContainer.classList.remove('hidden');
        this.questionElement.textContent = this.currentQuiz.question;
        this.hintElement.textContent = this.currentQuiz.gestureHint;
        this.feedbackElement.textContent = '';
        this.feedbackElement.className = 'quiz-feedback';
    }

    /**
     * Hide quiz UI
     */
    hideQuizUI() {
        if (!this.quizContainer) return;
        this.quizContainer.classList.add('hidden');
    }

    /**
     * Play narration for current quiz
     */
    async playNarration() {
        if (!this.currentQuiz) return;

        try {
            await this.narrator.speak(this.currentQuiz.narration, {
                rate: 0.9,
                pitch: 1.0
            });
        } catch (error) {
            console.error('Narration error:', error);
        }
    }

    /**
     * Check if gesture matches expected type
     * @param {string} gestureType
     * @returns {boolean}
     */
    checkGesture(gestureType) {
        console.log('🔍 QuizSystem.checkGesture():', {
            gestureType: gestureType,
            isQuizActive: this.isQuizActive,
            hasCurrentQuiz: !!this.currentQuiz,
            expectedType: this.currentQuiz?.gestureType
        });

        if (!this.isQuizActive || !this.currentQuiz) {
            console.log('⚠️ Quiz not active or no current quiz');
            return false;
        }

        const expectedType = this.currentQuiz.gestureType;
        const isCorrect = this.matchGesture(gestureType, expectedType);

        console.log(`${isCorrect ? '✅' : '❌'} Gesture match result:`, {
            detected: gestureType,
            expected: expectedType,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }

        return isCorrect;
    }

    /**
     * Match gesture against expected type
     * @param {string} detected - Detected gesture type
     * @param {string} expected - Expected gesture type
     * @returns {boolean}
     */
    matchGesture(detected, expected) {
        // Exact match
        if (detected === expected) return true;

        // Special cases
        switch (expected) {
            case 'pinch':
                return detected === 'pinch';
            case 'tap':
                // Accept any tap (center or not)
                return detected === 'tap' || detected === 'tap-center';
            case 'tap-center':
                return detected === 'tap-center';
            case 'swipe-horizontal':
                return detected === 'swipe-horizontal' || detected === 'swipe-horizontal-long';
            case 'swipe-horizontal-long':
                return detected === 'swipe-horizontal-long';
            case 'circle-clockwise':
                return detected === 'circle-clockwise';
            case 'circle-counterclockwise':
                return detected === 'circle-counterclockwise';
            default:
                return false;
        }
    }

    /**
     * Handle correct answer
     */
    async handleCorrectAnswer() {
        this.isQuizActive = false;
        this.isQuizCompleted[this.currentStage] = true;

        // Show feedback
        this.showFeedback(this.currentQuiz.correctFeedback, 'correct');

        // Play feedback effects
        await this.feedback.correct(this.canvasElement);

        // Speak feedback
        await this.narrator.speak(this.currentQuiz.correctFeedback);

        // Hide quiz UI after delay
        setTimeout(() => {
            this.hideQuizUI();

            // Callback
            if (this.onQuizComplete) {
                this.onQuizComplete(this.currentStage, true);
            }
        }, 2000);
    }

    /**
     * Handle wrong answer
     */
    async handleWrongAnswer() {
        this.attemptCount++;

        // Show feedback
        this.showFeedback(this.currentQuiz.wrongFeedback, 'wrong');

        // Play feedback effects (visual + sound)
        await this.feedback.wrong(this.canvasElement);

        // NO voice feedback for wrong answers - just visual/audio beep
        // User requested to remove repetitive wrong answer voice
    }

    /**
     * Show feedback message
     * @param {string} message
     * @param {string} type - 'correct' or 'wrong'
     */
    showFeedback(message, type) {
        if (!this.feedbackElement) return;

        this.feedbackElement.textContent = message;
        this.feedbackElement.className = `quiz-feedback ${type}`;

        // Auto-hide after 3 seconds (except for correct)
        if (type === 'wrong') {
            setTimeout(() => {
                this.feedbackElement.textContent = '';
                this.feedbackElement.className = 'quiz-feedback';
            }, 3000);
        }
    }

    /**
     * Handle pinch gesture
     * @param {Object} gesture
     */
    handlePinch(gesture) {
        if (gesture.direction === 'out') {
            // Pinch out detected
            this.checkGesture('pinch');
        }
    }

    /**
     * Handle swipe gesture
     * @param {Object} gesture
     */
    handleSwipe(gesture) {
        this.checkGesture(gesture.type);
    }

    /**
     * Handle tap gesture
     * @param {Object} gesture
     */
    handleTap(gesture) {
        console.log('👆 QuizSystem.handleTap() called:', {
            gestureType: gesture.type,
            x: gesture.x,
            y: gesture.y,
            isQuizActive: this.isQuizActive,
            expectedGesture: this.currentQuiz?.gestureType
        });

        this.checkGesture(gesture.type);
    }

    /**
     * Handle circle gesture
     * @param {Object} gesture
     */
    handleCircle(gesture) {
        this.checkGesture(gesture.type);
    }

    /**
     * Check if stage quiz is completed
     * @param {number} stage
     * @returns {boolean}
     */
    isStageCompleted(stage) {
        return this.isQuizCompleted[stage] === true;
    }

    /**
     * Skip current quiz (for debugging or accessibility)
     */
    skipQuiz() {
        if (this.isQuizActive) {
            this.isQuizActive = false;
            this.isQuizCompleted[this.currentStage] = true;
            this.hideQuizUI();

            if (this.onQuizComplete) {
                this.onQuizComplete(this.currentStage, false);
            }
        }
    }

    /**
     * Toggle narration play/pause
     */
    toggleNarration() {
        this.narrator.toggle();
    }

    /**
     * Stop narration
     */
    stopNarration() {
        this.narrator.stop();
    }

    /**
     * Clean up
     */
    destroy() {
        this.stopNarration();
        // Note: Gesture detection is handled by app.js, no cleanup needed
    }
}

// Export as global
window.QuizSystem = QuizSystem;
