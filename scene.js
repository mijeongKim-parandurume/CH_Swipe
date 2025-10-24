var xrCamera;
var isMiddleMouseDown = false;
var lastMouseX, lastMouseY;
var eduScene;
var eyeDistance = 0.2;
var headTrackingEnabled = true;
var cameraZScale = 1;
var cameraXScale = 1;

function loadScene() {
    // Create the scene
    var scene = new THREE.Scene();

    // Create a renderer and attach it to our document
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create a new DesktopXRCamera object
    xrCamera = new THREE.DesktopXRCamera(renderer);
    var matrixScreen = new THREE.Matrix4();
    matrixScreen.scale(new THREE.Vector3(1, 1, 1));

    // Resize event. Called each time the webgl canvas is being resized.
    function resize() {
        xrCamera.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', resize);
    resize();

    // Create a new Pong object
    eduScene = new EduScene(scene);

    // Mouse event listeners for rotating matrixScreen
    document.addEventListener('mousedown', function (event) {
        if (event.button === 1) { // Middle mouse button
            isMiddleMouseDown = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        }
    });
    document.addEventListener('mouseup', function (event) {
        if (event.button === 1) { // Middle mouse button
            isMiddleMouseDown = false;
        }
    });
    document.addEventListener('mousemove', function (event) {
        if (isMiddleMouseDown) {
            var deltaX = event.clientX - lastMouseX;
            var deltaY = event.clientY - lastMouseY;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            var rotationMatrixX = new THREE.Matrix4().makeRotationX(deltaY * 0.01);
            var rotationMatrixY = new THREE.Matrix4().makeRotationY(deltaX * 0.01);

            matrixScreen.multiply(rotationMatrixX);
            matrixScreen.multiply(rotationMatrixY);
        }
    });

    // Create a function to animate our scene
    function animate() {
        requestAnimationFrame(animate);
        eduScene.update();
        xrCamera.render(scene, matrixScreen);
    }

    // Run the animation function for the first time to kick things off
    animate();
}