import {OrbitState, MAXIMUM_FRAME, ORBIT_RADIUS_MULTIPLIER, CORRELATION_MULTIPLIER} from './constants.js';

// Half the width of the orbit trace band, in metres.
const TRACE_HALF_WIDTH = 0.01;
// Floors so a slider dragged to its minimum can't produce degenerate geometry.
const MIN_ORBIT_RADIUS = 0.005;
const MIN_TARGET_RADIUS = 0.002;

// three.js draws a transparent, double-sided material twice — back faces then
// front faces — so the two sides blend in the right order. The orbit graphics
// are flat rings and discs, so there are never two sides to sort: one pass
// looks identical and halves both the draw calls and the triangle count.
AFRAME.registerComponent('single-pass-material', {
  init: function () {
    const apply = () => {
      const mesh = this.el.getObject3D('mesh');
      if (mesh) { mesh.material.forceSinglePass = true; }
    };
    apply();
    this.el.addEventListener('object3dset', apply);
  }
});

export class OrbitTarget {
    constructor(id, radius, period, clockwise, position) {
      this.id = id;
      this.radius = radius;
      this.period = period;
      this.targetRadiusRatio = 0.3;
      this.targetRadius = this.radius * this.targetRadiusRatio;
      this.clockwise = clockwise;
      this.position = position;
      this.theta = 0;
      this.twoPI = 2 * Math.PI;
      this.lastTime = 0;
      this.state = OrbitState.INACTIVE;
      // Scenes override this so a marker can read "Info" rather than "Button 3".
      this.label = `Button ${id}`;
      this.entity = this.createEntity();
      this.blinkInterval = null;
      this.correlation = 0;
      this.thetaHistory = [];
    }

    createEntity() {
      const entity = document.createElement('a-entity');
      entity.setAttribute('position', this.position);

      const orbitTrace = document.createElement('a-ring');
      orbitTrace.setAttribute('radius-inner', this.radius - 0.01);
      orbitTrace.setAttribute('radius-outer', this.radius + 0.01);
      orbitTrace.setAttribute('segments-theta', 64);
      // A-Frame defaults segmentsPhi to 10, subdividing the 1cm-wide band
      // radially into 10 rows for no visual gain — 1280 triangles per ring
      // instead of 128. The band is flat and one colour, so 1 row is enough.
      orbitTrace.setAttribute('segments-phi', 1);
      orbitTrace.setAttribute('material', {
        color: '#888888',
        opacity: 0.5,
        side: 'double',
        // These are UI, not scene geometry - flat shading keeps them legible
        // whatever the environment's lighting is doing.
        shader: 'flat'
      });
      orbitTrace.setAttribute('single-pass-material', '');
      entity.appendChild(orbitTrace);

      const buttonBackground = document.createElement('a-circle');
      buttonBackground.setAttribute('radius', this.radius - 0.01);
      buttonBackground.setAttribute('material', {
        color: '#FFFFFF',
        opacity: 0.8,
        shader: 'flat'
      });

      const fontSize = this.radius * 1.0;
      const buttonName = document.createElement('a-text');
      buttonName.setAttribute('value', 'Button ' + this.id);
      buttonName.setAttribute('align', 'center');
      buttonName.setAttribute('position', '0 0 0.01');
      buttonName.setAttribute('scale', `${fontSize} ${fontSize} 1`);
      buttonName.setAttribute('color', '#000000');

      const buttonGroup = document.createElement('a-entity');
      buttonGroup.appendChild(buttonBackground);
      buttonGroup.appendChild(buttonName);
      entity.appendChild(buttonGroup);

      const circle = document.createElement('a-circle');
      circle.setAttribute('radius', this.targetRadius*ORBIT_RADIUS_MULTIPLIER);
      circle.setAttribute('material', {color: 'gray', shader: 'flat'});
      circle.setAttribute('position', '0 0 0.001');  // Slight offset to avoid z-fighting
      entity.appendChild(circle);

      // Add new background circle
      const backgroundCircle = document.createElement('a-circle');
      backgroundCircle.setAttribute('radius', this.targetRadius * (ORBIT_RADIUS_MULTIPLIER + CORRELATION_MULTIPLIER));
      backgroundCircle.setAttribute('material', {
        color: '#000000',
        opacity: 0.3,
        transparent: true,
        side: 'double',
        shader: 'flat'
      });
      backgroundCircle.setAttribute('position', '0 0 0');  // Slightly behind the main circle
      backgroundCircle.setAttribute('single-pass-material', '');
      entity.appendChild(backgroundCircle);

      this.sphere = circle;
      this.backgroundSphere = backgroundCircle;
      this.buttonGroup = buttonGroup;
      this.buttonBackground = buttonBackground;
      this.orbitTrace = orbitTrace;
      this.buttonName = buttonName;

      return entity;
    }

    update(time) {
      if (this.lastTime === 0) {
        this.lastTime = time;
        return;
      }

      const deltaTime = (time - this.lastTime) / 1000;
      
      if (this.clockwise) {
        this.theta += (this.twoPI / this.period) * deltaTime;
      } else {
        this.theta -= (this.twoPI / this.period) * deltaTime;
      }

      if (this.theta > this.twoPI) {
        this.theta -= this.twoPI;
      } else if (this.theta < 0) {
        this.theta += this.twoPI;
      }

      const newX = this.radius * Math.cos(this.theta);
      const newY = this.radius * Math.sin(this.theta);
      this.sphere.setAttribute('position', `${newX} ${newY} 0.001`);
      this.backgroundSphere.setAttribute('position', `${newX} ${newY} 0`);

      // Change sphere size in INPUT state
      if (this.state === OrbitState.IDLE || this.state === OrbitState.PERFORMING || this.state === OrbitState.PENDING) {
        const size = this.targetRadius * (ORBIT_RADIUS_MULTIPLIER + this.correlation * CORRELATION_MULTIPLIER); // Oscillate between 50% and 150%
        this.sphere.setAttribute('radius', size);
      } else if(this.state === OrbitState.SELECTED){
        this.sphere.setAttribute('radius', this.targetRadius * (ORBIT_RADIUS_MULTIPLIER+CORRELATION_MULTIPLIER));
      } else {
        this.sphere.setAttribute('radius', this.targetRadius);
      }

      this.lastTime = time;
    }
    addThetaHistory(time) {
      const x = this.radius * Math.cos(this.theta);
      const y = this.radius * Math.sin(this.theta);

      this.thetaHistory.push({timestamp: time, theta: this.theta, x: x, y: y});
      if (this.thetaHistory.length > MAXIMUM_FRAME) {
        this.thetaHistory.shift();
      }
    }

    updateState() {
      const color = this.getStateColor();
      this.sphere.setAttribute('material', 'color', color);
      this.buttonBackground.setAttribute('material', 'color', color);
      this.buttonName.setAttribute('color',
        this.state === OrbitState.PENDING || this.state === OrbitState.SELECTED ? '#FFFFFF' : '#000000');

      // set button text as Button ID and state
      this.updateButtonName();

      // if inactive, hide the circle, else show it
      const isVisible = this.state !== OrbitState.INACTIVE;
      this.sphere.setAttribute('visible', isVisible);
      this.backgroundSphere.setAttribute('visible', isVisible);

      // Blink background in PENDING state
      if (this.state === OrbitState.PENDING) {
        if (!this.blinkInterval) {
          this.blinkInterval = setInterval(() => {
            const currentOpacity = this.buttonBackground.getAttribute('material').opacity;
            this.buttonBackground.setAttribute('material', 'opacity', currentOpacity === 0.8 ? 0.2 : 0.8);
          }, 500);
        }
      } else {
        if (this.blinkInterval) {
          clearInterval(this.blinkInterval);
          this.blinkInterval = null;
          this.buttonBackground.setAttribute('material', 'opacity', 0.8);
        }
      }
    }

    updateButtonName() {
      // "Radius" used to print only this.radius, so the target slider moved the
      // dot on screen while the label sat unchanged. Name both explicitly:
      // orbit = the path's radius, target = the dot's own radius.
      const sizes = `Orbit: ${(this.radius * 100).toFixed(1)}cm\nTarget: ${(this.targetRadius * 100).toFixed(1)}cm`;

      // donot show correlation if state is INACTIVE
      if (this.state === OrbitState.INACTIVE) {
        this.buttonName.setAttribute('value', `${this.label}\n${this.state}\n${sizes}`);
        return;
      }
      this.buttonName.setAttribute('value', `${this.label}\n${this.state}\n${sizes}\nCorr: ${this.correlation.toFixed(2)}`);
    }
    

    getStateColor() {
      switch (this.state) {
        case OrbitState.INACTIVE: return 'gray';
        case OrbitState.IDLE: return 'white';
        case OrbitState.PERFORMING: return 'yellow';
        case OrbitState.PENDING: return 'green';
        case OrbitState.SELECTED: return 'blue';
        default: return 'white';
      }
    }

    cycleState() {
      console.log(`Orbit ${this.id} state = ${this.state}`);
      const states = Object.values(OrbitState);
      const currentIndex = states.indexOf(this.state);
      this.state = states[(currentIndex + 1) % states.length];
      this.updateState();
      console.log(`Orbit ${this.id} state changed to ${this.state}`);
    }

    // Size of the moving target dot itself.
    setSphereRadius(radius){
      this.targetRadius = Math.max(radius, MIN_TARGET_RADIUS);
      this.sphere.setAttribute('radius', this.targetRadius);
      // The background circle marks the size the dot reaches at full
      // correlation, so it has to be rescaled along with the target - otherwise
      // it stays at whatever the constructor set and the dot grows out of it.
      this.backgroundSphere.setAttribute('radius',
        this.targetRadius * (ORBIT_RADIUS_MULTIPLIER + CORRELATION_MULTIPLIER));
      this.updateButtonName();
    }

    // Radius of the circular path the target travels along. Everything drawn
    // from it - the trace band, the button face behind it and the label scale -
    // has to be rebuilt; the dot's position follows on the next update().
    setOrbitRadius(radius){
      this.radius = Math.max(radius, MIN_ORBIT_RADIUS);

      // Keep the trace a band centred on the path, without letting a small
      // orbit push the inner edge through zero.
      const halfWidth = Math.min(TRACE_HALF_WIDTH, this.radius * 0.5);
      this.orbitTrace.setAttribute('radius-inner', this.radius - halfWidth);
      this.orbitTrace.setAttribute('radius-outer', this.radius + halfWidth);

      this.buttonBackground.setAttribute('radius', this.radius - halfWidth);

      const fontSize = this.radius * 1.0;
      this.buttonName.setAttribute('scale', `${fontSize} ${fontSize} 1`);

      this.updateButtonName();
    }

    setInitialTheta(theta) {
      this.theta = theta;
    }
  }
