
function EduScene(scene) {
    var self = this;
    self.scene = scene;


    // Add a key light to the scene
    var keyLight = new THREE.PointLight(0xffffff, 1, 100);
    keyLight.position.set(10, 10, 10);
    scene.add(keyLight);

    // Add a fill light to the scene
    var fillLight = new THREE.PointLight(0xffffff, 0.5, 100);
    fillLight.position.set(-10, 10, 10);
    scene.add(fillLight);

    // Add a back light to the scene
    var backLight = new THREE.PointLight(0xffffff, 0.5, 100);
    backLight.position.set(10, -10, -10);
    scene.add(backLight);

    let textFont = null;
    let labelMesh = null;

    function TextGeometryFromText(text) {
        return new THREE.TextGeometry(text, {
            font: textFont,
            size: 80,
            height: 1,
            curveSegments: 12,
            bevelEnabled: false
        });
    }
    function updateLabel(text, x, y, z, scale, color) {
        if (labelMesh) {
            scene.remove(labelMesh);
        }
        let labelGeometry = TextGeometryFromText(text);
        labelMesh = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        labelMesh.position.z = z;
        labelMesh.position.x = x;
        labelMesh.position.y = y;
        labelMesh.scale.setScalar(0.0005 * scale);
        scene.add(labelMesh);
    }

    new THREE.FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        textFont = font;
        updateLabel("Loading...", 0, 0, 0, 1, 0xffffff);
    });

    



    // model


    const onProgress = function (xhr) {

        if (xhr.lengthComputable) {

            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log(percentComplete.toFixed(2) + '% downloaded');

        }

    };

    let loadedObjects = 0;
    objects.forEach(object => {
        new THREE.MTLLoader()
            .setPath(object.path)
            .load(object.mtl, function (materials) {

                materials.preload();

                new THREE.OBJLoader()
                    .setMaterials(materials)
                    .setPath(object.path)
                    .load(object.obj, function (obj) {

                        obj.scale.setScalar(object.scale);
                        obj.rotation.x = object.rotation.x;
                        obj.rotation.y = object.rotation.y;
                        obj.rotation.z = object.rotation.z;
                        obj.position.x = object.position.x;
                        obj.position.y = object.position.y;
                        obj.position.z = object.position.z;

                        object.mesh = obj;

                        loadedObjects++;
                        if (loadedObjects === objects.length) {
                            setActiveObject(objects[activeObjectIndex]);
                        }

                    }, onProgress);

            });
    });

    let activeObject = null;
    let activeObjectIndex = defaultObjectIndex;
    let objectHolder = new THREE.Object3D();
    let objectOrigo = new THREE.Object3D();
    objectOrigo.position.z = 0.2;
    scene.add(objectOrigo);
    objectOrigo.add(objectHolder);

    function setActiveObject(object) {
        if (activeObject) {
            objectHolder.remove(activeObject.mesh);
        }
        activeObject = object;
        objectHolder.add(activeObject.mesh);
        keyLight.intensity = object.lights.key;
        fillLight.intensity = object.lights.fill;
        backLight.intensity = object.lights.back;
        objectHolder.rotation.x = 0;
        objectHolder.rotation.y = 0;
        objectHolder.rotation.z = 0;
        objectHolder.scale.setScalar(1);
        objectHolder.position.x = 0;
        objectHolder.position.y = 0;
        objectHolder.position.z = 0;

        if (object.label) {
            updateLabel(
                object.label.text,
                object.label.x,
                object.label.y,
                object.label.z,
                object.label.scale,
                object.label.color
            );
        } else {
            updateLabel("", 0, 0, 0, 1, 0xffffff);
        }
    }

    function nextObject() {
        activeObjectIndex = (activeObjectIndex + 1) % objects.length;
        setActiveObject(objects[activeObjectIndex]);
    }

    function previousObject() {
        activeObjectIndex = (activeObjectIndex - 1 + objects.length) % objects.length;
        setActiveObject(objects[activeObjectIndex]);
    }

    this.nextObject = nextObject;
    this.previousObject = previousObject;

    this.rotateActiveObject = function (x, y, z) {
        if (Math.abs(x) > 0.5) return;
        if (Math.abs(y) > 0.5) return;
        if (Math.abs(z) > 0.5) return;

        let matrix = new THREE.Matrix4();
        matrix.makeRotationFromEuler(new THREE.Euler(x, y, z));
        objectHolder.applyMatrix(matrix);
    }

    this.scaleActiveObject = function (scale) {
        objectHolder.scale.multiplyScalar(scale);
    }

    this.moveActiveObject = function (x, y, z) {
        objectHolder.position.x += x;
        objectHolder.position.y += y;
        objectHolder.position.z += z;
    }

    let swipe = 0;
    let swipeFinished = true;

    this.processSwipe = function (isSwiping, deltaX) {
        if (swipe < 0) {
            if ((objectHolder.position.x > -2) && (objectHolder.position.x <= 0)) {
                objectHolder.position.x -= 0.1;
            } else if (objectHolder.position.x < 0) {
                this.nextObject();
                objectHolder.position.x = 2;
            } else if (objectHolder.position.x >= 0.1) {
                objectHolder.position.x *= 0.9;
                objectHolder.position.y *= 0.9;
                objectHolder.position.z *= 0.9;
            } else {
                objectHolder.position.x = 0;
                swipe = 0;
            }
            return;
        }
        if (swipe > 0) {
            if ((objectHolder.position.x < 2) && (objectHolder.position.x >= 0)) {
                objectHolder.position.x += 0.1;
            } else if (objectHolder.position.x > 0) {
                this.previousObject();
                objectHolder.position.x = -2;
            } else if (objectHolder.position.x <= -0.1) {
                objectHolder.position.x *= 0.9;
                objectHolder.position.y *= 0.9;
                objectHolder.position.z *= 0.9;
            } else {
                objectHolder.position.x = 0;
                swipe = 0;
            }
            return;
        }


        if (Math.abs(deltaX) > 0.5) return;
        if (isSwiping) {
            objectHolder.position.x += deltaX;
            if (Math.abs(objectHolder.position.x) > 0.2) swipe = objectHolder.position.x;
            swipeFinished = false;
        } else {
            if (
                (
                    Math.abs(objectHolder.position.x) +
                    Math.abs(objectHolder.position.y) +
                    Math.abs(objectHolder.position.z) > 0.01
                ) && !swipeFinished
            ) {
                objectHolder.position.x *= 0.8;
                objectHolder.position.y *= 0.8;
                objectHolder.position.z *= 0.8;
            } else {
                if (!swipeFinished) {
                    objectHolder.position.x = 0;
                    objectHolder.position.y = 0;
                    objectHolder.position.z = 0;
                }
                swipeFinished = true;
            }
        }
    }

    // Add a background plane with a texture
    var loader = new THREE.TextureLoader();
    var backgroundMesh;
    loader.load('./assets/imgs/edu-background.webp', function (texture) {
        var backgroundGeometry = new THREE.PlaneGeometry(6, 6);
        var backgroundMaterial = new THREE.MeshBasicMaterial({ map: texture });
        backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        backgroundMesh.position.z = -2; // Position the background plane behind the scene
        scene.add(backgroundMesh);
    });





    this.update = function () {


    }

    this.update();

}
