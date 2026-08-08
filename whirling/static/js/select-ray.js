// Ray + pinch selection, as a baseline to compare motion matching against.
//
// Add ?select=ray to a headset demo. The scene, the targets, their positions
// and their sizes are all unchanged - only how you select one differs, which
// is the only way the comparison means anything.
//
// The ray is the WebXR pointer ray (inputSource.targetRaySpace), not the wrist
// orientation: that is the pose the platform intends for pointing, and it is
// what a Quest's own UI uses. Pinch comes from A-Frame's hand-tracking-controls,
// which emits pinchstarted/pinchended off the hand skeleton.
//
// In this mode the orbit trace and the moving dot are hidden. They belong to
// the motion-matching technique, not to the target, so leaving them on screen
// would show the baseline something the baseline does not use.

import { OrbitState } from './constants.js';

const RAY_COLOR = '#4da3ff';
const RAY_COLOR_HIT = '#ffd24d';
const RAY_LENGTH = 10;

export function selectionMode () {
  return new URLSearchParams(location.search).get('select') === 'ray' ? 'ray' : 'whirling';
}

AFRAME.registerComponent('ray-pinch-select', {
  schema: {
    hand: {default: 'right'}
  },

  init: function () {
    this.mode = selectionMode();
    this.manager = document.querySelector('#input-manager').components['input-manager'].manager;

    if (this.mode !== 'ray') { return; }

    // Motion matching off: in this condition the hand drives a ray, not a
    // correlation.
    this.manager.motionMatching = false;
    this.manager.orbits.forEach(orbit => orbit.setMotionVisible(false));

    this.raycaster = new THREE.Raycaster();
    this.origin = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.hovered = null;
    this.selected = null;

    this.buildRayLine();
    this.bindPinch();
  },

  // A THREE.Line updated in place. Rebuilding an a-frame `line` component every
  // frame would churn geometry for no reason.
  buildRayLine: function () {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.rayLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: RAY_COLOR}));
    this.rayLine.frustumCulled = false;
    this.rayLine.visible = false;
    this.el.sceneEl.object3D.add(this.rayLine);
  },

  bindPinch: function () {
    document.querySelectorAll('[hand-tracking-controls]').forEach(el => {
      const config = el.getAttribute('hand-tracking-controls');
      if (!config || config.hand !== this.data.hand) { return; }
      el.addEventListener('pinchstarted', () => this.commit());
    });
  },

  // The pointer ray for the tracked hand, straight from WebXR.
  readPointerRay: function () {
    const sceneEl = this.el.sceneEl;
    const frame = sceneEl.frame;
    const renderer = sceneEl.renderer;
    if (!frame || !renderer.xr.isPresenting) { return false; }

    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    if (!referenceSpace || !session) { return false; }

    for (const inputSource of session.inputSources) {
      if (!inputSource.hand || inputSource.handedness !== this.data.hand) { continue; }
      if (!inputSource.targetRaySpace) { continue; }
      const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
      if (!pose) { continue; }

      const p = pose.transform.position;
      const o = pose.transform.orientation;
      this.origin.set(p.x, p.y, p.z);
      this.quaternion.set(o.x, o.y, o.z, o.w);
      // A pointer ray points down its own -Z, the same convention as a camera.
      this.direction.set(0, 0, -1).applyQuaternion(this.quaternion).normalize();
      return true;
    }
    return false;
  },

  tick: function () {
    if (this.mode !== 'ray') { return; }

    if (!this.readPointerRay()) {
      this.rayLine.visible = false;
      this.setHovered(null);
      return;
    }

    this.raycaster.set(this.origin, this.direction);

    // Point at the button face - the target itself, not the orbiting dot.
    const byMesh = new Map();
    this.manager.orbits.forEach(orbit => {
      const mesh = orbit.buttonBackground.getObject3D('mesh');
      if (mesh) { byMesh.set(mesh, orbit); }
    });

    const hits = this.raycaster.intersectObjects([...byMesh.keys()], false);
    const hit = hits.length ? hits[0] : null;
    this.setHovered(hit ? byMesh.get(hit.object) : null);

    const end = hit
      ? hit.point
      : this.origin.clone().addScaledVector(this.direction, RAY_LENGTH);
    const position = this.rayLine.geometry.getAttribute('position');
    position.setXYZ(0, this.origin.x, this.origin.y, this.origin.z);
    position.setXYZ(1, end.x, end.y, end.z);
    position.needsUpdate = true;
    this.rayLine.material.color.set(hit ? RAY_COLOR_HIT : RAY_COLOR);
    this.rayLine.visible = true;
  },

  setHovered: function (orbit) {
    if (this.hovered === orbit) { return; }

    if (this.hovered && this.hovered !== this.selected) {
      this.hovered.state = OrbitState.IDLE;
      this.hovered.updateState();
    }
    this.hovered = orbit;
    if (orbit && orbit !== this.selected) {
      orbit.state = OrbitState.PERFORMING;
      orbit.updateState();
    }
  },

  commit: function () {
    if (!this.hovered) { return; }

    if (this.selected && this.selected !== this.hovered) {
      this.selected.state = OrbitState.IDLE;
      this.selected.updateState();
    }
    this.selected = this.hovered;
    this.selected.state = OrbitState.SELECTED;
    this.selected.updateState();

    // A hook for measurement, so a study does not have to patch this file.
    this.el.sceneEl.emit('whirling-selected', {
      technique: 'ray-pinch',
      id: this.selected.id,
      label: this.selected.label,
      time: performance.now()
    });
  },

  remove: function () {
    if (this.rayLine) { this.el.sceneEl.object3D.remove(this.rayLine); }
  }
});
