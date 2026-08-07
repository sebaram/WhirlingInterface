// Chrome for the demo control panel.
//
// Two things live here:
//  - a header that collapses the panel, the way the FPS button collapses the
//    stats readout. Collapsed, the header still spells out the current target,
//    so the one setting you need while demoing never disappears.
//  - click-to-toggle on the webcam preview itself. Hiding it leaves a small
//    stub in the same corner, because a display:none canvas cannot be clicked
//    to bring itself back.

const PANEL_KEY = 'whirling:controls-open';
const VIDEO_KEY = 'whirling:video-visible';

const style = document.createElement('style');
style.textContent = `
  .switch {
    /* The demos hardcoded top:400px, which the taller panel overruns. Sit it
       just under the webcam preview instead - that is 20vh tall from y=10. */
    position: fixed;
    top: calc(20vh + 24px);
    left: 10px;
    width: 300px;
    background: rgba(252, 252, 252, .94);
    border: 1px solid rgba(0, 0, 0, .12);
    border-radius: 6px;
    font: 13px/1.6 system-ui, -apple-system, sans-serif;
    color: #1a1a1c;
    overflow: hidden;
  }

  .cp-header {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 8px 10px;
    background: #f2f2f0;
    border: 0; border-bottom: 1px solid rgba(0,0,0,.1);
    font: 600 12px/1.3 system-ui, sans-serif;
    color: #1a1a1c; text-align: left; cursor: pointer;
  }
  .cp-header:hover { background: #e9e9e6; }
  .cp-title { letter-spacing: .06em; text-transform: uppercase; color: #6b6b73; }
  .cp-summary {
    margin-left: auto; font-weight: 600; color: #d4453a;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-chevron { flex: 0 0 auto; color: #6b6b73; transition: transform .15s; }
  .switch[data-open="false"] .cp-chevron { transform: rotate(-90deg); }
  .switch[data-open="false"] .cp-header { border-bottom: 0; }

  .panel-body {
    padding: 10px 12px 12px;
    max-height: calc(78vh - 60px);
    overflow-y: auto;
  }
  .switch[data-open="false"] .panel-body { display: none; }

  .switch .slider, .switch .dropdown { display: flex; align-items: center; }
  .switch .slider label { flex: 0 0 56px; margin-right: 0; }
  .switch .slider input[type="range"] { flex: 1 1 auto; min-width: 0; }
  .switch .readout {
    flex: 0 0 60px; margin-left: 10px; text-align: right;
    font-variant-numeric: tabular-nums; color: #444; white-space: nowrap;
  }
  .cp-rule { margin: 10px 0; border: 0; border-top: 1px solid rgba(0,0,0,.1); }

  #mediapipe-canvas { cursor: pointer; border-radius: 4px; }

  #cp-camera-stub {
    position: absolute; top: 10px; left: 10px; z-index: 1000;
    padding: 6px 10px;
    font: 600 11px/1 system-ui, sans-serif; letter-spacing: .04em;
    color: #dfe4ea; background: rgba(20, 22, 28, .8);
    border: 1px solid rgba(255,255,255,.22); border-radius: 4px; cursor: pointer;
  }
  #cp-camera-stub:hover { background: rgba(20, 22, 28, .95); }
`;
document.head.appendChild(style);

const panel = document.querySelector('.switch');

/* ---------------------------------------------------------------- collapse */

if (panel) {
  const body = document.createElement('div');
  body.className = 'panel-body';
  while (panel.firstChild) { body.appendChild(panel.firstChild); }

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'cp-header';
  header.innerHTML =
    '<span class="cp-chevron">▾</span>' +
    '<span class="cp-title">Controls</span>' +
    '<span class="cp-summary"></span>';

  panel.appendChild(header);
  panel.appendChild(body);

  let open = localStorage.getItem(PANEL_KEY) !== 'false';
  const renderPanel = () => {
    panel.dataset.open = String(open);
    header.setAttribute('aria-expanded', String(open));
    header.title = open ? 'Hide the controls' : 'Show the controls';
  };
  header.addEventListener('click', () => {
    open = !open;
    localStorage.setItem(PANEL_KEY, String(open));
    renderPanel();
  });
  renderPanel();

  // target-picker.js broadcasts this; the summary is the whole point of keeping
  // the header visible when the body is collapsed.
  const summary = header.querySelector('.cp-summary');
  document.addEventListener('whirling:target-change', (event) => {
    summary.textContent = event.detail.label;
  });
}

/* ------------------------------------------------------------ video toggle */

const checkbox = document.getElementById('toggleVideo');

const stub = document.createElement('button');
stub.type = 'button';
stub.id = 'cp-camera-stub';
stub.textContent = '▶ SHOW CAMERA';
stub.hidden = true;
stub.title = 'Show the webcam preview';
document.body.appendChild(stub);

let canvas = null;
let videoVisible = localStorage.getItem(VIDEO_KEY) !== 'false';

function renderVideo () {
  if (canvas) { canvas.style.display = videoVisible ? 'block' : 'none'; }
  // Nothing to restore if the canvas never appeared (no webcam).
  stub.hidden = videoVisible || !canvas;
  if (checkbox) { checkbox.checked = videoVisible; }
}

function setVideo (next) {
  videoVisible = next;
  localStorage.setItem(VIDEO_KEY, String(videoVisible));
  renderVideo();
}

stub.addEventListener('click', () => setVideo(true));
if (checkbox) {
  checkbox.addEventListener('change', () => setVideo(checkbox.checked));
}

// hand-tracking-mediapipe creates the preview canvas once the camera starts.
(function waitForCanvas () {
  canvas = document.getElementById('mediapipe-canvas');
  if (!canvas) { requestAnimationFrame(waitForCanvas); return; }
  canvas.title = 'Click to hide the webcam preview';
  canvas.addEventListener('click', () => setVideo(false));
  renderVideo();
})();
