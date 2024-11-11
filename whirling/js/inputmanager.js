import { OrbitState, MINIMUM_FRAME, MAXIMUM_FRAME, LOW_THRESHOLD, HIGH_THRESHOLD, PENDING_TIME_THRESHOLD } from './constants.js';
import { pearsonCorrelation } from './utils.js';

export class InputManager {
    constructor() {
      this.orbits = [];
      this.globalState = OrbitState.INACTIVE;
      this.inactive = true;
      this.wristHistory = [];

      this.curTime;

      this.maxIndex = -1;
      this.pendingStart = -1;
      this.lastStateTime = -1;

    }

    addOrbit(orbit) {
      this.orbits.push(orbit);
      document.querySelector('a-scene').appendChild(orbit.entity);
      orbit.state = OrbitState.INACTIVE;  // Ensure new orbits are set to INACTIVE
      orbit.updateState();          
    }

    removeOrbit(id) {
      const index = this.orbits.findIndex(orbit => orbit.id === id);
      if (index !== -1) {
        document.querySelector('a-scene').removeChild(this.orbits[index].entity);
        this.orbits.splice(index, 1);
      }
    }

    update(time) {
      this.curTime = time;
      this.orbits.forEach(orbit => orbit.update(time));
    }

    calculateCorrelations(){
      if (this.wristHistory.length < MINIMUM_FRAME) return;  // Need at least 2 points for correlation

      let maxCorr = -1;
      let secondMaxCorr = -1;
      let maxOrbit = null;
      let secondMaxOrbit = null;
      this.orbits.forEach(orbit => {
        const orbitXs = orbit.thetaHistory.slice(-MAXIMUM_FRAME).map(entry => entry.x);
        const orbitYs = orbit.thetaHistory.slice(-MAXIMUM_FRAME).map(entry => entry.y);
        const wristXs = this.wristHistory.slice(-MAXIMUM_FRAME).map(entry => entry.position.x);  // Using x-coordinate as an example
        const wristYs = this.wristHistory.slice(-MAXIMUM_FRAME).map(entry => entry.position.y);  // Using x-coordinate as an example
      

        const corrX = pearsonCorrelation(orbitXs, wristXs);
        const corrY = pearsonCorrelation(orbitYs, wristYs);

        orbit.correlation = (corrX + corrY)/2;

        // Determine max and second max correlations
        if (orbit.correlation > maxCorr) {
          secondMaxCorr = maxCorr;
          secondMaxOrbit = maxOrbit;
          maxCorr = orbit.correlation;
          maxOrbit = orbit;
        } else if (orbit.correlation > secondMaxCorr) {
          secondMaxCorr = orbit.correlation;
          secondMaxOrbit = orbit;
        }
      
        orbit.updateState();
        // orbit.updateButtonName();
      });

      if(this.curTime-this.lastStateTime < 500){
        return;
      }
      // state check and update part
      if(this.globalState==OrbitState.IDLE){
        if(maxCorr>=LOW_THRESHOLD){
          this.globalState = OrbitState.PERFORMING;
          maxOrbit.state = OrbitState.PERFORMING;
          this.lastStateTime = this.curTime;
        }
      }else if(this.globalState==OrbitState.PERFORMING){
        if(maxCorr<LOW_THRESHOLD){
          this.globalState = OrbitState.IDLE;
          maxOrbit.state = OrbitState.IDLE;
          this.lastStateTime = this.curTime;
        }else if(maxCorr>=HIGH_THRESHOLD){
          this.globalState = OrbitState.PENDING;
          maxOrbit.state = OrbitState.PENDING;
          this.lastStateTime = this.curTime;

          this.maxIndex = maxOrbit.id;
          this.pendingStart = this.curTime;
        }
      }else if(this.globalState==OrbitState.PENDING){
        if(this.maxIndex==maxOrbit.id && (this.curTime-this.pendingStart) > PENDING_TIME_THRESHOLD){
          this.globalState = OrbitState.SELECTED;
          maxOrbit.state = OrbitState.SELECTED;
          this.lastStateTime = this.curTime;
        }
      }
    }

    getCorrelationData(){
      const data = {
        orbits: this.orbits.map(orbit => ({
          id: orbit.id,
          thetaHistory: orbit.thetaHistory
        })),
        wristHistory: this.wristHistory
      };
      return data;

    }

    cycleOrbitState(id) {
      const orbit = this.orbits.find(o => o.id === id);
      if (orbit) {
        orbit.cycleState();
      }
    }

    setInactive(inactive) {
      if (this.inactive === inactive) {
        return;
      }

      this.inactive = inactive;
      this.orbits.forEach(orbit => {
        orbit.state = inactive ? OrbitState.INACTIVE : OrbitState.IDLE;
        orbit.updateState();
      });

      if (inactive) {
        this.globalState = OrbitState.INACTIVE;
        this.wristHistory = [];
        this.orbits.forEach(orbit => {
          orbit.thetaHistory = [];
          orbit.correlation = 0;
          orbit.updateButtonName();
        });
      }else if(this.globalState==OrbitState.INACTIVE){
        this.globalState = OrbitState.IDLE;
      }
    }

    setOrbitTargetRadius(radius){
      this.orbits.forEach(orbit => {
        orbit.setSphereRadius(radius);
      });
    }


  }