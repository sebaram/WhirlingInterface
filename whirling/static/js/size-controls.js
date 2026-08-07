// Wires the orbit / target size sliders to the running InputManager.
//
// Both demos carried the same inline handler, and both looked the component up
// on <a-scene> where it does not live. Doing it once here keeps the two demos
// in step and lets the sliders start from whatever sizes the demo actually
// built, instead of a hardcoded default that matched neither.

// The panel is plain text drawn straight over the 3D scene, which is hard to
// read against the targets. Give it a backing plate and line the rows up.
const style = document.createElement('style');
style.textContent = `
  .switch {
    width: 300px;
    background: rgba(252, 252, 252, .92);
    border: 1px solid rgba(0, 0, 0, .12);
    padding: 10px 12px;
    border-radius: 6px;
    font: 13px/1.6 system-ui, -apple-system, sans-serif;
    color: #1a1a1c;
  }
  .switch .slider, .switch .dropdown { align-items: center; }
  .switch .slider label, .switch .dropdown label { flex: 0 0 92px; margin-right: 0; }
  .switch .slider input[type="range"] { flex: 1 1 auto; min-width: 0; }
  .switch .readout {
    flex: 0 0 60px;
    margin-left: 10px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #444;
    white-space: nowrap;
  }
`;
document.head.appendChild(style);

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
