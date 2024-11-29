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
      const orbitPosition = '0 1.5 -2';
      const speed = 2;
      const clockwise = true;
      const radius = 0.048; // Increased radius for the big target

      const orbit = new OrbitTarget(0, radius, speed, clockwise, orbitPosition);
      this.manager.addOrbit(orbit);

      const orbit2 = new OrbitTarget(1, radius, speed, !clockwise, '1 1.5 -2');
      this.manager.addOrbit(orbit2);
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


