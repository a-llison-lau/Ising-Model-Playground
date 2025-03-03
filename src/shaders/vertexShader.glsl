attribute vec2 position;

void main() {
  // Convert from pixel coordinates to clip space (-1 to 1)
  gl_Position = vec4(position, 0.0, 1.0);
}