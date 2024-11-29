import { MAXIMUM_FRAME } from './constants.js';

// Base component for shared functionality
AFRAME.registerComponent('hand-tracking-base', {
  schema: {
    active: { type: 'boolean', default: true }
  },

  init: function() {
    console.log("hand-tracking-base|init");
    this.sceneEl = this.el.sceneEl;
    this.inputManager = document.querySelector('#input-manager').components['input-manager'].manager;

    // Common hand tracking settings
    this.targetHand = document.getElementById('handSelector').value;
    this.oppositeHand = this.targetHand === 'left' ? 'right' : 'left';
    this.targetJoint = document.getElementById('jointSelector').value;
    

    // Add event listeners
    document.getElementById('handSelector').addEventListener('change', (event) => {
      this.targetHand = event.target.value;
      this.oppositeHand = this.targetHand === 'left' ? 'right' : 'left';
    });
    document.getElementById('jointSelector').addEventListener('change', (event) => {
      this.targetJoint = event.target.value;
    });

    // add event listener to toggle mediapipe or webxr on enter-vr/exit-vr
    this.sceneEl.addEventListener('enter-vr', () => {
      console.log("enter-vr");
      // Enable WebXR hand tracking and disable MediaPipe tracking
      document.querySelector('[hand-tracking-webxr]').setAttribute('hand-tracking-webxr', 'active', true);
      document.querySelector('[hand-tracking-mediapipe]').setAttribute('hand-tracking-mediapipe', 'active', false);
      // pause mediapipe
      document.querySelector('[hand-tracking-mediapipe]').components['hand-tracking-mediapipe'].pause();
    });
    this.sceneEl.addEventListener('exit-vr', () => {
      console.log("exit-vr");
      // Enable MediaPipe hand tracking and disable WebXR tracking
      document.querySelector('[hand-tracking-webxr]').setAttribute('hand-tracking-webxr', 'active', false);
      document.querySelector('[hand-tracking-mediapipe]').setAttribute('hand-tracking-mediapipe', 'active', true);
      // resume mediapipe
      document.querySelector('[hand-tracking-mediapipe]').components['hand-tracking-mediapipe'].resume();
    });
  },

  setInputManagerInactive: function(inactive) {
    this.inputManager.setInactive(inactive);
  },

  updateInputManager: function(time, position) {
    this.inputManager.wristHistory.push({
      timestamp: time,
      position: position
    });

    if (this.inputManager.wristHistory.length > MAXIMUM_FRAME) {
      this.inputManager.wristHistory.shift();
    }

    this.inputManager.orbits.forEach(orbit => {
      orbit.addThetaHistory(time);
    });
  }
});

// WebXR-specific component
AFRAME.registerComponent('hand-tracking-webxr', {
  dependencies: ['hand-tracking-base'],
  schema: {
    active: {type: 'boolean', default: false}
  },

  init: function() {
    console.log("hand-tracking-webxr|init: ", this.data);
    this.frame = null;
    this.spheres = {};
    this.baseComponent = this.el.components['hand-tracking-base'];
  },

  tick: function(time) {
    if (!this.data.active) return;

    if (!this.frame) {
      this.frame = this.el.sceneEl.frame;
      this.referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
    } else {
      const session = this.el.sceneEl.renderer.xr.getSession();
      const inputSources = session.inputSources;
      
      if (!this.frame || !this.referenceSpace) return;

      if (inputSources.length > 0) {
        for (const inputSource of inputSources) {
          if (inputSource.hand && inputSource.handedness === 'right') {
            const wristJoint = inputSource.hand.get('wrist');
            if (wristJoint) {
              this.baseComponent.setInputManagerInactive(false);
              const wristPose = this.frame.getJointPose(wristJoint, this.referenceSpace);
              const wristPosition = wristPose.transform.position;
              
              // Update sphere visualization
              this.updateSpherePosition(wristPosition);
              
              // Update input manager
              this.baseComponent.updateInputManager(time, {
                x: wristPosition.x,
                y: wristPosition.y,
                z: wristPosition.z
              });
            }
          }
        }
      } else {
        this.baseComponent.setInputManagerInactive(true);
      }
    }
  },

  updateSpherePosition: function(position) {
    const handedness = 'right';
    if (!this.spheres[handedness + '_wrist']) {
      this.spheres[handedness + '_wrist'] = this.drawSphere(0.02, position);
    } else {
      this.spheres[handedness + '_wrist'].object3D.position.set(
        position.x, position.y, position.z
      );
    }
  },

  drawSphere: function(radius, position) {
    const sphere = document.createElement('a-sphere');
    sphere.setAttribute('radius', radius);
    sphere.setAttribute('color', 'red');
    sphere.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    this.el.appendChild(sphere);
    return sphere;
  }
});

// MediaPipe-specific component
AFRAME.registerComponent('hand-tracking-mediapipe', {
  dependencies: ['hand-tracking-base'],
  schema: {
    active: {type: 'boolean', default: false}
  },

  init: function() {
    this.camera = null;
    this.baseComponent = this.el.components['hand-tracking-base'];

    // text to joint index mapping
    this.jointIndices = {
        'wrist': 0,
        'thumb_tip': 4,
        'index_tip': 8,
        'middle_tip': 12,
        'ring_tip': 16,
        'pinky_tip': 20
    };

    this.lastResults = null;
    this.initializeMediaPipe();
  },

  pause: function() {
    if (this.camera) {
      this.camera.stop();
    }
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  },
  resume: function() {
    this.initializeMediaPipe();
  },

  tick: function() {
    if (!this.data.active){
      return;
    }

    if (this.lastResults) {
      this.processResults(this.lastResults);
    }
  },

  initializeMediaPipe: function() {
    //check if webcam is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      AFRAME.log("Webcam not supported");
      return;
    }

    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    // Create canvas element
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = 'mediapipe-canvas';  // Add this line
    this.canvasElement.style.position = 'absolute';
    this.canvasElement.style.top = '10px';  // Add some top margin
    this.canvasElement.style.left = '10px';  // Align to the right
    this.canvasElement.style.zIndex = '1000';

    document.body.appendChild(this.canvasElement);

    this.canvasCtx = this.canvasElement.getContext('2d');

    const hands = new Hands({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
      this.lastResults = results;
    });

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await hands.send({image: this.videoElement});
      },
      width: 1280,
      height: 720
    });

    this.camera.start();

    // Resize canvas to match video dimensions
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  },

  resizeCanvas: function() {
    const aspectRatio = 16 / 9; // Assuming 16:9 aspect ratio
    let height = window.innerHeight * 0.2; // 20% of window height
    let width = height * aspectRatio;

    this.canvasElement.width = width;
    this.canvasElement.height = height;
    
    // Update canvas style for correct display
    this.canvasElement.style.width = `${width}px`;
    this.canvasElement.style.height = `${height}px`;
  },

  processResults: function(results) {
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.canvasCtx.drawImage(
        results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      
      // Find the target hand
      let targetHandLandmarks = null;
    
      for (let i = 0; i < results.multiHandedness.length; i++) {
        // don't use targetHand, use oppositeHand: mediapipe bug?
        if (results.multiHandedness[i].label.toLowerCase() === this.baseComponent.oppositeHand) {
          targetHandLandmarks = results.multiHandLandmarks[i];
          break;
        }
      }

      if (targetHandLandmarks) {
        this.baseComponent.setInputManagerInactive(false);

        const jointIndex = this.jointIndices[this.baseComponent.targetJoint];
        const targetJoint = targetHandLandmarks[jointIndex];
        const convertedTargetJoint = {
          x: (1-targetJoint.x),
          y: (1-targetJoint.y),
          z: targetJoint.z
        };

        // Store joint position with timestamp
        const timestamp = performance.now();
        this.baseComponent.updateInputManager(timestamp, convertedTargetJoint);

        // Draw hand landmarks
        for (let i = 0; i < targetHandLandmarks.length; i++) {
          const landmark = targetHandLandmarks[i];
          if (i === jointIndex) {
            // Draw target joint as a larger red dot
            this.canvasCtx.fillStyle = '#FF0000';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(landmark.x * this.canvasElement.width, landmark.y * this.canvasElement.height, 18, 0, 2 * Math.PI);
            this.canvasCtx.fill();
          } else {
            // Draw other landmarks as small gray dots
            this.canvasCtx.fillStyle = '#808080';
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(landmark.x * this.canvasElement.width, landmark.y * this.canvasElement.height, 13, 0, 2 * Math.PI);
            this.canvasCtx.fill();
          }
        }

        // Draw connections between landmarks
        drawConnectors(this.canvasCtx, targetHandLandmarks, HAND_CONNECTIONS,
                      {color: '#808080', lineWidth: 2});
      }
    } else { // No hands detected
      const toggleActiveMode = document.getElementById('toggleActiveMode').checked;
      this.baseComponent.setInputManagerInactive(!toggleActiveMode);
    }
    this.canvasCtx.restore();
  }
});
