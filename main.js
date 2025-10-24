
document.addEventListener('DOMContentLoaded', function () {
    // Populate the dropdown with stereo modes
    const stereoModeDropdown = document.getElementById('stereoMode');
    StereoModes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.id;
        option.textContent = mode.name;
        stereoModeDropdown.appendChild(option);
    });

    // Add event listener to the dropdown to change the stereo mode
    stereoModeDropdown.addEventListener('change', function (event) {
        const selectedMode = parseInt(event.target.value, 10);
        if (xrCamera) {
            xrCamera.stereoMode(selectedMode);
        }
    });

    // Set eye distance
    var eyeDistanceInput = document.getElementById('eyeDistance');
    eyeDistanceInput.addEventListener('input', function (event) {
        eyeDistance = parseFloat(event.target.value);
    });

    // Set head tracking enabled
    var headTrackingCheckbox = document.getElementById('headTracking');
    headTrackingCheckbox.addEventListener('change', function (event) {
        headTrackingEnabled = event.target.checked;
    });

    // Set camera Z scale
    var cameraFovInput = document.getElementById('cameraZScale');
    cameraFovInput.addEventListener('input', function (event) {
        cameraZScale = parseFloat(event.target.value);
    });

    // Set camera X scale
    var cameraXScaleInput = document.getElementById('cameraXScale');
    cameraXScaleInput.addEventListener('input', function (event) {
        cameraXScale = parseFloat(event.target.value);
    });

    navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');
        const cameraDropdown = document.getElementById('cameras');
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${cameraDropdown.length + 1}`;
            cameraDropdown.appendChild(option);
        });
        if (videoDevices.length > 0) {
            startCamera();
        }
        cameraDropdown.addEventListener('change', startCamera);
    });


    const videoElement = document.getElementById('video');
    loadMediapipe((onCameraUpdate)=>{
        function tick() {
            requestAnimationFrame(tick);

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                onCameraUpdate(videoElement);
            }
        }
        requestAnimationFrame(tick);
    });
    loadScene();
});



let cameraStream = null;
function startCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    const videoElement = document.getElementById('video');
    let deviceId = document.getElementById('cameras').value;
    console.log(deviceId);
    var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    getUserMedia.call(navigator, { video: { deviceId } }, function (stream) {
        videoElement.srcObject = stream;
        cameraStream = stream;
    }, function (err) {
        console.log(err);
    });
}