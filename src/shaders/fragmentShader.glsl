precision mediump float;

uniform float time;
uniform vec2 resolution;

// Parameters for the Ising model
uniform float TEMPERATURE ;      // Temperature parameter (higher = more randomness)
uniform float J;                // Coupling constant (positive = ferromagnetic)
const int GRID_SIZE = 256;           // Number of cells along the shorter dimension
uniform float EVOLUTION_SPEED;  // Speed of the simulation
uniform int TOPOLOGY;

// Hash function for pseudo-random number generation
float hash(vec2 p) {
  p = fract(p * vec2(123.45, 678.90));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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

// Get spin value at a specific position
float getSpinAt(vec2 pos, vec2 size) {
  // Get deterministic spin state based on grid position
  float spinSeed = hash(pos);
  return step(0.5, spinSeed) * 2.0 - 1.0;
}

// Get spin state at grid position
float getSpin(vec2 gridPos, float t, vec2 size) {
  float random = hash(gridPos + floor(t * EVOLUTION_SPEED));
  float spin = getSpinAt(gridPos, size);
  float neighborSum = 0.0;
  
  if (TOPOLOGY == 0) {
    // Regular grid (4 neighbors)
    vec2 right = vec2(mod(gridPos.x + 1.0, size.x), gridPos.y);
    vec2 left = vec2(mod(gridPos.x - 1.0 + size.x, size.x), gridPos.y);
    vec2 up = vec2(gridPos.x, mod(gridPos.y + 1.0, size.y));
    vec2 down = vec2(gridPos.x, mod(gridPos.y - 1.0 + size.y, size.y));
    
    neighborSum += getSpinAt(right, size);
    neighborSum += getSpinAt(left, size);
    neighborSum += getSpinAt(up, size);
    neighborSum += getSpinAt(down, size);
  } 
  else if (TOPOLOGY == 1) {
    // Triangular lattice (6 neighbors)
    vec2 right = vec2(mod(gridPos.x + 1.0, size.x), gridPos.y);
    vec2 left = vec2(mod(gridPos.x - 1.0 + size.x, size.x), gridPos.y);
    vec2 up = vec2(gridPos.x, mod(gridPos.y + 1.0, size.y));
    vec2 down = vec2(gridPos.x, mod(gridPos.y - 1.0 + size.y, size.y));
    vec2 upRight = vec2(mod(gridPos.x + 1.0, size.x), mod(gridPos.y + 1.0, size.y));
    vec2 downLeft = vec2(mod(gridPos.x - 1.0 + size.x, size.x), mod(gridPos.y - 1.0 + size.y, size.y));
    
    neighborSum += getSpinAt(right, size);
    neighborSum += getSpinAt(left, size);
    neighborSum += getSpinAt(up, size);
    neighborSum += getSpinAt(down, size);
    neighborSum += getSpinAt(upRight, size);
    neighborSum += getSpinAt(downLeft, size);
  }
  else if (TOPOLOGY == 2) {
    // Hexagonal lattice (3 neighbors)
    // For even rows: right, up-right, down-right
    // For odd rows: left, up-left, down-left
    bool isEvenRow = mod(gridPos.y, 2.0) < 1.0;
    
    if (isEvenRow) {
      vec2 right = vec2(mod(gridPos.x + 1.0, size.x), gridPos.y);
      vec2 upRight = vec2(mod(gridPos.x + 1.0, size.x), mod(gridPos.y + 1.0, size.y));
      vec2 downRight = vec2(mod(gridPos.x + 1.0, size.x), mod(gridPos.y - 1.0 + size.y, size.y));
      
      neighborSum += getSpinAt(right, size);
      neighborSum += getSpinAt(upRight, size);
      neighborSum += getSpinAt(downRight, size);
    } else {
      vec2 left = vec2(mod(gridPos.x - 1.0 + size.x, size.x), gridPos.y);
      vec2 upLeft = vec2(mod(gridPos.x - 1.0 + size.x, size.x), mod(gridPos.y + 1.0, size.y));
      vec2 downLeft = vec2(mod(gridPos.x - 1.0 + size.x, size.x), mod(gridPos.y - 1.0 + size.y, size.y));
      
      neighborSum += getSpinAt(left, size);
      neighborSum += getSpinAt(upLeft, size);
      neighborSum += getSpinAt(downLeft, size);
    }
  }
  else if (TOPOLOGY == 3) {
    // Small-world network (4 regular + 1 long-range connection)
    vec2 right = vec2(mod(gridPos.x + 1.0, size.x), gridPos.y);
    vec2 left = vec2(mod(gridPos.x - 1.0 + size.x, size.x), gridPos.y);
    vec2 up = vec2(gridPos.x, mod(gridPos.y + 1.0, size.y));
    vec2 down = vec2(gridPos.x, mod(gridPos.y - 1.0 + size.y, size.y));
    vec2 longRange = getLongRangeConnection(gridPos, size);
    
    neighborSum += getSpinAt(right, size);
    neighborSum += getSpinAt(left, size);
    neighborSum += getSpinAt(up, size);
    neighborSum += getSpinAt(down, size);
    neighborSum += getSpinAt(longRange, size);
  }
  else if (TOPOLOGY == 4) {
    // Random graph (5 random connections)
    for (int i = 0; i < 5; i++) {
      float h = hash(gridPos + vec2(float(i) * 10.0, float(i) * 5.0));
      float angle = h * 6.28318;
      float dist = 1.0 + floor(hash(gridPos + vec2(0.0, float(i))) * 5.0);
      
      vec2 offset = vec2(cos(angle), sin(angle)) * dist;
      vec2 neighbor = vec2(
        mod(gridPos.x + offset.x + size.x, size.x),
        mod(gridPos.y + offset.y + size.y, size.y)
      );
      
      neighborSum += getSpinAt(neighbor, size);
    }
  }
  
  // Calculate local energy (negative sum of neighboring spins * current spin * J)
  float energy = -J * spin * neighborSum;
  
  // Try a spin flip
  float flippedEnergy = -energy;
  
  // Calculate energy difference if we flipped
  float energyDiff = flippedEnergy - energy;
  
  // Metropolis algorithm: always accept if energy decreases, otherwise accept with probability e^(-ΔE/T)
  if (energyDiff <= 0.0 || random < exp(-energyDiff / TEMPERATURE)) {
    spin = -spin;
  }
  
  return spin;
}

void main() {
  // Normalize coordinates
  vec2 st = gl_FragCoord.xy / resolution.xy;
  
  // Calculate the cell size based on the shorter dimension
  float cellSize;
  vec2 numCells;
  
  if (resolution.x > resolution.y) {
    // Landscape orientation - height is limiting factor
    cellSize = 1.0 / float(GRID_SIZE);
    numCells = vec2(float(GRID_SIZE) * (resolution.x / resolution.y), float(GRID_SIZE));
  } else {
    // Portrait orientation - width is limiting factor
    cellSize = 1.0 / float(GRID_SIZE);
    numCells = vec2(float(GRID_SIZE), float(GRID_SIZE) * (resolution.y / resolution.x));
  }
  
  // Calculate grid position
  vec2 gridPos = floor(vec2(st.x * numCells.x, st.y * numCells.y));
  
  // Get spin at current grid position
  float spin = getSpin(gridPos, time, numCells);
  
  vec3 upColor, downColor;

  upColor = vec3(1.0, 1.0, 1.0);
  downColor = vec3(0.0, 0.0, 0.0);
  
  // Apply spin color
  vec3 color = mix(downColor, upColor, spin * 0.5 + 0.5);
  
  // Visualize hexagonal pattern for hexagonal lattice (subtle effect)
  if (TOPOLOGY == 2) {
    // Add subtle hexagonal pattern
    bool isEvenRow = mod(gridPos.y, 2.0) < 1.0;
    float hexFactor = isEvenRow ? 0.05 : -0.05;
    color *= 1.0 + hexFactor;
  }
  
  gl_FragColor = vec4(color, 1.0);
}