import { MAXIMUM_FRAME } from './constants.js';

AFRAME.registerComponent('hand-tracking-mediapipe', {
  schema: {
    active: {type: 'boolean', default: true}
  },

  init: function() {
    this.camera = null;
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
        if (results.multiHandedness[i].label.toLowerCase() === this.oppositeHand) {
          targetHandLandmarks = results.multiHandLandmarks[i];
          break;
        }
      }

      if (targetHandLandmarks) {
        this.setInputManagerInactive(false);

        const jointIndex = this.jointIndices[this.targetJoint];
        const targetJoint = targetHandLandmarks[jointIndex];
        const convertedTargetJoint = {
          x: (1-targetJoint.x),
          y: (1-targetJoint.y),
          z: targetJoint.z
        };

        // Store joint position with timestamp
        const timestamp = performance.now();
        this.updateInputManager(timestamp, convertedTargetJoint);

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
      this.setInputManagerInactive(!toggleActiveMode);
    }
    this.canvasCtx.restore();
  }
});
