import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';
import { buildScene, targetAnchors } from './scenes.js';

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();

      // Environment first: the scene owns where the targets belong and how big
      // they are, so the room and the anchors cannot drift apart.
      buildScene(this.el.sceneEl, 12);
      const anchors = targetAnchors(12);

      const speeds = [1.5, 2];
      const clockwiseOptions = [true, false];
      const phases = [0, 120, 240];

      anchors.forEach((anchor, orbitIndex) => {
        const speed = speeds[orbitIndex % 2];
        const clockwise = clockwiseOptions[Math.floor(orbitIndex / 2) % 2];
        const phase = phases[Math.floor(orbitIndex / 4)];

        const orbit = new OrbitTarget(orbitIndex, anchor.orbitRadius, speed,
                                      clockwise, anchor.position);
        if (anchor.label) { orbit.label = anchor.label; }
        orbit.theta = (phase * Math.PI) / 180; // Convert phase to radians
        this.manager.addOrbit(orbit);
      });

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
