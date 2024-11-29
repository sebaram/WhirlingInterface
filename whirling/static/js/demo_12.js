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

