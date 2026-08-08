// Environments for the webcam demos.
//
// The plain grid shows that motion matching works; it does not show what it is
// for. These scenes put the same targets where the technique earns its keep -
// small controls attached to real content, far enough away that ray pointing
// gets fiddly.
//
// Pick one with ?scene=museum | outdoor | lab.
//
// Every target stays camera-facing. Correlation matches a target's *local*
// circular motion against the hand's 2D motion, so a target rotated onto a side
// wall would still match numerically while looking wrong on screen. Content is
// arranged around the targets rather than the targets around the content.

const DEFAULT_SCENE = 'museum';

/* ------------------------------------------------------------ art textures */

// Deterministic so a given artwork looks the same on every reload.
function seeded (seed) {
  let s = seed * 2654435761 % 2147483647;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
}

const PALETTES = [
  ['#1f3b57', '#e8b04b', '#c94f31', '#f2ead3'],
  ['#3b2a4a', '#d96c5f', '#e8c26a', '#efe4d2'],
  ['#20403a', '#7fae7a', '#e0d6a8', '#c4553c'],
  ['#43303a', '#8f6d8a', '#dcb4a0', '#2d4159'],
  ['#1d2f4a', '#5b8ca8', '#d9c9a3', '#b5563f'],
  ['#402b1f', '#a9743f', '#dbb87a', '#5d7a5e']
];

function paintingTexture (index) {
  const rand = seeded(index + 7);
  const palette = PALETTES[index % PALETTES.length];
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, palette[0]);
  sky.addColorStop(1, palette[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A few soft bands and blocks - enough to read as "a painting" at distance.
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.4;
    ctx.fillStyle = palette[1 + Math.floor(rand() * 3)];
    if (rand() > 0.45) {
      ctx.beginPath();
      ctx.ellipse(rand() * canvas.width, rand() * canvas.height,
                  30 + rand() * 90, 20 + rand() * 70, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(rand() * canvas.width * 0.8, rand() * canvas.height * 0.8,
                   40 + rand() * 120, 20 + rand() * 90);
    }
  }
  ctx.globalAlpha = 1;
  return canvas.toDataURL('image/jpeg', 0.82);
}

/* ------------------------------------------------------------- dom helpers */

// Object values are passed through to A-Frame's setAttribute as-is. That
// matters for anything holding a data: URI - A-Frame parses a string component
// value as `key: value; key: value`, and the ";base64," inside the URI would
// terminate the property early.
function make (tag, attrs, parent) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  if (parent) { parent.appendChild(node); }
  return node;
}

// Grid shared by the 12-target layouts: 4 columns, 3 rows.
function grid (xs, ys) {
  const out = [];
  ys.forEach(y => xs.forEach(x => out.push({x, y})));
  return out;
}

/* -------------------------------------------------------------- the scenes */

const ARTWORKS = [
  'Harbour at Dusk', 'Study in Ochre', 'The Long Field', 'Interior, Morning',
  'Blue Hour', 'Weather Over Hills', 'Figure and Window', 'Salt Marsh',
  'Nocturne', 'Two Vessels', 'Riverbank', 'Late Orchard'
];

// a-text renders with A-Frame's Roboto MSDF font, which has no glyphs for
// accents or middots - they come out as blanks. Keep these ASCII.
const PLACES = [
  ['Cafe Lumen', '40 m'], ['Central Library', '120 m'], ['Bike Dock', '25 m'],
  ['Metro - Line 2', '80 m'], ['Pharmacy', '65 m'], ['Riverside Walk', '210 m'],
  ['Bakery', '30 m'], ['Post Office', '95 m'], ['Museum Wing B', '150 m'],
  ['Bus Stop 14', '55 m'], ['Green Market', '70 m'], ['Car Park', '180 m']
];

const MUSEUM_X = [-2.55, -0.85, 0.85, 2.55];
const MUSEUM_Y = [2.55, 1.65, 0.75];
const MUSEUM_WALL_Z = -3.0;

const OUTDOOR_X = [-2.4, -0.8, 0.8, 2.4];
const OUTDOOR_Y = [2.6, 1.7, 0.8];
const OUTDOOR_Z = -3.4;

export const SCENES = {
  museum: {
    label: 'Museum gallery',
    blurb: 'Each work carries its own info marker. Twelve of them across one wall, ' +
           'far enough that a pointing ray keeps sliding off.',
    background: '#0d0d12',

    build (sceneEl, count) {
      const room = make('a-entity', {id: 'scene-room'}, sceneEl);

      make('a-light', {type: 'ambient', color: '#4a4a60', intensity: '0.75'}, room);
      make('a-light', {type: 'directional', color: '#fff6e8', intensity: '0.55',
                       position: '-2 4 2'}, room);
      make('a-light', {type: 'point', color: '#ffe6bb', intensity: '0.65',
                       position: `0 3.4 ${MUSEUM_WALL_Z + 1.2}`, distance: '12', decay: '2'}, room);

      const W = 9.4, D = 9, H = 4.2;
      const front = MUSEUM_WALL_Z;
      const back = front + D;

      make('a-plane', {position: `0 0 ${front + D / 2}`, rotation: '-90 0 0',
                       width: W, height: D,
                       material: 'color: #15151c; roughness: 0.75'}, room);
      make('a-plane', {position: `0 ${H} ${front + D / 2}`, rotation: '90 0 0',
                       width: W, height: D, material: 'color: #0b0b10'}, room);
      make('a-plane', {position: `0 ${H / 2} ${front}`, width: W, height: H,
                       material: 'color: #23232e; roughness: 0.9; side: double'}, room);
      make('a-plane', {position: `0 ${H / 2} ${back}`, rotation: '0 180 0', width: W, height: H,
                       material: 'color: #1a1a24; roughness: 0.9; side: double'}, room);
      make('a-plane', {position: `${-W / 2} ${H / 2} ${front + D / 2}`, rotation: '0 90 0',
                       width: D, height: H,
                       material: 'color: #1a1a24; roughness: 0.9; side: double'}, room);
      make('a-plane', {position: `${W / 2} ${H / 2} ${front + D / 2}`, rotation: '0 -90 0',
                       width: D, height: H,
                       material: 'color: #1a1a24; roughness: 0.9; side: double'}, room);

      // A bench, so the room reads as a room rather than a box.
      make('a-box', {position: `0 0.22 ${front + 3.4}`, width: '2.2', height: '0.44',
                     depth: '0.5', material: 'color: #2b2b36; roughness: 0.8'}, room);

      if (count === 2) {
        // The pair are two markers on one work, so show that one work.
        const solo = make('a-entity', {position: `0 1.62 ${front + 0.03}`}, room);
        make('a-box', {width: '1.5', height: '1.1', depth: '0.05',
                       material: 'color: #33333f; roughness: 0.6'}, solo);
        make('a-plane', {position: '0 0 0.035', width: '1.38', height: '0.98',
                         material: {shader: 'flat', src: paintingTexture(3)}}, solo);
        make('a-text', {value: 'Interior, Morning - oil on canvas', align: 'center',
                        width: '1.8', position: '0 -0.66 0.04', color: '#9a9aa8'}, solo);
        return;
      }

      grid(MUSEUM_X, MUSEUM_Y).forEach((cell, i) => {
        const art = make('a-entity', {position: `${cell.x - 0.30} ${cell.y} ${front + 0.03}`}, room);
        make('a-box', {width: '0.86', height: '0.64', depth: '0.05',
                       material: 'color: #33333f; roughness: 0.6'}, art);
        make('a-plane', {position: '0 0 0.035', width: '0.78', height: '0.56',
                         material: {shader: 'flat', src: paintingTexture(i)}}, art);
        make('a-text', {value: ARTWORKS[i], align: 'center', width: '1.2',
                        position: '0 -0.42 0.04', color: '#9a9aa8'}, art);
      });
    },

    anchors (count) {
      if (count === 2) {
        // Two markers on one work: audio guide and details, side by side.
        return [
          {position: `-0.13 1.62 ${MUSEUM_WALL_Z + 0.12}`, orbitRadius: 0.055, targetRadius: 0.017, label: 'Audio'},
          {position: `0.13 1.62 ${MUSEUM_WALL_Z + 0.12}`, orbitRadius: 0.055, targetRadius: 0.017, label: 'Details'}
        ];
      }
      return grid(MUSEUM_X, MUSEUM_Y).map(cell => ({
        position: `${cell.x + 0.42} ${cell.y} ${MUSEUM_WALL_Z + 0.09}`,
        orbitRadius: 0.17, targetRadius: 0.05, label: 'Info'
      }));
    },

  },

  outdoor: {
    label: 'Outdoor AR wayfinding',
    blurb: 'Points of interest tagged in the world. Small, numerous, and out of arm’s ' +
           'reach - exactly where a pointing ray is least steady.',
    background: null,   // the environment component paints the sky

    build (sceneEl, count) {
      const world = make('a-entity', {id: 'scene-room'}, sceneEl);

      if (AFRAME.components.environment) {
        make('a-entity', {environment:
          'preset: forest; groundTexture: none; grid: none; ' +
          'groundColor: #55694a; groundColor2: #47593f; ' +
          'dressingAmount: 40; fog: 0.55; skyType: gradient'}, world);
      } else {
        // Environment component missing - fall back to a plain sky and ground.
        make('a-sky', {color: '#8fb6d8'}, world);
        make('a-plane', {rotation: '-90 0 0', width: '60', height: '60',
                         material: 'color: #4a5c3a'}, world);
        console.warn('[scenes] aframe-environment-component not loaded; using flat backdrop');
      }

      make('a-light', {type: 'ambient', color: '#cfd8e3', intensity: '0.9'}, world);
      make('a-light', {type: 'directional', color: '#fff4e0', intensity: '0.6',
                       position: '3 5 2'}, world);

      if (count === 2) {
        [['Cafe Lumen', '40 m', -0.12], ['Bakery', '30 m', 0.12]].forEach(([name, distance, x]) => {
          const poi = make('a-entity', {position: `${x} 1.9 ${OUTDOOR_Z}`}, world);
          make('a-plane', {width: '0.22', height: '0.1',
                           material: 'shader: flat; color: #10141c; opacity: 0.82; transparent: true'}, poi);
          make('a-text', {value: name, align: 'center', width: '0.42',
                          position: '0 0.015 0.01', color: '#f2f5f8'}, poi);
          make('a-text', {value: distance, align: 'center', width: '0.34',
                          position: '0 -0.028 0.01', color: '#8fd4a0'}, poi);
        });
        return;
      }

      grid(OUTDOOR_X, OUTDOOR_Y).forEach((cell, i) => {
        const [name, distance] = PLACES[i];
        const poi = make('a-entity', {position: `${cell.x - 0.34} ${cell.y} ${OUTDOOR_Z}`}, world);
        make('a-plane', {width: '0.92', height: '0.34',
                         material: 'shader: flat; color: #10141c; opacity: 0.82; transparent: true'}, poi);
        make('a-text', {value: name, align: 'center', width: '1.5',
                        position: '0 0.05 0.01', color: '#f2f5f8'}, poi);
        make('a-text', {value: distance, align: 'center', width: '1.1',
                        position: '0 -0.09 0.01', color: '#8fd4a0'}, poi);
      });
    },

    anchors (count) {
      if (count === 2) {
        return [
          {position: `-0.12 1.65 ${OUTDOOR_Z + 0.1}`, orbitRadius: 0.055, targetRadius: 0.017, label: 'Cafe'},
          {position: `0.12 1.65 ${OUTDOOR_Z + 0.1}`, orbitRadius: 0.055, targetRadius: 0.017, label: 'Bakery'}
        ];
      }
      return grid(OUTDOOR_X, OUTDOOR_Y).map(cell => ({
        position: `${cell.x + 0.42} ${cell.y} ${OUTDOOR_Z + 0.06}`,
        orbitRadius: 0.16, targetRadius: 0.048, label: 'Go'
      }));
    },

  },

  lab: {
    label: 'Plain (measurement)',
    blurb: 'No environment. The original layout, for looking at timing and correlation ' +
           'without anything else on screen.',
    background: null,
    build () {},
    anchors () { return null; }   // demo scripts keep their own grid
  }
};

/* -------------------------------------------------------------------- api */

export function activeSceneName () {
  const asked = new URLSearchParams(location.search).get('scene');
  return Object.prototype.hasOwnProperty.call(SCENES, asked) ? asked : DEFAULT_SCENE;
}

export function activeScene () {
  return SCENES[activeSceneName()];
}

// Build the environment as soon as the scene element exists. Called by the demo
// scripts before they create their targets, so anchors and geometry agree.
export function buildScene (sceneEl, targetCount) {
  const scene = activeScene();
  if (scene.background) {
    sceneEl.setAttribute('background', `color: ${scene.background}`);
  }
  scene.build(sceneEl, targetCount);

  // demo_2targets carries an aframe-log debug plane. It is useful against the
  // blank backdrop and reads as a black slab inside a dressed scene.
  if (activeSceneName() !== 'lab') {
    const log = document.querySelector('[log]');
    if (log) { log.setAttribute('visible', false); }
  }

  return scene;
}

/* ----------------------------------------------------------- scene switcher */

// Populates the panel's scene dropdown, if the demo has one. Switching reloads
// with a new ?scene=, since the environment is built once at startup.
const mount = document.getElementById('sceneSwitcher');
if (mount) {
  const active = activeSceneName();

  const label = document.createElement('label');
  label.setAttribute('for', 'sceneSelector');
  label.textContent = 'Scene:';

  const select = document.createElement('select');
  select.id = 'sceneSelector';
  Object.entries(SCENES).forEach(([name, scene]) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = scene.label;
    option.selected = name === active;
    select.appendChild(option);
  });
  select.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('scene', select.value);
    location.href = url.toString();
  });

  const row = document.createElement('div');
  row.className = 'dropdown';
  row.appendChild(label);
  row.appendChild(select);

  const blurb = document.createElement('p');
  blurb.className = 'scene-blurb';
  blurb.textContent = SCENES[active].blurb;

  mount.appendChild(row);
  mount.appendChild(blurb);
}
