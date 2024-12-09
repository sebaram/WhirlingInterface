import { MAXIMUM_FRAME } from './constants.js';

AFRAME.registerComponent('hand-tracking-webxr', {
  schema: {
    active: {type: 'boolean', default: true}
  },

  init: function() {
    console.log("hand-tracking-webxr|init");
    this.frame = null;
    this.spheres = {};
    this.sceneEl = this.el.sceneEl;
    this.inputManager = document.querySelector('#input-manager').components['input-manager'].manager;
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
              this.inputManager.setInactive(false);
              const wristPose = this.frame.getJointPose(wristJoint, this.referenceSpace);
              const wristPosition = wristPose.transform.position;
              
              // Update sphere visualization
              this.updateSpherePosition(wristPosition);
              
              // Update input manager
              this.updateInputManager(time, {
                x: wristPosition.x,
                y: wristPosition.y,
                z: wristPosition.z
              });
            }
          }
        }
      } else {
        this.inputManager.setInactive(true);
      }
    }
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
