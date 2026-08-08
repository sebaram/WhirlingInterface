export const OrbitState = {
    INACTIVE: 'inactive', // orbit is not active
    IDLE: 'idle', // orbit is idle==hand is tracked
    PERFORMING: 'performing', // user is performing==exceed low threshold
    PENDING: 'pending', // orbit is pending==exceed high threshold
    SELECTED: 'selected' // orbit is selected
  };

// minimum & maximum number of frames for calculating correlation(adaptive window size)
export const MINIMUM_FRAME = 30;
export const MAXIMUM_FRAME = 60;

export const LOW_THRESHOLD = 0.75;
export const HIGH_THRESHOLD = 0.85;

export const PENDING_TIME_THRESHOLD = 1500;

// radius size = radius * (ORBIT_RADIUS_MULTIPLIER + correlation * CORRELATION_MULTIPLIER)
export const ORBIT_RADIUS_MULTIPLIER = .5;
export const CORRELATION_MULTIPLIER = .5;

// Orbit radius is per scene, not global - it depends on how far that scene's
// content sits from the viewer - so it lives in scenes.js alongside the layout
// it belongs to. Only the ratio between the dot and its orbit is shared.

// The moving dot's radius as a fraction of the orbit radius.
export const TARGET_RADIUS_RATIO = 0.3;

// Whether a target's label spells out its orbit and target size. Handy while
// tuning with the sliders, clutter in a demo - and the panel's sliders already
// show both in cm.
export const SHOW_SIZE_IN_LABEL = false;
