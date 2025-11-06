// ===== Intro Animation Script =====

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIntro);
    } else {
        initIntro();
    }

    function initIntro() {
        const introScreen = document.getElementById('intro-screen');
        const canvas = document.getElementById('intro-starfield');
        const button = document.getElementById('intro-start-button');
        const lines = document.querySelectorAll('.intro-line');

        if (!introScreen || !canvas || !button || lines.length === 0) {
            console.error('Intro elements not found');
            return;
        }

        // Initialize starfield animation
        initStarfield(canvas);

        // Start text animation
        animateText(lines, button);

        // Button click handler
        button.addEventListener('click', function() {
            introScreen.classList.add('hidden');

            // Start loading the main app after intro fades out
            setTimeout(() => {
                // Remove intro from DOM to free up resources
                introScreen.remove();
            }, 1000);
        });
    }

    // ===== Starfield Animation =====
    function initStarfield(canvas) {
        const ctx = canvas.getContext('2d');

        // Set canvas size
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Star particles
        const stars = [];
        const starCount = 150;

        class Star {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
                this.opacity = Math.random();
                // Assign color once during construction
                const colorRandom = Math.random();
                if (colorRandom > 0.7) {
                    this.color = { r: 74, g: 158, b: 255, alpha: 0.7 }; // Blue
                } else if (colorRandom > 0.4) {
                    this.color = { r: 180, g: 210, b: 255, alpha: 0.6 }; // Light blue
                } else {
                    this.color = { r: 255, g: 255, b: 255, alpha: 0.5 }; // White
                }
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedY = Math.random() * 0.3 + 0.1;
                this.opacity = Math.random();
                this.fadeSpeed = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
            }

            update() {
                this.y += this.speedY;
                this.opacity += this.fadeSpeed;

                if (this.opacity <= 0 || this.opacity >= 1) {
                    this.fadeSpeed *= -1;
                }

                if (this.y > canvas.height) {
                    this.y = 0;
                    this.x = Math.random() * canvas.width;
                }
            }

            draw() {
                ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * this.color.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Initialize stars
        for (let i = 0; i < starCount; i++) {
            stars.push(new Star());
        }

        // Animation loop
        function animateStars() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            stars.forEach(star => {
                star.update();
                star.draw();
            });

            requestAnimationFrame(animateStars);
        }
        animateStars();
    }

    // ===== Text Animation =====
    function animateText(lines, button) {
        // Timing configuration
        const FADE_IN = 1000;      // 1s
        const VISIBLE = 2000;      // 2s
        const FADE_OUT = 500;      // 0.5s
        const CYCLE = FADE_IN + VISIBLE + FADE_OUT;

        function animateLine(element, delay) {
            setTimeout(() => {
                // Fade in
                element.style.transition = `opacity ${FADE_IN}ms ease-in`;
                element.style.opacity = '1';

                // Fade out
                setTimeout(() => {
                    element.style.transition = `opacity ${FADE_OUT}ms ease-out`;
                    element.style.opacity = '0';
                }, FADE_IN + VISIBLE);
            }, delay);
        }

        // Animate all lines sequentially
        lines.forEach((line, index) => {
            animateLine(line, index * CYCLE);
        });

        // Show button after all lines are done
        const totalDuration = lines.length * CYCLE + 500;
        setTimeout(() => {
            button.style.transition = 'opacity 1s ease-in';
            button.classList.add('visible');
        }, totalDuration);
    }

})();
