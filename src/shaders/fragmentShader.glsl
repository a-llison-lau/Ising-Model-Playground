precision mediump float;

uniform float time;
uniform vec2 resolution;

void main() {
  vec2 st = gl_FragCoord.xy / resolution.xy;
  
  // Create a simple color based on position and time
  vec3 color = vec3(st.x, st.y, sin(time) * 0.5 + 0.5);
  
  gl_FragColor = vec4(color, 1.0);
}