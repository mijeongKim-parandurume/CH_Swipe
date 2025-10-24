function loadMediapipe(setOnCameraUpdate) {
    //const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('output');
    const canvasCtx = canvasElement.getContext('2d');
    const gesturesElement = document.getElementById('gestures');
    const hand3dElement = document.getElementById('hand3d');
    const head3dElement = document.getElementById('head3d');


    function distanceBetweenPoints(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    }

    function detectGestures(landmarks) {
        const gestures = [];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // Pinch gesture
        if (distanceBetweenPoints(thumbTip, indexTip) < 0.05) {
            gestures.push('Pinch');
        }

        // Open hand
        if (distanceBetweenPoints(thumbTip, wrist) > 0.1 &&
            distanceBetweenPoints(indexTip, wrist) > 0.15 &&
            distanceBetweenPoints(middleTip, wrist) > 0.15 &&
            distanceBetweenPoints(ringTip, wrist) > 0.15 &&
            distanceBetweenPoints(pinkyTip, wrist) > 0.15) {
            gestures.push('Open hand');
        }

        /*// Closed fist
        if (distanceBetweenPoints(thumbTip, wrist) < 0.1 &&
            distanceBetweenPoints(indexTip, wrist) < 0.1 &&
            distanceBetweenPoints(middleTip, wrist) < 0.1 &&
            distanceBetweenPoints(ringTip, wrist) < 0.1 &&
            distanceBetweenPoints(pinkyTip, wrist) < 0.1) {
            gestures.push('Closed fist');
        }*/
        //Closed fist
        if (distanceBetweenPoints(indexTip, wrist) < 0.1 &&
            distanceBetweenPoints(middleTip, wrist) < 0.1 &&
            distanceBetweenPoints(ringTip, wrist) < 0.1 &&
            distanceBetweenPoints(pinkyTip, wrist) < 0.1) {
            gestures.push('Closed fist');
        }

        // Pointing (index finger extended)
        if (distanceBetweenPoints(indexTip, wrist) > 0.15 &&
            distanceBetweenPoints(middleTip, wrist) < 0.1 &&
            distanceBetweenPoints(ringTip, wrist) < 0.1 &&
            distanceBetweenPoints(pinkyTip, wrist) < 0.1) {
            gestures.push('Pointing');
        }

        // Victory sign
        if (distanceBetweenPoints(indexTip, wrist) > 0.15 &&
            distanceBetweenPoints(middleTip, wrist) > 0.15 &&
            distanceBetweenPoints(ringTip, wrist) < 0.1 &&
            distanceBetweenPoints(pinkyTip, wrist) < 0.1) {
            gestures.push('Victory');
        }



        return gestures;
    }

    let drawHeadFunction;
    let handX = 0;
    let handY = 0;
    let handPrevX = 0;
    let handPrevY = 0;

    let detectedHands = [];

    function drawHand(detectedHand) {
        drawConnectors(canvasCtx, detectedHand.landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
        drawLandmarks(canvasCtx, detectedHand.landmarks, { color: '#FF0000', lineWidth: 2 });

        canvasCtx.beginPath();
        canvasCtx.arc(detectedHand.canvasX * 640, detectedHand.canvasY * 480, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'blue';
        canvasCtx.fill();
        canvasCtx.closePath();


        hand3dElement.textContent = `Hand 3D world coordinates: 
        X: ${detectedHand.x.toFixed(4)} 
        Y: ${detectedHand.y.toFixed(4)}`;

        gesturesElement.textContent = `Detected gestures: ${detectedHand.gestures.join(', ') || 'None'}`;
    }

    function drawHands(detectedHands) {
        for (let i = 0; i < detectedHands.length; i++) {
            drawHand(detectedHands[i]);
        }
        if (detectedHands.length ===0) {
            gesturesElement.textContent = 'No hand detected';
            hand3dElement.textContent = 'No hand detected';
        }
    }

    function processHandsInteraction(detectedHands) {
        
        let isSwipe = false;        
        

        //console.log(detectedHands.length);
        

        if (detectedHands.length === 1) {
            const hand = detectedHands[0];
            if (hand.gestures.includes('Pointing')) {
                eduScene.processSwipe(true, (hand.x - hand.prevX) * 2);
                isSwipe = true;
            }
            if (hand.gestures.includes('Closed fist')) {
                eduScene.rotateActiveObject((hand.prevY - hand.y) * 5, (hand.x - hand.prevX) * 5, 0);
            }
        } else if (detectedHands.length === 2) {
            const hand1 = detectedHands[0];
            const hand2 = detectedHands[1];
            if (hand1.gestures.includes('Closed fist') && 
                hand2.gestures.includes('Closed fist')&&
                hand1.label !== hand2.label
            ){
                const distance = Math.sqrt(Math.pow(hand1.x - hand2.x, 2) + Math.pow(hand1.y - hand2.y, 2));
                const prevDistance = Math.sqrt(Math.pow(hand1.prevX - hand2.prevX, 2) + Math.pow(hand1.prevY - hand2.prevY, 2));
                eduScene.scaleActiveObject(distance / prevDistance);
                eduScene.moveActiveObject((hand1.x + hand2.x) / 2 - (hand1.prevX + hand2.prevX) / 2,
                    (hand1.y + hand2.y) / 2 - (hand1.prevY + hand2.prevY) / 2, 0);              
            }
        }
        
        if (!isSwipe) eduScene.processSwipe(false, 0);
    }

    function onResultsHands(results) {
        let currentlyDetectedHands = [];

        if (results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0) {

            for (let i = 0; i < results.multiHandLandmarks.length; i++) {

                const landmarks = results.multiHandLandmarks[i];
                const worldLandmarks = results.multiHandWorldLandmarks[i];

                let canvasX = 0;
                let canvasY = 0;

                landmarks.forEach(element => {
                    canvasX += element.x;
                    canvasY += element.y;
                });
                canvasX = canvasX / landmarks.length;
                canvasY = canvasY / landmarks.length;
                let x = 1 - 2 * canvasX;
                let y = (1 - 2 * canvasY) * 480 / 640;

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

        if (currentlyDetectedHands.length === 0) {
            detectedHands = [];
            return;
        }

        if  (currentlyDetectedHands.length === 1) {
            let hand = currentlyDetectedHands[0];
            if (detectedHands.length === 0) {
                detectedHands.push({
                    ...hand,
                    prevX: hand.x,
                    prevY: hand.y
                });
            } else if (detectedHands.length === 1) {
                detectedHands[0] = {
                    ...hand,
                    prevX: detectedHands[0].x,
                    prevY: detectedHands[0].y
                };
            } else if (detectedHands.length === 2) {
                let index = distanceBetweenPoints(hand,detectedHands[0]) < distanceBetweenPoints(hand,detectedHands[1]) ? 0 : 1;
                detectedHands = [{
                    ...hand,
                    prevX: detectedHands[index].x,
                    prevY: detectedHands[index].y
                }];
            }

            return;
        }

        if (currentlyDetectedHands.length === 2) {
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
                if (distanceBetweenPoints(hand1,detectedHands[0]) < distanceBetweenPoints(hand2,detectedHands[0])){
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
                if (distanceBetweenPoints(hand1,detectedHands[0]) + distanceBetweenPoints(hand2,detectedHands[1]) <
                    distanceBetweenPoints(hand2,detectedHands[0]) + distanceBetweenPoints(hand1,detectedHands[1])) {
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
    }

    function processFrameResult(image) {
        // Draw the video frame to the canvas.
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);

        // Draw the hands and gestures
        drawHands(detectedHands);

        // Draw the head pose
        if (drawHeadFunction && headTrackingEnabled) {
            drawHeadFunction();
        }

        canvasCtx.restore();

        // Process the hands interaction
        processHandsInteraction(detectedHands);

    }

    function onResultsFaceMesh(results) {

        drawHeadFunction = () => {
            if (results.multiFaceLandmarks) {
                for (const landmarks of results.multiFaceLandmarks) {
                    drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#FF3030' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, { color: '#30FF30' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, { color: '#30FF30' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
                    drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: '#E0E0E0' });

                    let x = 0;
                    let y = 0;
                    let z = 0;
                    landmarks.forEach(element => {
                        x += element.x;
                        y += element.y;
                        z += Math.sqrt(element.z * element.z);
                    });


                    canvasCtx.beginPath();
                    canvasCtx.arc(x / landmarks.length * 640, y / landmarks.length * 480, 5, 0, 2 * Math.PI);
                    canvasCtx.fillStyle = 'blue';
                    canvasCtx.fill();
                    canvasCtx.closePath();

                    z = 1 / (z / landmarks.length) / 50 * cameraZScale * 2;
                    x = (0.5 - x / landmarks.length) * z * cameraXScale;
                    y = (0.5 - (y * 640 / 480) / landmarks.length) * z * cameraXScale;// + z/1.5-0.75;

                    if (headTrackingEnabled) {
                        xrCamera.leftEye.x = x - eyeDistance / 2;
                        xrCamera.leftEye.y = y;
                        xrCamera.leftEye.z = xrCamera.leftEye.z * 0.8 + z * 0.2;
                        xrCamera.rightEye.x = x + eyeDistance / 2;
                        xrCamera.rightEye.y = y;
                        xrCamera.rightEye.z = xrCamera.rightEye.z * 0.8 + z * 0.2;
                    } else {
                        xrCamera.leftEye.x = -eyeDistance / 2;
                        xrCamera.leftEye.y = 0;
                        xrCamera.leftEye.z = 3.5;
                        xrCamera.rightEye.x = eyeDistance / 2;
                        xrCamera.rightEye.y = 0;
                        xrCamera.rightEye.z = 3.5;
                    }


                    // Display head pose and nose tip position
                    head3dElement.textContent = `Head 3D coordinates: 
                        X: ${x.toFixed(4)}
                        Y: ${y.toFixed(4)}
                        Z: ${z.toFixed(4)}`;



                }
            } else {
                head3dElement.textContent = 'No face detected';
            }
        };

    }

    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResultsHands);
    faceMesh.onResults(onResultsFaceMesh);

    let calculating = false;
    setOnCameraUpdate((videoElement) => {
        if (calculating) return;
        calculating = true;
        hands.send({ image: videoElement }).then(() => {
            if (!headTrackingEnabled) {
                calculating = false;
                processFrameResult(videoElement);
                xrCamera.leftEye.x = -eyeDistance / 2;
                xrCamera.leftEye.y = 0;
                xrCamera.leftEye.z = 3.5;
                xrCamera.rightEye.x = eyeDistance / 2;
                xrCamera.rightEye.y = 0;
                xrCamera.rightEye.z = 3.5;
            } else {
                faceMesh.send({ image: videoElement }).then(() => {
                    calculating = false;
                    processFrameResult(videoElement);
                });
            }
        });
    });

}