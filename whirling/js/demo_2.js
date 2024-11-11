import { MAXIMUM_FRAME } from './constants.js';
import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();

      console.log("Input manager init");

      this.lastCorrelationTime = 0;
      this.correlationInterval = 200;
      // Create a single big orbit target in the middle
      const orbitPosition = '0 1.5 -1';
      const speed = 2;
      const clockwise = true;
      const radius = 0.2; // Increased radius for the big target

      const orbit = new OrbitTarget(0, radius, speed, clockwise, orbitPosition);
      this.manager.addOrbit(orbit);

      const orbit2 = new OrbitTarget(1, radius, speed, !clockwise, '1 1.5 -1');
      this.manager.addOrbit(orbit2);

    },

    remove: function () {
    },

    tick: function (time) {
      this.manager.update(time);

      console.log("Tick: " + time);

      // Add correlation calculation in tick
      if (time - this.lastCorrelationTime >= this.correlationInterval) {
        this.manager.calculateCorrelations();
        this.lastCorrelationTime = time;
      }
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
        console.log("VR mode starting...");
        this.initializeVRHandTracking();
      } else {
        console.log("Non-VR mode(mediapipe) starting...");
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
      let height = window.innerHeight * 0.2; // 20% of window height
      let width = height * aspectRatio;


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
        this.inputManager.setInactive(!toggleActiveMode);
      }
      this.canvasCtx.restore();
    
    }
  });

