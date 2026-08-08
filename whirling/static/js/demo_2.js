import { InputManager } from './inputmanager.js';
import { OrbitTarget } from './orbittarget.js';
import { buildScene, targetAnchors } from './scenes.js';

AFRAME.registerComponent('input-manager', {
    init: function () {
      this.manager = new InputManager();

      console.log("Input manager init");

      this.lastCorrelationTime = 0;
      this.correlationInterval = 200;

      // Environment first: the scene owns where the targets belong and how big
      // they are.
      buildScene(this.el.sceneEl, 2);

      const speed = 2;
      targetAnchors(2).forEach((anchor, index) => {
        // The pair counter-rotate, which is what makes two targets this close
        // separable at all.
        const orbit = new OrbitTarget(index, anchor.orbitRadius, speed,
                                      index === 0, anchor.position);
        if (anchor.label) { orbit.label = anchor.label; }
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
