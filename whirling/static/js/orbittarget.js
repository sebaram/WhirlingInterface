import {OrbitState, MAXIMUM_FRAME, ORBIT_RADIUS_MULTIPLIER, CORRELATION_MULTIPLIER} from './constants.js';

export class OrbitTarget {
    constructor(id, radius, period, clockwise, position) {
      this.id = id;
      this.radius = radius;
      this.period = period;
      this.targetRadius = 0.05;
      this.clockwise = clockwise;
      this.position = position;
      this.theta = 0;
      this.twoPI = 2 * Math.PI;
      this.lastTime = 0;
      this.state = OrbitState.INACTIVE;
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
      orbitTrace.setAttribute('material', {
        color: '#888888',
        opacity: 0.5,
        side: 'double'
      });
      entity.appendChild(orbitTrace);

      const buttonBackground = document.createElement('a-circle');
      buttonBackground.setAttribute('radius', this.radius - 0.01);
      buttonBackground.setAttribute('material', {
        color: '#FFFFFF',
        opacity: 0.8
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
      circle.setAttribute('color', 'gray');
      circle.setAttribute('position', '0 0 0.001');  // Slight offset to avoid z-fighting
      entity.appendChild(circle);

      // Add new background circle
      const backgroundCircle = document.createElement('a-circle');
      backgroundCircle.setAttribute('radius', this.targetRadius * (ORBIT_RADIUS_MULTIPLIER + CORRELATION_MULTIPLIER));
      backgroundCircle.setAttribute('material', {
        color: '#000000',
        opacity: 0.3,
        transparent: true,
        side: 'double'
      });
      backgroundCircle.setAttribute('position', '0 0 0');  // Slightly behind the main circle
      entity.appendChild(backgroundCircle);

      this.sphere = circle;
      this.backgroundSphere = backgroundCircle;
      this.buttonGroup = buttonGroup;
      this.buttonBackground = buttonBackground;

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
      this.buttonGroup.querySelector('a-text').setAttribute('color', 
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
      // donot show correlation if state is INACTIVE
      if (this.state === OrbitState.INACTIVE) {
        this.buttonGroup.querySelector('a-text').setAttribute('value', `Button ${this.id}\n${this.state}`);
        return;
      }
      this.buttonGroup.querySelector('a-text').setAttribute('value', `Button ${this.id}\n${this.state}\nCorr: ${this.correlation.toFixed(2)}`);
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

    setSphereRadius(radius){
      this.sphere.setAttribute('radius', radius);
      this.targetRadius = radius;
    }

    setInitialTheta(theta) {
      this.theta = theta;
    }
  }
