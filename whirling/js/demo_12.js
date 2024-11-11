import { MAXIMUM_FRAME } from './constants.js';
import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();
      
      // Create a 4x3 grid of orbit targets
      const gridPositions = [
        ['-1.65 2.2 -2', '-0.55 2.2 -2', '0.55 2.2 -2', '1.65 2.2 -2'],
        ['-1.65 1.6 -2', '-0.55 1.6 -2', '0.55 1.6 -2', '1.65 1.6 -2'],
        ['-1.65 1.0 -2', '-0.55 1.0 -2', '0.55 1.0 -2', '1.65 1.0 -2']
      ];

      const speeds = [1.5, 2];
      const clockwiseOptions = [true, false];
      const phases = [0, 120, 240];

      let orbitIndex = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const speed = speeds[orbitIndex % 2];
          const clockwise = clockwiseOptions[Math.floor(orbitIndex / 2) % 2];
          const phase = phases[Math.floor(orbitIndex / 4)];
          const radius = 0.2; // Fixed radius for all orbits

          const orbit = new OrbitTarget(orbitIndex, radius, speed, clockwise, gridPositions[row][col]);
          orbit.theta = (phase * Math.PI) / 180; // Convert phase to radians
          this.manager.addOrbit(orbit);
          orbitIndex++;
        }
      }

      // Add keyboard listeners
      document.addEventListener('keydown', (event) => {
        const key = parseInt(event.key);
        // reset all orbit's state when press 'r'
        if (event.key === 'r') {
          this.manager.setInactive(false);  // Set to active when resetting
        }
        if (!isNaN(key) && key >= 0 && key <= 2) {
          this.manager.cycleOrbitState(key);
        }
      });

      this.correlationInterval = setInterval(() => {
        this.manager.calculateCorrelations();
      }, 200);  // Calculate every second, adjust as needed
    },

    remove: function () {
      clearInterval(this.correlationInterval);
    },

    tick: function (time) {
      this.manager.update(time);
    }
  });


  AFRAME.registerComponent('hand-tracking', {
    init: function() {
      this.isVRHeadset = this.el.sceneEl.is('vr-mode');
      this.inputManager = document.querySelector('a-scene').components['input-manager'].manager;

      this.targetHand = 'left';
      this.targetJoint = 'wrist';
      this.jointIndices = {
        'wrist': 0,
        'thumb_tip': 4,
        'index_tip': 8,
        'middle_tip': 12,
        'ring_tip': 16,
        'pinky_tip': 20
      };

      // Add event listeners for hand and joint selectors
      document.getElementById('handSelector').addEventListener('change', (event) => {
        this.targetHand = event.target.value;
      });
      document.getElementById('jointSelector').addEventListener('change', (event) => {
        this.targetJoint = event.target.value;
      });

      if (this.isVRHeadset) {
        this.initializeVRHandTracking();
      } else {
        this.initializeMediaPipe();
      }
    },

    initializeVRHandTracking: function() {
      // Initialize VR hand tracking
      this.el.addEventListener('enter-vr', () => {
        if (this.el.sceneEl.is('ar-mode')) return;
        
        const hands = Array.from(this.el.sceneEl.querySelectorAll('[hand-tracking-controls]'));
        hands.forEach(hand => {
          hand.addEventListener('handtrackingchanged', this.onVRHandTrackingChanged.bind(this));
        });
      });
    },

    initializeMediaPipe: function() {
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

      hands.onResults(this.onResults.bind(this));

      const camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await hands.send({image: this.videoElement});
        },
        width: 1280,
        height: 720
      });

      camera.start();

      // Resize canvas to match video dimensions
      this.resizeCanvas();
      window.addEventListener('resize', this.resizeCanvas.bind(this));
    },

    resizeCanvas: function() {
      const aspectRatio = 16 / 9; // Assuming 16:9 aspect ratio
      let height = 200;
      let width = height*aspectRatio;

      this.canvasElement.width = width;
      this.canvasElement.height = height;
      
      // Update canvas style for correct display
      this.canvasElement.style.width = `${width}px`;
      this.canvasElement.style.height = `${height}px`;
    },

    onVRHandTrackingChanged: function(event) {
      const hand = event.target;
      const handedness = hand.getAttribute('hand-tracking-controls').hand;
      
      if (handedness === this.targetHand) {
        const joints = hand.components['hand-tracking-controls'].getJoints();
        const targetJoint = joints[this.jointIndices[this.targetJoint]];
        
        if (targetJoint) {
          this.inputManager.setInactive(false);
          const timestamp = performance.now();
          const position = targetJoint.position;
          
          this.inputManager.wristHistory.push({
            timestamp: timestamp,
            position: {x: position.x, y: position.y, z: position.z}
          });

          if (this.inputManager.wristHistory.length > MAXIMUM_FRAME) {
            this.inputManager.wristHistory.shift();
          }

          this.inputManager.orbits.forEach(orbit => {
            orbit.addThetaHistory(timestamp);
          });
        }
      }
    },

    onResults: function(results) {
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.canvasCtx.drawImage(
          results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        
        // Find the target hand
        let targetHandLandmarks = null;
      
        for (let i = 0; i < results.multiHandedness.length; i++) {
          if (results.multiHandedness[i].label.toLowerCase() === this.targetHand) {
            targetHandLandmarks = results.multiHandLandmarks[i];
            break;
          }
        }

        if (targetHandLandmarks) {
          this.inputManager.setInactive(false);

          const jointIndex = this.jointIndices[this.targetJoint];
          const targetJoint = targetHandLandmarks[jointIndex];
  
          // Store joint position with timestamp
          const timestamp = performance.now();
          this.inputManager.wristHistory.push({
            timestamp: timestamp,
            position: {x: (1-targetJoint.x), y: (1-targetJoint.y), z: targetJoint.z}  // flip x,y for A-Frame
          });


          // Keep only the last 100 entries (or adjust as needed)
          if (this.inputManager.wristHistory.length > MAXIMUM_FRAME) {
            this.inputManager.wristHistory.shift();
          }

          this.inputManager.orbits.forEach(orbit => {
            orbit.addThetaHistory(timestamp);
          });

          // Draw hand landmarks
          for (let i = 0; i < targetHandLandmarks.length; i++) {
            const landmark = targetHandLandmarks[i];
            if (i === jointIndex) {
              // Draw target joint as a larger red dot
              this.canvasCtx.fillStyle = '#FF0000';
              this.canvasCtx.beginPath();
              this.canvasCtx.arc(landmark.x * this.canvasElement.width, landmark.y * this.canvasElement.height, 8, 0, 2 * Math.PI);
              this.canvasCtx.fill();
            } else {
              // Draw other landmarks as small gray dots
              this.canvasCtx.fillStyle = '#808080';
              this.canvasCtx.beginPath();
              this.canvasCtx.arc(landmark.x * this.canvasElement.width, landmark.y * this.canvasElement.height, 3, 0, 2 * Math.PI);
              this.canvasCtx.fill();
            }
          }

          // Draw connections between landmarks
          drawConnectors(this.canvasCtx, targetHandLandmarks, HAND_CONNECTIONS,
                        {color: '#808080', lineWidth: 2});
        }
      } else { // No hands detected
        const toggleActiveMode = document.getElementById('toggleActiveMode').checked;
        this.inputManager.setInactive(!toggleActiveMode);
      }
      this.canvasCtx.restore();
    
    }
  });
