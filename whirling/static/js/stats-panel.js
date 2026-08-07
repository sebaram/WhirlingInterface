// A-Frame's stats panel (rStats) is hard-pinned to the top-left corner, which
// is exactly where hand-tracking-mediapipe.js draws the webcam preview canvas.
// Move the panel to the top-right and let it be toggled off, since it is only
// wanted occasionally while demoing.

const TOGGLE_KEY = 'p';
const STORAGE_KEY = 'whirling:stats-visible';
const HIDDEN_CLASS = 'stats-hidden';

const style = document.createElement('style');
style.textContent = `
  .rs-base {
    left: auto !important;
    right: 8px !important;
    top: 44px !important;
    bottom: auto !important;
    opacity: 0.9;
  }
  body.${HIDDEN_CLASS} .rs-base { display: none !important; }

  /* The panel is a fixed 320px wide, so on a narrow screen it would still
     reach across into the preview. Drop it to the bottom-left there — the
     preview stays top-left and A-Frame's VR button owns the bottom-right. */
  @media (max-width: 720px) {
    .rs-base {
      right: auto !important;
      left: 8px !important;
      top: auto !important;
      bottom: 8px !important;
    }
  }

  #stats-toggle {
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 10001;
    padding: 5px 10px;
    font: 600 11px/1 monospace;
    letter-spacing: .08em;
    color: #dfe4ea;
    background: rgba(20, 22, 28, .78);
    border: 1px solid rgba(255, 255, 255, .22);
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
  }
  #stats-toggle:hover { background: rgba(20, 22, 28, .95); }
  body.${HIDDEN_CLASS} #stats-toggle { opacity: .55; }
`;
document.head.appendChild(style);

// Default to hidden - it is a debugging readout, not part of the demo - but
// remember whatever the user picked last time.
let visible = localStorage.getItem(STORAGE_KEY) === 'true';

const button = document.createElement('button');
button.id = 'stats-toggle';
button.type = 'button';
document.body.appendChild(button);

function render () {
  document.body.classList.toggle(HIDDEN_CLASS, !visible);
  button.textContent = visible ? 'FPS ON' : 'FPS OFF';
  button.title = `Toggle the framerate panel (${TOGGLE_KEY})`;
}

function setVisible (next) {
  visible = next;
  localStorage.setItem(STORAGE_KEY, String(visible));
  render();
}

button.addEventListener('click', () => setVisible(!visible));

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== TOGGLE_KEY) { return; }
  // Don't steal the key while a form control has focus (radius slider, dropdowns).
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { return; }
  setVisible(!visible);
});

render();
