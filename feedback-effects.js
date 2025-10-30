/**
 * Feedback Effects Module
 * Handles visual and audio feedback for correct/wrong answers
 */

class FeedbackEffects {
    constructor(options = {}) {
        this.audioContext = null;
        this.options = {
            correctColor: options.correctColor || '#4CAF50',
            wrongColor: options.wrongColor || '#f44336',
            ...options
        };

        // Initialize audio context (will be created on first interaction due to browser policies)
        this.initAudioContext();
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Ensure audio context is running (resume if suspended)
     */
    async ensureAudioContext() {
        if (!this.audioContext) {
            this.initAudioContext();
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play correct answer feedback
     * @param {HTMLElement} targetElement - Element to apply visual effect
     */
    async correct(targetElement) {
        await this.ensureAudioContext();

        // Play correct sound
        this.playCorrectSound();

        // Visual feedback
        this.showCorrectVisual(targetElement);
    }

    /**
     * Play wrong answer feedback
     * @param {HTMLElement} targetElement - Element to apply visual effect
     */
    async wrong(targetElement) {
        await this.ensureAudioContext();

        // Play wrong sound
        this.playWrongSound();

        // Visual feedback
        this.showWrongVisual(targetElement);
    }

    /**
     * Play correct answer sound (pleasant "ding")
     */
    playCorrectSound() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Create oscillator for harmonious tone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Pleasant C major chord (C5 + E5 + G5)
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.type = 'sine';

        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);

        // Add E5
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(this.audioContext.destination);
        osc2.frequency.setValueAtTime(659.25, now); // E5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.start(now);
        osc2.stop(now + 0.5);
    }

    /**
     * Play wrong answer sound (gentle buzz)
     */
    playWrongSound() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Low frequency buzz
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.type = 'sawtooth';

        // Short envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    /**
     * Show correct answer visual effect
     * @param {HTMLElement} targetElement
     */
    showCorrectVisual(targetElement) {
        // Create particle effect
        this.createParticles(targetElement, this.options.correctColor, '✨');

        // Flash effect
        this.flashElement(targetElement, this.options.correctColor);
    }

    /**
     * Show wrong answer visual effect
     * @param {HTMLElement} targetElement
     */
    showWrongVisual(targetElement) {
        // Shake effect
        this.shakeElement(targetElement);

        // Flash effect
        this.flashElement(targetElement, this.options.wrongColor, 0.3);
    }

    /**
     * Create particle effects
     * @param {HTMLElement} targetElement
     * @param {string} color
     * @param {string} symbol
     */
    createParticles(targetElement, color, symbol = '●') {
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const particleCount = 12;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.textContent = symbol;
            particle.style.position = 'fixed';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.color = color;
            particle.style.fontSize = '24px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10000';
            particle.style.transition = 'all 0.8s ease-out';

            document.body.appendChild(particle);

            // Animate particle
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            requestAnimationFrame(() => {
                particle.style.transform = `translate(${tx}px, ${ty}px)`;
                particle.style.opacity = '0';
            });

            // Remove after animation
            setTimeout(() => {
                document.body.removeChild(particle);
            }, 800);
        }
    }

    /**
     * Flash element with color
     * @param {HTMLElement} element
     * @param {string} color
     * @param {number} opacity
     */
    flashElement(element, color, opacity = 0.5) {
        const originalBg = element.style.backgroundColor;
        const originalTransition = element.style.transition;

        element.style.transition = 'background-color 0.1s';
        element.style.backgroundColor = this.hexToRgba(color, opacity);

        setTimeout(() => {
            element.style.backgroundColor = originalBg;
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, 300);
        }, 200);
    }

    /**
     * Shake element animation
     * @param {HTMLElement} element
     */
    shakeElement(element) {
        const originalTransform = element.style.transform;

        const keyframes = [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ];

        const animation = element.animate(keyframes, {
            duration: 400,
            easing: 'ease-in-out'
        });

        animation.onfinish = () => {
            element.style.transform = originalTransform;
        };
    }

    /**
     * Show completion effect (for final stage)
     * @param {HTMLElement} targetElement
     */
    showCompletionEffect(targetElement) {
        // Create radial light burst
        const burst = document.createElement('div');
        burst.style.position = 'fixed';
        burst.style.top = '50%';
        burst.style.left = '50%';
        burst.style.width = '10px';
        burst.style.height = '10px';
        burst.style.borderRadius = '50%';
        burst.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(74,158,255,0.5) 50%, rgba(74,158,255,0) 100%)';
        burst.style.transform = 'translate(-50%, -50%)';
        burst.style.pointerEvents = 'none';
        burst.style.zIndex = '10000';
        burst.style.transition = 'all 1.5s ease-out';

        document.body.appendChild(burst);

        requestAnimationFrame(() => {
            burst.style.width = '800px';
            burst.style.height = '800px';
            burst.style.opacity = '0';
        });

        setTimeout(() => {
            document.body.removeChild(burst);
        }, 1500);

        // Play completion sound
        this.playCompletionSound();
    }

    /**
     * Play completion sound (triumphant)
     */
    playCompletionSound() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Play ascending chord progression
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.setValueAtTime(freq, now + index * 0.15);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, now + index * 0.15);
            gain.gain.linearRampToValueAtTime(0.2, now + index * 0.15 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.5);

            osc.start(now + index * 0.15);
            osc.stop(now + index * 0.15 + 0.5);
        });
    }

    /**
     * Convert hex color to rgba
     * @param {string} hex
     * @param {number} alpha
     * @returns {string}
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// Export as global
window.FeedbackEffects = FeedbackEffects;
