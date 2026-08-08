// Visual replacement for the hand / joint <select> pair.
//
// The two selects stay in the DOM as the source of truth: hand-tracking-base
// reads them on init and listens for 'change', so this module only has to keep
// them in sync and fire that event. No tracking code changes.
//
// Clicking a joint on either hand sets the hand and the joint together. The
// Left/Right buttons underneath are the explicit override, and the current
// target is spelled out in words below them.
//
// The plain scene opts out and gets the original dropdowns back instead.

import { activeScene } from './scenes.js';

// MediaPipe's 21 hand landmarks, hand-placed in a 100x124 viewBox as a right
// hand with the palm toward the viewer. The left hand is the same path mirrored.
const LANDMARKS = [
  [50, 114],                                  // 0  wrist
  [35, 103], [25, 92], [18, 82], [12, 73],    // 1-4   thumb
  [38, 68],  [35, 52], [33, 42], [32, 32],    // 5-8   index
  [50, 65],  [50, 47], [50, 36], [50, 26],    // 9-12  middle
  [62, 67],  [64, 50], [65, 40], [66, 31],    // 13-16 ring
  [73, 72],  [77, 59], [79, 50], [81, 42]     // 17-20 pinky
];

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

// Only these are selectable - they are exactly what jointSelector offers.
const JOINTS = [
  {value: 'wrist',      landmark: 0,  label: 'Wrist'},
  {value: 'thumb_tip',  landmark: 4,  label: 'Thumb tip'},
  {value: 'index_tip',  landmark: 8,  label: 'Index tip'},
  {value: 'middle_tip', landmark: 12, label: 'Middle tip'},
  {value: 'ring_tip',   landmark: 16, label: 'Ring tip'},
  {value: 'pinky_tip',  landmark: 20, label: 'Pinky tip'}
];

const HANDS = [{value: 'left', label: 'Left'}, {value: 'right', label: 'Right'}];

const SVG_NS = 'http://www.w3.org/2000/svg';

const style = document.createElement('style');
style.textContent = `
  .tp-hands { display: flex; gap: 8px; }
  .tp-hand {
    flex: 1 1 0;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 6px;
    padding: 4px 2px 2px;
    background: #fff;
    transition: opacity .12s, border-color .12s;
  }
  .tp-hand[data-selected="false"] { opacity: .42; }
  .tp-hand[data-selected="true"] { border-color: #d4453a; }
  .tp-hand svg { display: block; width: 100%; height: auto; }
  .tp-side {
    text-align: center; font-size: 11px; font-weight: 700;
    letter-spacing: .06em; color: #6b6b73; padding-bottom: 2px;
  }
  .tp-hand[data-selected="true"] .tp-side { color: #d4453a; }

  .tp-bone { stroke: #c4c4cc; stroke-width: 2.2; stroke-linecap: round; fill: none; }
  .tp-landmark { fill: #c4c4cc; }
  .tp-joint { cursor: pointer; }
  .tp-joint .tp-hit { fill: transparent; }
  .tp-joint .tp-dot {
    fill: #8b8b95; stroke: #fff; stroke-width: 1.5;
    transition: fill .12s, r .12s;
  }
  .tp-joint:hover .tp-dot { fill: #d4453a; r: 7; }
  .tp-joint:focus-visible { outline: none; }
  .tp-joint:focus-visible .tp-dot { stroke: #1a1a1c; stroke-width: 2; }
  .tp-joint[data-selected="true"] .tp-dot { fill: #d4453a; r: 7.5; }

  .tp-switch { display: flex; gap: 6px; margin-top: 8px; }
  .tp-switch button {
    flex: 1 1 0; padding: 5px 0;
    font: 600 12px/1 system-ui, sans-serif; letter-spacing: .04em;
    color: #44444c; background: #f2f2f0;
    border: 1px solid rgba(0,0,0,.14); border-radius: 5px; cursor: pointer;
  }
  .tp-switch button:hover { background: #e8e8e6; }
  .tp-switch button[aria-pressed="true"] {
    background: #d4453a; border-color: #d4453a; color: #fff;
  }

  .tp-current { margin: 8px 0 0; font-size: 12px; color: #6b6b73; }
  .tp-current strong { color: #1a1a1c; font-weight: 600; }
`;
document.head.appendChild(style);

function el (name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function buildHandSvg (hand, onPick) {
  const svg = el('svg', {viewBox: '0 0 100 124', 'aria-hidden': 'false',
                         role: 'group', 'aria-label': `${hand.label} hand`});

  // Mirror the right-hand geometry to get a left hand. Kept in its own group so
  // nothing else in the SVG inherits the flip.
  const g = el('g', hand.value === 'left'
    ? {transform: 'translate(100,0) scale(-1,1)'} : {});
  svg.appendChild(g);

  CONNECTIONS.forEach(([a, b]) => {
    g.appendChild(el('line', {class: 'tp-bone',
      x1: LANDMARKS[a][0], y1: LANDMARKS[a][1],
      x2: LANDMARKS[b][0], y2: LANDMARKS[b][1]}));
  });

  const selectable = new Set(JOINTS.map(j => j.landmark));
  LANDMARKS.forEach(([x, y], i) => {
    if (selectable.has(i)) { return; }
    g.appendChild(el('circle', {class: 'tp-landmark', cx: x, cy: y, r: 2.6}));
  });

  const jointNodes = {};
  JOINTS.forEach((joint) => {
    const [x, y] = LANDMARKS[joint.landmark];
    const group = el('g', {class: 'tp-joint', tabindex: '0', role: 'button',
                           'aria-label': `${hand.label} ${joint.label}`});
    // Generous invisible hit area - the visible dot is too small to hit reliably.
    group.appendChild(el('circle', {class: 'tp-hit', cx: x, cy: y, r: 11}));
    group.appendChild(el('circle', {class: 'tp-dot', cx: x, cy: y, r: 5.5}));

    group.addEventListener('click', () => onPick(hand.value, joint.value));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPick(hand.value, joint.value);
      }
    });

    g.appendChild(group);
    jointNodes[joint.value] = group;
  });

  return {svg, jointNodes};
}

const handSelect = document.getElementById('handSelector');
const jointSelect = document.getElementById('jointSelector');
const mount = document.getElementById('targetPicker');

// The plain scene puts the original dropdowns back rather than the diagram.
// The selects are already in the page and already drive hand-tracking - they
// are only hidden - so this is a matter of showing them with their labels.
function buildPlainDropdowns () {
  [[handSelect, 'Target Hand:'], [jointSelect, 'Target Joint:']].forEach(([select, text]) => {
    const row = document.createElement('div');
    row.className = 'dropdown';
    const label = document.createElement('label');
    label.setAttribute('for', select.id);
    label.textContent = text;
    select.removeAttribute('hidden');
    row.appendChild(label);
    row.appendChild(select);
    mount.appendChild(row);
  });

  // The collapsed header still wants to know the target.
  const announce = () => {
    const joint = (JOINTS.find(j => j.value === jointSelect.value) || {}).label || jointSelect.value;
    const hand = (HANDS.find(h => h.value === handSelect.value) || {}).label || handSelect.value;
    document.dispatchEvent(new CustomEvent('whirling:target-change', {
      detail: {hand: handSelect.value, joint: jointSelect.value, label: `${hand} · ${joint}`}
    }));
  };
  handSelect.addEventListener('change', announce);
  jointSelect.addEventListener('change', announce);
  announce();
}

if (handSelect && jointSelect && mount && activeScene().simple) {
  buildPlainDropdowns();
} else if (handSelect && jointSelect && mount) {
  const hands = {};

  const apply = (hand, joint) => {
    let changed = false;
    if (hand && handSelect.value !== hand) {
      handSelect.value = hand;
      handSelect.dispatchEvent(new Event('change', {bubbles: true}));
      changed = true;
    }
    if (joint && jointSelect.value !== joint) {
      jointSelect.value = joint;
      jointSelect.dispatchEvent(new Event('change', {bubbles: true}));
      changed = true;
    }
    if (changed) { render(); }
  };

  const handsRow = document.createElement('div');
  handsRow.className = 'tp-hands';
  HANDS.forEach((hand) => {
    const wrap = document.createElement('div');
    wrap.className = 'tp-hand';
    wrap.dataset.hand = hand.value;

    const built = buildHandSvg(hand, apply);
    const side = document.createElement('div');
    side.className = 'tp-side';
    side.textContent = hand.label;

    wrap.appendChild(side);
    wrap.appendChild(built.svg);
    handsRow.appendChild(wrap);
    hands[hand.value] = {wrap, jointNodes: built.jointNodes};
  });

  const switcher = document.createElement('div');
  switcher.className = 'tp-switch';
  const switchButtons = {};
  HANDS.forEach((hand) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = hand.label;
    button.addEventListener('click', () => apply(hand.value, null));
    switcher.appendChild(button);
    switchButtons[hand.value] = button;
  });

  const current = document.createElement('p');
  current.className = 'tp-current';
  current.appendChild(document.createTextNode('Target: '));
  const currentValue = document.createElement('strong');
  current.appendChild(currentValue);

  mount.appendChild(handsRow);
  mount.appendChild(switcher);
  mount.appendChild(current);

  function render () {
    const hand = handSelect.value;
    const joint = jointSelect.value;
    const jointLabel = (JOINTS.find(j => j.value === joint) || {}).label || joint;
    const handLabel = (HANDS.find(h => h.value === hand) || {}).label || hand;

    HANDS.forEach(({value}) => {
      hands[value].wrap.dataset.selected = String(value === hand);
      switchButtons[value].setAttribute('aria-pressed', String(value === hand));
      Object.entries(hands[value].jointNodes).forEach(([name, node]) => {
        node.dataset.selected = String(value === hand && name === joint);
      });
    });

    currentValue.textContent = `${handLabel} · ${jointLabel}`;

    // The collapsed panel header shows this too, so broadcast rather than
    // reaching across into the panel module.
    document.dispatchEvent(new CustomEvent('whirling:target-change', {
      detail: {hand, joint, label: `${handLabel} · ${jointLabel}`}
    }));
  }

  // Keep in step if anything else changes the selects.
  handSelect.addEventListener('change', render);
  jointSelect.addEventListener('change', render);

  render();
}
