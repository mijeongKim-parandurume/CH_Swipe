const StereoModes = [
	{ id: 0, name: 'No stereo' },
	{ id: 1, name: 'Side by side' },
	{ id: 2, name: 'Over under' },
	{ id: 3, name: 'Horizontal interlaced' },
	{ id: 4, name: 'Vertical interlaced' },
	{ id: 5, name: 'Anaglyph red/cyan' },
	{ id: 6, name: 'Anaglyph grayscale red/cyan' },
	{ id: 7, name: 'Anaglyph green/magenta' },
	{ id: 8, name: 'Anaglyph grayscale green/magenta' },
	{ id: 9, name: 'Checkerboard' },
	{ id: 10, name: 'Checkerboard subcolor' }
];

THREE.DesktopXRCamera = function (renderer) {

	var self = this;

	var _cameraL = new THREE.PerspectiveCamera();
	_cameraL.matrixAutoUpdate = false;

	var _cameraR = new THREE.PerspectiveCamera();
	_cameraR.matrixAutoUpdate = false;

	this.leftEye = new THREE.Vector3(-0.2, 0, 3.5);
	this.rightEye = new THREE.Vector3(0.2, 0, 3.5);

	var _scene = new THREE.Scene();

	var _camera = new THREE.PerspectiveCamera(53, 1, 1, 10000);
	_camera.position.z = 2;
	_scene.add(_camera);

	var _params = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat };

	var _renderTargetL = new THREE.WebGLRenderTarget(512, 512, _params);
	var _renderTargetR = new THREE.WebGLRenderTarget(512, 512, _params);

	var _material = new THREE.ShaderMaterial({

		uniforms: {
			"mapLeft": { type: "t", value: _renderTargetL.texture },
			"mapRight": { type: "t", value: _renderTargetR.texture },
			"width": { type: "float", value: 512 },
			"height": { type: "float", value: 512 },
			"stereoMode": { type: "int", value: 0 },
		},

		vertexShader: [
			"varying vec2 vUv;",
			"void main() {",
			"	vUv = vec2( uv.x, uv.y );",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
			"}"
		].join("\n"),

		fragmentShader: [
			"uniform int stereoMode;",
			"uniform sampler2D mapLeft;",
			"uniform sampler2D mapRight;",
			"uniform float width;",
			"uniform float height;",

			"varying vec2 vUv;",

			"void main() {",
			"	vec2 uv = vUv;",
			"	if ( stereoMode == 0 ) {", //No stereo, Left eye only
			"		gl_FragColor = texture2D( mapLeft, uv );",

			"   } else if ( stereoMode == 1 ) {", //Side by side
			"		if ( gl_FragCoord.x *2.0 < width ) {",
			"			gl_FragColor = texture2D( mapLeft, vec2(uv.x*2.0,uv.y) );",
			"		} else {",
			"			gl_FragColor = texture2D( mapRight, vec2(uv.x*2.0 - 1.0,uv.y) );",
			"		}",

			"   } else if ( stereoMode == 2 ) {", //Over under
			"		if ( gl_FragCoord.y *2.0 < height ) {",
			"			gl_FragColor = texture2D( mapLeft, vec2(uv.x,uv.y*2.0) );",
			"		} else {",
			"			gl_FragColor = texture2D( mapRight, vec2(uv.x,uv.y*2.0 - 1.0) );",
			"		}",

			"   } else if ( stereoMode == 3 ) {", //Horizontal interlaced
			"		if ( (( mod( gl_FragCoord.y , 2.0 ) ) <= 1.00) ) {",
			"			gl_FragColor = texture2D( mapLeft, uv );",
			"		} else {",
			"			gl_FragColor = texture2D( mapRight, uv );",
			"		}",

			"   } else if ( stereoMode == 4 ) {", //Vertical interlaced
			"		if ( (( mod( gl_FragCoord.x , 2.0 ) ) <= 1.00) ) {",
			"			gl_FragColor = texture2D( mapLeft, uv );",
			"		} else {",
			"			gl_FragColor = texture2D( mapRight, uv );",
			"		}",

			"   } else if ( stereoMode == 5 ) {", //Anaglyph red/cyan
			"		vec4 leftColor = texture2D(mapLeft , uv );",
			"		vec4 rightColor = texture2D(mapRight , uv );",
			"		gl_FragColor = vec4(leftColor.x, rightColor.y, rightColor.z, 1.0);",

			"   } else if ( stereoMode == 6 ) {", //Anaglyph grayscale red/cyan
			"		vec4 leftColor = texture2D(mapLeft , uv );",
			"		float leftLight = (leftColor.x+leftColor.y+leftColor.z)/3.0;",
			"		vec4 rightColor = texture2D(mapRight , uv );",
			"		float rightLight = (rightColor.x+rightColor.y+rightColor.z)/3.0;",
			"		gl_FragColor = vec4(leftLight, rightLight, rightLight, 1.0);",

			"   } else if ( stereoMode == 7 ) {", //Anaglyph green/magenta
			"		vec4 leftColor = texture2D(mapLeft , uv );",
			"		vec4 rightColor = texture2D(mapRight , uv );",
			"		gl_FragColor = vec4(rightColor.x, leftColor.y, rightColor.z, 1.0);",

			"   } else if ( stereoMode == 8 ) {", //Anaglyph grayscale green/magenta
			"		vec4 leftColor = texture2D(mapLeft , uv );",
			"		float leftLight = (leftColor.x+leftColor.y+leftColor.z)/3.0;",
			"		vec4 rightColor = texture2D(mapRight , uv );",
			"		float rightLight = (rightColor.x+rightColor.y+rightColor.z)/3.0;",
			"		gl_FragColor = vec4(rightLight, leftLight, rightLight, 1.0);",

			"   } else if ( stereoMode == 9 ) {", //Checkerboard
			"		if ( (( mod( gl_FragCoord.y , 2.0 ) ) > 1.00) == (( mod( gl_FragCoord.x , 2.0 ) ) > 1.00) ) {",
			"			gl_FragColor = texture2D( mapLeft, uv );",
			"		} else {",
			"			gl_FragColor = texture2D( mapRight, uv );",
			"		}",

			"   } else if ( stereoMode == 10 ) {", //Checkerboard subcolor
			"		vec4 leftColor = texture2D(mapLeft , uv );",
			"		vec4 rightColor = texture2D(mapRight , uv );",
			"		if ( (( mod( gl_FragCoord.y , 2.0 ) ) > 1.00) == (( mod( gl_FragCoord.x , 2.0 ) ) > 1.00) ) {",
			"			gl_FragColor = vec4(leftColor.x, rightColor.y, leftColor.z, 1.0);",
			"		} else {",
			"			gl_FragColor = vec4(rightColor.x, leftColor.y, rightColor.z, 1.0);",
			"		}",

			"   }",
			"}"
		].join("\n")

	});

	var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), _material);
	_scene.add(mesh);


	//LeoHW specific stuff
	var container = renderer.domElement;
	//var leoHW = leoHWObject;
	var _left = -1;
	var _right = 1;
	var _top = container.innerHeight / container.innerWidth;
	var _bottom = -_top;
	var _near = 0.1;
	var _far = 100;

	this.setSize = function (width, height) {

		_renderTargetL = new THREE.WebGLRenderTarget(width, height, _params);
		_renderTargetR = new THREE.WebGLRenderTarget(width, height, _params);

		_material.uniforms["mapLeft"].value = _renderTargetL.texture;
		_material.uniforms["mapRight"].value = _renderTargetR.texture;
		_material.uniforms["width"].value = width;
		_material.uniforms["height"].value = height;

		renderer.setSize(width, height);

		/////?????
		_top = height / width;
		_bottom = -_top;

	};

	this.near = function (z) { // get or set near plane
		if (typeof z === 'number') _near = z;
		if (self.leftEye.z < self.rightEye.z) return self.leftEye.z - _near;
		return self.rightEye.z - _near;
	};
	this.far = function (z) { // get or set far plane
		if (typeof z === 'number') _far = z;
		return _far;
	};

	this.stereoMode = function (modeID) {
		if (typeof modeID === 'number') _material.uniforms["stereoMode"].value = modeID;
		return _material.uniforms["stereoMode"].value;
	}

	this.render = function (scene, matrixScreen) {
		matrixWorld = new THREE.Matrix4();
		if (typeof matrixScreen !== 'undefined') {
			matrixWorld.copy(matrixScreen);
		}

		scene.updateMatrixWorld();

		function renderFromXYZ(x, y, z, rendrTarget, camera) {
			var near = z - self.near();
			var projectionMatrix = new THREE.Matrix4();
			projectionMatrix.makePerspective(
				(_left - x) * near / z,
				(_right - x) * near / z,
				(_top - y) * near / z,
				(_bottom - y) * near / z,
				near,
				z + self.far());
			camera.projectionMatrix.copy(projectionMatrix);
			var matr = new THREE.Matrix4();
			matr.makeTranslation(x, y, z);
			camera.matrixWorld.copy(matrixWorld).multiply(matr);
			renderer.setRenderTarget(rendrTarget);
			renderer.clear();
			renderer.render(scene, camera);
		}
		if (_material.uniforms["stereoMode"].value === 0) {
			renderFromXYZ(
				(self.leftEye.x + self.rightEye.x) / 2,
				(self.leftEye.y + self.rightEye.y) / 2,
				(self.leftEye.z + self.rightEye.z) / 2,
				_renderTargetL, _cameraL);
		} else {
			renderFromXYZ(self.leftEye.x, self.leftEye.y, self.leftEye.z, _renderTargetL, _cameraL);
			renderFromXYZ(self.rightEye.x, self.rightEye.y, self.rightEye.z, _renderTargetR, _cameraR);
		}
		
		_scene.updateMatrixWorld();
		renderer.setRenderTarget(null);
		renderer.render(_scene, _camera);

	};

};
