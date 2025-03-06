precision mediump float;

uniform float time;
uniform vec2 resolution;

// Parameters for the Ising model
uniform float TEMPERATURE ;      // Temperature parameter (higher = more randomness)
uniform float J;                // Coupling constant (positive = ferromagnetic)
const int GRID_SIZE = 128;           // Number of cells along the shorter dimension
uniform float EVOLUTION_SPEED;  // Speed of the simulation

// Hash function for pseudo-random number generation
float hash(vec2 p) {
  p = fract(p * vec2(123.45, 678.90));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Get spin state at grid position
float getSpin(vec2 gridPos, float t) {
  // Use position and time seed for randomized updates
  float random = hash(gridPos + floor(t * EVOLUTION_SPEED));
  
  // Get deterministic spin state based on grid position
  float spinSeed = hash(gridPos);
  float spin = step(0.5, spinSeed) * 2.0 - 1.0;
  
  // Get neighboring spins with periodic boundary conditions
  vec2 size = vec2(float(GRID_SIZE));
  if (resolution.x > resolution.y) {
    // Landscape mode - more cells horizontally
    size.x = float(GRID_SIZE) * (resolution.x / resolution.y);
  } else {
    // Portrait mode - more cells vertically
    size.y = float(GRID_SIZE) * (resolution.y / resolution.x);
  }
  
  vec2 right = vec2(mod(gridPos.x + 1.0, size.x), gridPos.y);
  vec2 left = vec2(mod(gridPos.x - 1.0 + size.x, size.x), gridPos.y);
  vec2 up = vec2(gridPos.x, mod(gridPos.y + 1.0, size.y));
  vec2 down = vec2(gridPos.x, mod(gridPos.y - 1.0 + size.y, size.y));
  
  float neighbor1 = step(0.5, hash(right)) * 2.0 - 1.0;
  float neighbor2 = step(0.5, hash(left)) * 2.0 - 1.0;
  float neighbor3 = step(0.5, hash(up)) * 2.0 - 1.0;
  float neighbor4 = step(0.5, hash(down)) * 2.0 - 1.0;
  
  // Calculate local energy (negative sum of neighboring spins * current spin * J)
  float energy = -J * spin * (neighbor1 + neighbor2 + neighbor3 + neighbor4);
  
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
  float spin = getSpin(gridPos, time);
  
  // Create a color scheme
  vec3 spinColor = vec3(spin * 0.5 + 0.5);
  vec3 color = mix(
    vec3(0.0, 0.0, 0.0),  // Color for spin down (-1)
    vec3(1.0, 1.0, 1.0),  // Color for spin up (+1)
    spinColor.r
  );
  
  gl_FragColor = vec4(color, 1.0);
}