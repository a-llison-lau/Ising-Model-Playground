precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D previousState; // Need to add this as a feedback texture

// Parameters for the Ising model
uniform float TEMPERATURE;      // Temperature parameter (higher = more randomness)
uniform float J;                // Coupling constant (positive = ferromagnetic)
const int GRID_SIZE = 2048;     // Number of cells along the shorter dimension
uniform float EVOLUTION_SPEED;  // Speed of the simulation
uniform int TOPOLOGY;

// Improved hash function for better randomness
float hash(vec2 p) {
  p = fract(p * vec2(123.45, 678.90));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Better random function that uses time seed
float random(vec2 pos, float timeSeed) {
  return hash(pos + vec2(timeSeed * 13.37, timeSeed * 7.77));
}

// Get a long-range connection based on position
vec2 getLongRangeConnection(vec2 pos, vec2 size) {
  // Use deterministic but seemingly random connection
  float h = hash(pos * 43.21);
  
  // Random offset between -size/3 and +size/3
  vec2 offset = vec2(
    (fract(h * 13.45) - 0.5) * 2.0 * (size.x / 3.0),
    (fract(h * 31.45) - 0.5) * 2.0 * (size.y / 3.0)
  );
  
  // Ensure we're not connecting to immediate neighbors
  if (abs(offset.x) < 2.0) offset.x = sign(offset.x) * 2.0;
  if (abs(offset.y) < 2.0) offset.y = sign(offset.y) * 2.0;
  
  // Apply offset and wrap around grid boundaries
  return vec2(
    mod(pos.x + offset.x, size.x),
    mod(pos.y + offset.y, size.y)
  );
}

// Get current spin value from the previous state texture
float getCurrentSpin(vec2 pos, vec2 size) {
  vec2 texCoord = pos / size;
  vec4 texColor = texture2D(previousState, texCoord);
  // Extract spin from the texture (-1 or 1)
  return texColor.r * 2.0 - 1.0;
}

// Initialize spin if we're on the first frame
float initializeSpin(vec2 pos, float timeSeed) {
  // Use time seed to get different initializations on different runs
  float r = random(pos, timeSeed);
  return r < 0.5 ? -1.0 : 1.0;
}

// Get the sum of neighboring spins based on topology
float getNeighborSum(vec2 pos, vec2 size) {
  float neighborSum = 0.0;
  
  if (TOPOLOGY == 0) {
    // Regular grid (4 neighbors)
    vec2 right = vec2(mod(pos.x + 1.0, size.x), pos.y);
    vec2 left = vec2(mod(pos.x - 1.0 + size.x, size.x), pos.y);
    vec2 up = vec2(pos.x, mod(pos.y + 1.0, size.y));
    vec2 down = vec2(pos.x, mod(pos.y - 1.0 + size.y, size.y));
    
    neighborSum += getCurrentSpin(right, size);
    neighborSum += getCurrentSpin(left, size);
    neighborSum += getCurrentSpin(up, size);
    neighborSum += getCurrentSpin(down, size);
  } 
  else if (TOPOLOGY == 1) {
    // Triangular lattice (6 neighbors)
    vec2 right = vec2(mod(pos.x + 1.0, size.x), pos.y);
    vec2 left = vec2(mod(pos.x - 1.0 + size.x, size.x), pos.y);
    vec2 up = vec2(pos.x, mod(pos.y + 1.0, size.y));
    vec2 down = vec2(pos.x, mod(pos.y - 1.0 + size.y, size.y));
    vec2 upRight = vec2(mod(pos.x + 1.0, size.x), mod(pos.y + 1.0, size.y));
    vec2 downLeft = vec2(mod(pos.x - 1.0 + size.x, size.x), mod(pos.y - 1.0 + size.y, size.y));
    
    neighborSum += getCurrentSpin(right, size);
    neighborSum += getCurrentSpin(left, size);
    neighborSum += getCurrentSpin(up, size);
    neighborSum += getCurrentSpin(down, size);
    neighborSum += getCurrentSpin(upRight, size);
    neighborSum += getCurrentSpin(downLeft, size);
  }
  else if (TOPOLOGY == 2) {
    // Hexagonal lattice (3 neighbors)
    bool isEvenRow = mod(pos.y, 2.0) < 1.0;
    
    if (isEvenRow) {
      vec2 right = vec2(mod(pos.x + 1.0, size.x), pos.y);
      vec2 upRight = vec2(mod(pos.x + 1.0, size.x), mod(pos.y + 1.0, size.y));
      vec2 downRight = vec2(mod(pos.x + 1.0, size.x), mod(pos.y - 1.0 + size.y, size.y));
      
      neighborSum += getCurrentSpin(right, size);
      neighborSum += getCurrentSpin(upRight, size);
      neighborSum += getCurrentSpin(downRight, size);
    } else {
      vec2 left = vec2(mod(pos.x - 1.0 + size.x, size.x), pos.y);
      vec2 upLeft = vec2(mod(pos.x - 1.0 + size.x, size.x), mod(pos.y + 1.0, size.y));
      vec2 downLeft = vec2(mod(pos.x - 1.0 + size.x, size.x), mod(pos.y - 1.0 + size.y, size.y));
      
      neighborSum += getCurrentSpin(left, size);
      neighborSum += getCurrentSpin(upLeft, size);
      neighborSum += getCurrentSpin(downLeft, size);
    }
  }
  else if (TOPOLOGY == 3) {
    // Small-world network (4 regular + 1 long-range connection)
    vec2 right = vec2(mod(pos.x + 1.0, size.x), pos.y);
    vec2 left = vec2(mod(pos.x - 1.0 + size.x, size.x), pos.y);
    vec2 up = vec2(pos.x, mod(pos.y + 1.0, size.y));
    vec2 down = vec2(pos.x, mod(pos.y - 1.0 + size.y, size.y));
    vec2 longRange = getLongRangeConnection(pos, size);
    
    neighborSum += getCurrentSpin(right, size);
    neighborSum += getCurrentSpin(left, size);
    neighborSum += getCurrentSpin(up, size);
    neighborSum += getCurrentSpin(down, size);
    neighborSum += getCurrentSpin(longRange, size);
  }
  else if (TOPOLOGY == 4) {
    // Random graph (5 random connections)
    for (int i = 0; i < 5; i++) {
      float h = hash(pos + vec2(float(i) * 10.0, float(i) * 5.0));
      float angle = h * 6.28318;
      float dist = 1.0 + floor(hash(pos + vec2(0.0, float(i))) * 5.0);
      
      vec2 offset = vec2(cos(angle), sin(angle)) * dist;
      vec2 neighbor = vec2(
        mod(pos.x + offset.x + size.x, size.x),
        mod(pos.y + offset.y + size.y, size.y)
      );
      
      neighborSum += getCurrentSpin(neighbor, size);
    }
  }
  
  return neighborSum;
}

// Evolve the Ising model using the Metropolis algorithm
float evolveSpin(vec2 pos, vec2 size, float timeSeed) {
  // Get current spin value
  float currentSpin = getCurrentSpin(pos, size);
  
  // Get sum of neighboring spins
  float neighborSum = getNeighborSum(pos, size);
  
  // Calculate current energy
  float currentEnergy = -J * currentSpin * neighborSum;
  
  // Energy if spin were flipped
  float flippedEnergy = J * currentSpin * neighborSum;
  
  float energyDiff = flippedEnergy - currentEnergy;
  float r = random(pos, timeSeed);
  
  // Metropolis algorithm: always accept if energy decreases, otherwise accept with probability e^(-ΔE/T)
  if (energyDiff <= 0.0 || r < exp(-energyDiff / TEMPERATURE)) {
    return -currentSpin; // Flip the spin
  } else {
    return currentSpin;  // Keep the same spin
  }
}

void main() {
  // Normalize coordinates
  vec2 st = gl_FragCoord.xy / resolution.xy;
  
  // Calculate grid size based on aspect ratio
  vec2 numCells;
  if (resolution.x > resolution.y) {
    numCells = vec2(float(GRID_SIZE) * (resolution.x / resolution.y), float(GRID_SIZE));
  } else {
    numCells = vec2(float(GRID_SIZE), float(GRID_SIZE) * (resolution.y / resolution.x));
  }
  
  // Calculate grid position
  vec2 gridPos = floor(vec2(st.x * numCells.x, st.y * numCells.y));
  
  float spin;
  float timeSeed = time * 0.5; // Base time seed
  
  // Calculate update frequency based on evolution speed
  // We'll update at discrete time steps but interpolate between them
  float updateFrequency = 1.0 / max(0.05, 0.5 / EVOLUTION_SPEED);
  int currentUpdateStep = int(floor(time / updateFrequency));
  int nextUpdateStep = currentUpdateStep + 1;
  
  // Only a subset of pixels should update each frame, based on a checkboard pattern that shifts each frame
  // This creates a more orderly update pattern
  bool shouldUpdate = false;
  
  // Create a 2x2 update pattern based on position and current time step
  int updateMod = int(mod(float(currentUpdateStep), 4.0));
  bool xCheck = mod(gridPos.x, 2.0) < 1.0;
  bool yCheck = mod(gridPos.y, 2.0) < 1.0;
  
  if (updateMod == 0) shouldUpdate = xCheck && yCheck;
  else if (updateMod == 1) shouldUpdate = !xCheck && yCheck;
  else if (updateMod == 2) shouldUpdate = xCheck && !yCheck;
  else shouldUpdate = !xCheck && !yCheck;
  
  // Check if we're on the first frame (initialize) or should evolve
  if (time < 0.1) {
    // First frame - initialize
    spin = initializeSpin(gridPos, timeSeed);
  } else if (shouldUpdate) {
    // Update based on current time step
    float frameTimeSeed = float(currentUpdateStep) * 0.74321 + timeSeed;
    spin = evolveSpin(gridPos, numCells, frameTimeSeed);
  } else {
    // Keep the current spin
    spin = getCurrentSpin(gridPos, numCells);
  }
  
  // Determine colors
  vec3 upColor = vec3(1.0, 1.0, 1.0);
  vec3 downColor = vec3(0.0, 0.0, 0.0);
  
  // Apply spin color
  vec3 color = mix(downColor, upColor, spin * 0.5 + 0.5);
  
  // Visualize hexagonal pattern for hexagonal lattice (subtle effect)
  if (TOPOLOGY == 2) {
    bool isEvenRow = mod(gridPos.y, 2.0) < 1.0;
    float hexFactor = isEvenRow ? 0.05 : -0.05;
    color *= 1.0 + hexFactor;
  }
  
  gl_FragColor = vec4(color, 1.0);
}