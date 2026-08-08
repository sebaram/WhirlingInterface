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

function paintingTexture (index, aspect) {
  const rand = seeded(index + 7);
  const palette = PALETTES[index % PALETTES.length];
  const canvas = document.createElement('canvas');
  // Match the canvas to the work it goes on, or a portrait piece gets a
  // landscape image squashed onto it.
  const ratio = aspect || 4 / 3;
  canvas.width = Math.round(ratio >= 1 ? 320 : 320 * ratio);
  canvas.height = Math.round(ratio >= 1 ? 320 / ratio : 320);
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

// Orbit radii, in metres. Each scene states its own, because how small a target
// can be depends on how far away its content sits. The dressed scenes lean
// small deliberately: selection is by matching motion, not by pointing, so a
// target never has to be big enough to hit accurately. The dot inside each
// orbit is derived from TARGET_RADIUS_RATIO, so there is one number per layout.
const DRESSED_ORBIT_RADIUS = 0.07;   // museum + outdoor markers, ~3 m away
const DRESSED_PAIR_RADIUS = 0.032;   // two markers that nearly touch
// Gap of a quarter radius between the pair, so they read as adjacent, not merged.
const PAIR_SEPARATION = DRESSED_PAIR_RADIUS * 2.25;

// The measurement layout keeps the sizes and positions it was tuned with.
const LAB_ORBIT_RADIUS = 0.2;
const LAB_PAIR_RADIUS = 0.048;

const MUSEUM_WALL_Z = -3.0;
// Height of the info plaque under the single work in the two-target layout.
const MUSEUM_PLAQUE_Y = 0.92;

// A gallery hang is not a grid. Sizes vary with the work, pieces cluster, and
// they sit *about* a centre line near eye level rather than on one - small
// works stack in pairs, a big canvas anchors a group. Laid out by hand rather
// than generated, because a good hang is composed, not scattered.
//
// x, y are the centre of the canvas; w, h its size. The marker that belongs to
// each work is derived from this in anchors(), so moving a painting moves its
// marker with it and the two cannot drift apart.
// Kept inside roughly +/-3.4 m: at this wall distance that is what the camera
// actually frames, and a hang you cannot see is not a hang.
const MUSEUM_HANG = [
  {x: -2.78, y: 1.72, w: 1.06, h: 1.42},   // 0  large canvas anchoring the left
  {x: -2.78, y: 3.02, w: 0.54, h: 0.38},   // 1  small, hung high above it
  {x: -1.42, y: 2.36, w: 0.60, h: 0.46},   // 2  stacked pair, upper
  {x: -1.42, y: 1.44, w: 0.60, h: 0.50},   // 3  stacked pair, lower
  {x: -1.55, y: 0.62, w: 0.56, h: 0.42},   // 4  small, low, clear of the caption above
  {x: -0.24, y: 1.98, w: 0.94, h: 0.68},   // 5  landscape, centre
  {x: -0.30, y: 1.08, w: 0.54, h: 0.42},   // 6  small, below and offset
  {x:  0.30, y: 3.00, w: 0.50, h: 0.38},   // 7  small, high centre
  {x:  1.00, y: 1.82, w: 0.48, h: 1.22},   // 8  tall narrow
  {x:  0.98, y: 0.66, w: 0.58, h: 0.44},   // 9  small, low
  {x:  2.30, y: 2.18, w: 1.22, h: 0.82},   // 10 large landscape
  {x:  2.10, y: 1.02, w: 0.82, h: 0.60}    // 11 medium, below it
];

// Frame width scales with the work, the way a real one would.
const frameWidth = (piece) => Math.max(0.05, Math.min(0.09, piece.w * 0.07));

// Clearance between the *frame* edge and the marker beside it. Measuring from
// the canvas instead leaves the frame overlapping its own marker.
const MARKER_GAP = 0.09;
const marker = (piece) =>
  piece.x + piece.w / 2 + frameWidth(piece) + MARKER_GAP + DRESSED_ORBIT_RADIUS;

const OUTDOOR_X = [-2.4, -0.8, 0.8, 2.4];
const OUTDOOR_Y = [2.6, 1.7, 0.8];
const OUTDOOR_Z = -3.4;

const LAB_X = [-1.65, -0.55, 0.55, 1.65];
const LAB_Y = [2.2, 1.6, 1.0];

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
        const solo = make('a-entity', {position: `0 1.72 ${front + 0.03}`}, room);
        make('a-box', {width: '1.5', height: '1.1', depth: '0.05',
                       material: 'color: #33333f; roughness: 0.6'}, solo);
        make('a-plane', {position: '0 0 0.035', width: '1.38', height: '0.98',
                         material: {shader: 'flat', src: paintingTexture(3, 1.38 / 0.98)}}, solo);
        make('a-text', {value: 'Interior, Morning - oil on canvas', align: 'center',
                        width: '1.8', position: '0 -0.66 0.04', color: '#9a9aa8'}, solo);

        // The plaque the two markers sit on.
        const plaque = make('a-entity', {position: `0 ${MUSEUM_PLAQUE_Y} ${front + 0.04}`}, room);
        make('a-plane', {width: '0.42', height: '0.21',
                         material: 'shader: flat; color: #2b2b36'}, plaque);
        // Below the markers, not behind them.
        make('a-text', {value: 'Audio guide          Details', align: 'center', width: '0.62',
                        position: '0 -0.078 0.01', color: '#8f8f9c'}, plaque);
        return;
      }

      MUSEUM_HANG.forEach((piece, i) => {
        const art = make('a-entity', {position: `${piece.x} ${piece.y} ${front + 0.03}`}, room);

        const frame = frameWidth(piece);
        make('a-box', {width: piece.w + frame * 2, height: piece.h + frame * 2, depth: '0.05',
                       material: 'color: #33333f; roughness: 0.6'}, art);
        make('a-plane', {position: '0 0 0.035', width: piece.w, height: piece.h,
                         material: {shader: 'flat', src: paintingTexture(i, piece.w / piece.h)}}, art);
        make('a-text', {value: ARTWORKS[i], align: 'center', width: '1.15',
                        position: `0 ${-(piece.h / 2 + frame + 0.1)} 0.04`, color: '#9a9aa8'}, art);
      });
    },

    anchors (count) {
      if (count === 2) {
        // On the plaque beneath the work, not on the canvas - a control sitting
        // over the painting reads as a defect, and the plaque is where a
        // gallery puts anything you are meant to press.
        return [
          {position: `${-PAIR_SEPARATION} ${MUSEUM_PLAQUE_Y} ${MUSEUM_WALL_Z + 0.12}`,
           orbitRadius: DRESSED_PAIR_RADIUS, label: 'Audio'},
          {position: `${PAIR_SEPARATION} ${MUSEUM_PLAQUE_Y} ${MUSEUM_WALL_Z + 0.12}`,
           orbitRadius: DRESSED_PAIR_RADIUS, label: 'Details'}
        ];
      }
      // Derived from the hang, so a marker always sits beside its own work.
      return MUSEUM_HANG.map(piece => ({
        position: `${marker(piece)} ${piece.y} ${MUSEUM_WALL_Z + 0.09}`,
        orbitRadius: DRESSED_ORBIT_RADIUS, label: 'Info'
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
          {position: `${-PAIR_SEPARATION} 1.65 ${OUTDOOR_Z + 0.1}`,
           orbitRadius: DRESSED_PAIR_RADIUS, label: 'Cafe'},
          {position: `${PAIR_SEPARATION} 1.65 ${OUTDOOR_Z + 0.1}`,
           orbitRadius: DRESSED_PAIR_RADIUS, label: 'Bakery'}
        ];
      }
      return grid(OUTDOOR_X, OUTDOOR_Y).map(cell => ({
        position: `${cell.x + 0.42} ${cell.y} ${OUTDOOR_Z + 0.06}`,
        orbitRadius: DRESSED_ORBIT_RADIUS, label: 'Go'
      }));
    },

  },

  lab: {
    label: 'Plain (measurement)',
    blurb: 'No environment. The original layout, for looking at timing and correlation ' +
           'without anything else on screen.',
    background: null,

    // Strips the demo back to how it was before the scenes existed: plain
    // hand/joint dropdowns instead of the SVG picker, and the panel open. The
    // geometry below is already the original, so this makes the whole page
    // match, not just the targets.
    simple: true,
    build () {},

    // Unchanged from before the scenes existed: same positions, same radii.
    anchors (count) {
      if (count === 2) {
        return [
          {position: '0 1.5 -2', orbitRadius: LAB_PAIR_RADIUS},
          {position: '1 1.5 -2', orbitRadius: LAB_PAIR_RADIUS}
        ];
      }
      return grid(LAB_X, LAB_Y).map(cell => ({
        position: `${cell.x} ${cell.y} -2`,
        orbitRadius: LAB_ORBIT_RADIUS
      }));
    }
  }
};

/* -------------------------------------------------------------------- api */

// A page can pick its own default with
//   <meta name="whirling-default-scene" content="lab">
// The headset demos use it: a virtual gallery around you is the opposite of
// what AR passthrough is for.
function pageDefaultScene () {
  const meta = document.querySelector('meta[name="whirling-default-scene"]');
  const asked = meta && meta.getAttribute('content');
  return Object.prototype.hasOwnProperty.call(SCENES, asked) ? asked : DEFAULT_SCENE;
}

export function activeSceneName () {
  const asked = new URLSearchParams(location.search).get('scene');
  return Object.prototype.hasOwnProperty.call(SCENES, asked) ? asked : pageDefaultScene();
}

export function activeScene () {
  return SCENES[activeSceneName()];
}

// Where this layout's targets go. Scenes own both the geometry and its sizes,
// so the demo scripts hold no coordinates of their own.
export function targetAnchors (count) {
  return activeScene().anchors(count) || SCENES.lab.anchors(count);
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

  // In AR the room has to get out of the way, or its walls sit between you and
  // the passthrough view of the actual room you are standing in. The targets
  // stay: they are the part worth overlaying on the world.
  const room = () => document.querySelector('#scene-room');
  sceneEl.addEventListener('enter-vr', () => {
    if (sceneEl.is('ar-mode') && room()) { room().setAttribute('visible', false); }
  });
  sceneEl.addEventListener('exit-vr', () => {
    if (room()) { room().setAttribute('visible', true); }
  });

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

  mount.appendChild(row);

  // The simple mode keeps the panel as bare as it used to be.
  if (!SCENES[active].simple) {
    const blurb = document.createElement('p');
    blurb.className = 'scene-blurb';
    blurb.textContent = SCENES[active].blurb;
    mount.appendChild(blurb);
  }
}
