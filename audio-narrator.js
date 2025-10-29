/**
 * Audio Narrator Module
 * Handles voice narration using Web Speech API
 */

class AudioNarrator {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.voice = null;

        // Initialize voice on load
        this.initializeVoice();
    }

    /**
     * Initialize Korean voice
     */
    initializeVoice() {
        // Wait for voices to load
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.selectKoreanVoice();
            });
        } else {
            this.selectKoreanVoice();
        }
    }

    /**
     * Select Korean voice (prefer female voice if available)
     */
    selectKoreanVoice() {
        const voices = this.synthesis.getVoices();

        // Try to find Korean voice
        const koreanVoices = voices.filter(voice =>
            voice.lang.includes('ko') || voice.lang.includes('KR')
        );

        if (koreanVoices.length > 0) {
            // Prefer female voice
            const femaleVoice = koreanVoices.find(v =>
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('여성')
            );
            this.voice = femaleVoice || koreanVoices[0];
        } else {
            // Fallback to any available voice
            this.voice = voices[0];
        }

        console.log('Selected voice:', this.voice?.name || 'None');
    }

    /**
     * Speak text with optional callbacks
     * @param {string} text - Text to speak
     * @param {Object} options - Options
     * @returns {Promise<void>}
     */
    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            // Stop any current speech
            this.stop();

            // Create utterance
            this.currentUtterance = new SpeechSynthesisUtterance(text);

            // Set voice
            if (this.voice) {
                this.currentUtterance.voice = this.voice;
            }

            // Set language
            this.currentUtterance.lang = options.lang || 'ko-KR';

            // Set speech parameters
            this.currentUtterance.rate = options.rate || 0.9; // Slightly slower for clarity
            this.currentUtterance.pitch = options.pitch || 1.0;
            this.currentUtterance.volume = options.volume || 1.0;

            // Event handlers
            this.currentUtterance.onstart = () => {
                this.isPlaying = true;
                this.isPaused = false;
                if (options.onStart) options.onStart();
            };

            this.currentUtterance.onend = () => {
                this.isPlaying = false;
                this.isPaused = false;
                if (options.onEnd) options.onEnd();
                resolve();
            };

            this.currentUtterance.onerror = (event) => {
                console.error('Speech error:', event);
                this.isPlaying = false;
                this.isPaused = false;
                if (options.onError) options.onError(event);
                reject(event);
            };

            this.currentUtterance.onpause = () => {
                this.isPaused = true;
                if (options.onPause) options.onPause();
            };

            this.currentUtterance.onresume = () => {
                this.isPaused = false;
                if (options.onResume) options.onResume();
            };

            // Speak
            this.synthesis.speak(this.currentUtterance);
        });
    }

    /**
     * Pause current speech
     */
    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synthesis.pause();
        }
    }

    /**
     * Resume paused speech
     */
    resume() {
        if (this.isPlaying && this.isPaused) {
            this.synthesis.resume();
        }
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.isPlaying) {
            this.synthesis.cancel();
            this.isPlaying = false;
            this.isPaused = false;
        }
    }

    /**
     * Toggle play/pause
     */
    toggle() {
        if (this.isPaused) {
            this.resume();
        } else if (this.isPlaying) {
            this.pause();
        }
    }

    /**
     * Check if browser supports speech synthesis
     * @returns {boolean}
     */
    static isSupported() {
        return 'speechSynthesis' in window;
    }

    /**
     * Get available voices
     * @returns {SpeechSynthesisVoice[]}
     */
    getVoices() {
        return this.synthesis.getVoices();
    }

    /**
     * Get Korean voices only
     * @returns {SpeechSynthesisVoice[]}
     */
    getKoreanVoices() {
        return this.synthesis.getVoices().filter(voice =>
            voice.lang.includes('ko') || voice.lang.includes('KR')
        );
    }
}

// Export as global
window.AudioNarrator = AudioNarrator;
