import { useEffect, useRef, useState } from "react";
import vertexShaderSource from "../shaders/vertexShader.glsl?raw";
import fragmentShaderSource from "../shaders/fragmentShader.glsl?raw";

// Define a type for shader parameters
type ShaderParams = {
  TEMPERATURE: number;
  J: number;
  EVOLUTION_SPEED: number;
  TOPOLOGY: number;
};

function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  // State to manage shader parameters
  const [shaderParams, setShaderParams] = useState<ShaderParams>({
    TEMPERATURE: 5.0,
    J: 1.0,
    EVOLUTION_SPEED: 2.0,
    TOPOLOGY: 0,
  });

  // Update function for shader parameters
  const updateShaderParams = (updates: Partial<ShaderParams>) => {
    setShaderParams((prev) => ({ ...prev, ...updates }));
  };

  // Expose update function to window for GUI interaction
  useEffect(() => {
    (window as any).updateShaderParams = updateShaderParams;
  }, []);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL context
    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    glContextRef.current = gl;

    // Create shader program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);
    programRef.current = program;

    // Look up where the vertex data needs to go
    const positionAttributeLocation = gl.getAttribLocation(program, "position");

    // Look up uniform locations
    const timeUniformLocation = gl.getUniformLocation(program, "time");
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "resolution"
    );
    const temperatureUniformLocation = gl.getUniformLocation(
      program,
      "TEMPERATURE"
    );
    const jUniformLocation = gl.getUniformLocation(program, "J");
    const evolutionSpeedUniformLocation = gl.getUniformLocation(
      program,
      "EVOLUTION_SPEED"
    );
    const topologyUniformLocation = gl.getUniformLocation(program, "TOPOLOGY");

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set geometry - just a simple full-screen quad (2 triangles)
    const positions = [
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Resize canvas and viewport
    const resizeCanvas = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      // Check if the canvas is not the same size
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Update the viewport
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Add resize listener
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Animation function
    const startTime = performance.now();
    const render = () => {
      // Calculate time
      const time = (performance.now() - startTime) / 1000;

      // Clear canvas
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use our shader program
      gl.useProgram(program);

      // Set shader parameters as uniforms
      gl.uniform1f(temperatureUniformLocation, shaderParams.TEMPERATURE);
      gl.uniform1f(jUniformLocation, shaderParams.J);
      gl.uniform1f(evolutionSpeedUniformLocation, shaderParams.EVOLUTION_SPEED);
      gl.uniform1i(topologyUniformLocation, shaderParams.TOPOLOGY);

      // Set up position attribute
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2, // 2 components per iteration
        gl.FLOAT, // the data is 32bit floats
        false, // don't normalize the data
        0, // 0 = move forward size * sizeof(type) each iteration to get the next position
        0 // start at the beginning of the buffer
      );

      // Set uniforms
      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Request next frame
      animationFrameId.current = requestAnimationFrame(render);
    };

    // Start rendering
    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId.current);

      // Clean up WebGL resources
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [shaderParams]);

  // Helper function to create a shader
  function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Could not create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error("Could not compile shader");
    }

    return shader;
  }

  function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) {
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Could not create program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      throw new Error("Could not link program");
    }

    return program;
  }

  return (
    <div
      className="fixed top-0 right-0 h-full w-full bg-zinc-100 text-left"
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export default Canvas;
