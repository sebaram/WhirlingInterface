// Wires the orbit / target size sliders to the running InputManager.
//
// Both demos carried the same inline handler, and both looked the component up
// on <a-scene> where it does not live. Doing it once here keeps the two demos
// in step and lets the sliders start from whatever sizes the demo actually
// built, instead of a hardcoded default that matched neither.

// Panel chrome and layout live in controls-panel.js.

const CONTROLS = [
  {slider: 'orbitSlider',  readout: 'orbitValue',  apply: 'setOrbitRadius',       read: (o) => o.radius},
  {slider: 'radiusSlider', readout: 'radiusValue', apply: 'setOrbitTargetRadius', read: (o) => o.targetRadius}
];

// The input-manager component builds its orbits in init(), which runs when the
// scene initialises - later than this module. Wait for the first orbit.
function whenOrbitsReady (callback) {
  const poll = () => {
    const el = document.querySelector('#input-manager');
    const component = el && el.components['input-manager'];
    const manager = component && component.manager;
    if (manager && manager.orbits.length) { callback(manager); return; }
    requestAnimationFrame(poll);
  };
  poll();
}

function centimetres (metres) {
  return `${(metres * 100).toFixed(1)} cm`;
}

whenOrbitsReady((manager) => {
  CONTROLS.forEach(({slider, readout, apply, read}) => {
    const input = document.getElementById(slider);
    if (!input) { return; }
    const label = document.getElementById(readout);

    // Start from the demo's own geometry, widening the range if the demo sits
    // outside it so the handle never starts pinned to an end stop.
    const current = read(manager.orbits[0]);
    input.min = Math.min(parseFloat(input.min), current);
    input.max = Math.max(parseFloat(input.max), current);
    input.value = current;
    // Read back rather than reusing `current`: the browser snaps the value to
    // the nearest step, and the readout has to agree with where the handle sat.
    if (label) { label.textContent = centimetres(parseFloat(input.value)); }

    input.addEventListener('input', () => {
      const metres = parseFloat(input.value);
      manager[apply](metres);
      if (label) { label.textContent = centimetres(metres); }
    });
  });
});
