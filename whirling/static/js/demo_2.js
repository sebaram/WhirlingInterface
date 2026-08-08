import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';
import { buildScene } from './scenes.js';

// Used when the active scene supplies no anchors of its own (?scene=lab).
const FALLBACK_PAIR = [
  {position: '0 1.5 -2', orbitRadius: 0.048},
  {position: '1 1.5 -2', orbitRadius: 0.048}
];

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();

      console.log("Input manager init");

      this.lastCorrelationTime = 0;
      this.correlationInterval = 200;

      // Environment first: the scene owns where the targets belong.
      const scene = buildScene(this.el.sceneEl, 2);
      const anchors = scene.anchors(2) || FALLBACK_PAIR;

      const speed = 2;
      anchors.forEach((anchor, index) => {
        // The pair counter-rotate, which is what makes two targets this close
        // separable at all.
        const orbit = new OrbitTarget(index, anchor.orbitRadius || 0.048, speed,
                                      index === 0, anchor.position);
        if (anchor.label) { orbit.label = anchor.label; }
        if (anchor.targetRadius) { orbit.setSphereRadius(anchor.targetRadius); }
        this.manager.addOrbit(orbit);
      });
    },

    remove: function () {
    },

    tick: function (time) {
      // update the input manager, it handles the orbits
      this.manager.update(time);

      // Add correlation calculation in tick
      if (time - this.lastCorrelationTime >= this.correlationInterval) {
        this.manager.calculateCorrelations();
        this.lastCorrelationTime = time;
      }
    }
  });
