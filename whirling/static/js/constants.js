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
