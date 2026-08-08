import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';
import { buildScene } from './scenes.js';

// Used when the active scene supplies no anchors of its own (?scene=lab).
const FALLBACK_GRID = [
  '-1.65 2.2 -2', '-0.55 2.2 -2', '0.55 2.2 -2', '1.65 2.2 -2',
  '-1.65 1.6 -2', '-0.55 1.6 -2', '0.55 1.6 -2', '1.65 1.6 -2',
  '-1.65 1.0 -2', '-0.55 1.0 -2', '0.55 1.0 -2', '1.65 1.0 -2'
].map(position => ({position}));

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();

      // Environment first: the scene owns where the targets belong, so the
      // room and the anchors cannot drift apart.
      const scene = buildScene(this.el.sceneEl, 12);
      const anchors = scene.anchors(12) || FALLBACK_GRID;

      const speeds = [1.5, 2];
      const clockwiseOptions = [true, false];
      const phases = [0, 120, 240];

      anchors.forEach((anchor, orbitIndex) => {
        const speed = speeds[orbitIndex % 2];
        const clockwise = clockwiseOptions[Math.floor(orbitIndex / 2) % 2];
        const phase = phases[Math.floor(orbitIndex / 4)];
        const radius = anchor.orbitRadius || 0.2;

        const orbit = new OrbitTarget(orbitIndex, radius, speed, clockwise, anchor.position);
        if (anchor.label) { orbit.label = anchor.label; }
        orbit.theta = (phase * Math.PI) / 180; // Convert phase to radians
        if (anchor.targetRadius) { orbit.setSphereRadius(anchor.targetRadius); }
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
