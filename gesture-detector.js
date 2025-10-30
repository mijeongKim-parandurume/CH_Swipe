/**
 * Gesture Detector Module
 * Detects various touch gestures: pinch, swipe, circle, tap
 */

class GestureDetector {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            pinchThreshold: options.pinchThreshold || 1.2,
            swipeThreshold: options.swipeThreshold || 80,
            longSwipeThreshold: options.longSwipeThreshold || 150,
            tapCenterRadius: options.tapCenterRadius || 100,
            circleMinRadius: options.circleMinRadius || 50,
            circleAngleThreshold: options.circleAngleThreshold || 300, // degrees
            ...options
        };

        // Gesture tracking
        this.touches = [];
        this.touchPath = [];
        this.startDistance = 0;
        this.currentDistance = 0;
        this.gestureStartTime = 0;
        this.isTracking = false;

        // Callbacks
        this.onPinch = options.onPinch || null;
        this.onSwipe = options.onSwipe || null;
        this.onTap = options.onTap || null;
        this.onCircle = options.onCircle || null;

        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
    }

    handleTouchStart(e) {
        this.touches = Array.from(e.touches);
        this.touchPath = [];
        this.gestureStartTime = Date.now();
        this.isTracking = true;

        if (this.touches.length === 1) {
            // Single touch - track path for swipe/circle/tap
            const touch = this.touches[0];
            this.touchPath.push({
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            });
        } else if (this.touches.length === 2) {
            // Two touches - track for pinch
            this.startDistance = this.getDistance(this.touches[0], this.touches[1]);
            this.currentDistance = this.startDistance;
        }
    }

    handleTouchMove(e) {
        if (!this.isTracking) return;

        e.preventDefault();
        this.touches = Array.from(e.touches);

        if (this.touches.length === 1) {
            // Track path
            const touch = this.touches[0];
            this.touchPath.push({
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            });
        } else if (this.touches.length === 2) {
            // Update pinch distance
            this.currentDistance = this.getDistance(this.touches[0], this.touches[1]);
        }
    }

    handleTouchEnd(e) {
        if (!this.isTracking) return;

        const duration = Date.now() - this.gestureStartTime;

        if (this.touches.length === 1 && this.touchPath.length > 1) {
            // Analyze single touch gesture
            this.analyzeGesture(duration);
        } else if (this.touches.length === 2 && this.startDistance > 0) {
            // Check for pinch
            const scale = this.currentDistance / this.startDistance;
            if (Math.abs(scale - 1.0) > (this.options.pinchThreshold - 1.0)) {
                this.triggerPinch(scale);
            }
        }

        // Reset
        this.isTracking = false;
        this.touches = [];
        this.touchPath = [];
        this.startDistance = 0;
        this.currentDistance = 0;
    }

    analyzeGesture(duration) {
        if (this.touchPath.length < 2) return;

        const start = this.touchPath[0];
        const end = this.touchPath[this.touchPath.length - 1];

        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Check for tap (minimal movement)
        if (distance < 20 && duration < 300) {
            this.analyzeTap(start);
            return;
        }

        // Check for circle gesture
        if (this.touchPath.length > 10 && duration > 300) {
            const circleResult = this.detectCircle();
            if (circleResult) {
                this.triggerCircle(circleResult);
                return;
            }
        }

        // Check for swipe
        if (distance > this.options.swipeThreshold) {
            this.analyzeSwipe(deltaX, deltaY, distance);
        }
    }

    analyzeSwipe(deltaX, deltaY, distance) {
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        const isHorizontal = Math.abs(angle) < 45 || Math.abs(angle) > 135;
        const isLong = distance > this.options.longSwipeThreshold;

        if (isHorizontal) {
            if (this.onSwipe) {
                this.onSwipe({
                    type: isLong ? 'swipe-horizontal-long' : 'swipe-horizontal',
                    direction: deltaX > 0 ? 'right' : 'left',
                    distance: distance,
                    deltaX: deltaX,
                    deltaY: deltaY
                });
            }
        }
    }

    analyzeTap(point) {
        // Check if tap is in center
        const centerX = this.element.offsetWidth / 2;
        const centerY = this.element.offsetHeight / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(point.x - centerX, 2) +
            Math.pow(point.y - centerY, 2)
        );

        if (this.onTap) {
            this.onTap({
                type: distanceFromCenter < this.options.tapCenterRadius ? 'tap-center' : 'tap',
                x: point.x,
                y: point.y,
                distanceFromCenter: distanceFromCenter
            });
        }
    }

    detectCircle() {
        if (this.touchPath.length < 10) return null;

        // Calculate center point
        let sumX = 0, sumY = 0;
        for (const point of this.touchPath) {
            sumX += point.x;
            sumY += point.y;
        }
        const centerX = sumX / this.touchPath.length;
        const centerY = sumY / this.touchPath.length;

        // Calculate average radius
        let sumRadius = 0;
        for (const point of this.touchPath) {
            const radius = Math.sqrt(
                Math.pow(point.x - centerX, 2) +
                Math.pow(point.y - centerY, 2)
            );
            sumRadius += radius;
        }
        const avgRadius = sumRadius / this.touchPath.length;

        // Check if radius is sufficient
        if (avgRadius < this.options.circleMinRadius) {
            return null;
        }

        // Calculate total angle traversed
        let totalAngle = 0;
        for (let i = 1; i < this.touchPath.length; i++) {
            const prev = this.touchPath[i - 1];
            const curr = this.touchPath[i];

            const angle1 = Math.atan2(prev.y - centerY, prev.x - centerX);
            const angle2 = Math.atan2(curr.y - centerY, curr.x - centerX);

            let deltaAngle = angle2 - angle1;

            // Normalize angle to [-π, π]
            if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
            if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

            totalAngle += deltaAngle;
        }

        const totalDegrees = Math.abs(totalAngle) * 180 / Math.PI;

        // Check if we've made a circle (at least 300 degrees)
        if (totalDegrees > this.options.circleAngleThreshold) {
            return {
                direction: totalAngle > 0 ? 'counterclockwise' : 'clockwise',
                degrees: totalDegrees,
                radius: avgRadius
            };
        }

        return null;
    }

    triggerPinch(scale) {
        if (this.onPinch) {
            this.onPinch({
                type: 'pinch',
                scale: scale,
                direction: scale > 1.0 ? 'out' : 'in'
            });
        }
    }

    triggerCircle(circleResult) {
        if (this.onCircle) {
            this.onCircle({
                type: circleResult.direction === 'clockwise' ? 'circle-clockwise' : 'circle-counterclockwise',
                direction: circleResult.direction,
                degrees: circleResult.degrees,
                radius: circleResult.radius
            });
        }
    }

    getDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Destroy detector and remove event listeners
     */
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

// Export as global
window.GestureDetector = GestureDetector;
