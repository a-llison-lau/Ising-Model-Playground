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

  // Ping-pong buffers and textures
  const fbRef = useRef<[WebGLFramebuffer | null, WebGLFramebuffer | null]>([
    null,
    null,
  ]);
  const textureRef = useRef<[WebGLTexture | null, WebGLTexture | null]>([
    null,
    null,
  ]);
  const currentBufferRef = useRef<number>(0);

  // State to manage shader parameters
  const [shaderParams, setShaderParams] = useState<ShaderParams>({
    TEMPERATURE: 0.5, // Adjusted for better phase transitions
    J: 1.0,
    EVOLUTION_SPEED: 0.5,
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

  // Helper function to create a shader
  const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not create shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error("Could not compile shader");
    }

    return shader;
  };

  // Helper function to create a program
  const createProgram = (
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) => {
    const program = gl.createProgram();
    if (!program) throw new Error("Could not create program");

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
  };

  // Initialize WebGL
  const initializeWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL context
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      antialias: false, // Disable antialiasing for performance
    });
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
    const previousStateLocation = gl.getUniformLocation(
      program,
      "previousState"
    );

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      console.error("Failed to create position buffer");
      return;
    }

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

        // Recreate ping-pong buffers and textures when canvas size changes
        createPingPongBuffers(gl, canvas.width, canvas.height);
      }
    };

    // Create ping-pong buffers and textures
    const createPingPongBuffers = (
      gl: WebGLRenderingContext,
      width: number,
      height: number
    ) => {
      // Clean up existing textures and framebuffers
      if (textureRef.current[0]) gl.deleteTexture(textureRef.current[0]);
      if (textureRef.current[1]) gl.deleteTexture(textureRef.current[1]);
      if (fbRef.current[0]) gl.deleteFramebuffer(fbRef.current[0]);
      if (fbRef.current[1]) gl.deleteFramebuffer(fbRef.current[1]);

      // Create two textures
      const texture1 = gl.createTexture();
      const texture2 = gl.createTexture();
      if (!texture1 || !texture2) {
        console.error("Failed to create textures");
        return;
      }

      // Configure both textures
      [texture1, texture2].forEach((texture) => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Allocate texture memory
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      });

      // Initialize texture1 with random spins (0 or 255)
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const value = Math.random() > 0.5 ? 255 : 0; // Random spin (0 or 255)
        data[i * 4] = value; // R
        data[i * 4 + 1] = value; // G
        data[i * 4 + 2] = value; // B
        data[i * 4 + 3] = 255; // A
      }
      gl.bindTexture(gl.TEXTURE_2D, texture1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
      );

      // Create two framebuffers
      const framebuffer1 = gl.createFramebuffer();
      const framebuffer2 = gl.createFramebuffer();
      if (!framebuffer1 || !framebuffer2) {
        console.error("Failed to create framebuffers");
        return;
      }

      // Attach texture1 to framebuffer1
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer1);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture1,
        0
      );

      // Attach texture2 to framebuffer2
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer2);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture2,
        0
      );

      // Explicitly initialize the textures by clearing the framebuffers
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Store references to framebuffers and textures
      fbRef.current = [framebuffer1, framebuffer2];
      textureRef.current = [texture1, texture2];

      // Reset current buffer index
      currentBufferRef.current = 0;
    };

    // Add resize listener
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Animation function
    const startTime = performance.now();
    const render = () => {
      // Calculate time
      const time = (performance.now() - startTime) / 1000;

      // Use our shader program
      gl.useProgram(program);

      // Get current and next buffer indices
      const currentIdx = currentBufferRef.current;
      const nextIdx = 1 - currentIdx;

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
        2,
        gl.FLOAT,
        false,
        0,
        0
      );

      // Set uniforms
      gl.uniform1f(timeUniformLocation, time);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      // Bind the current texture as input
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current[currentIdx]);
      gl.uniform1i(previousStateLocation, 0);

      // Render to the next framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbRef.current[nextIdx]);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Render to the canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Draw texture we rendered to
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current[nextIdx]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Swap buffers for next frame
      currentBufferRef.current = nextIdx;

      // Request next frame
      animationFrameId.current = requestAnimationFrame(render);
    };

    // Start rendering
    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId.current);

      // Ensure no pending frames are left
      gl.finish();

      // Clean up WebGL resources
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);

        // Clean up ping-pong resources
        if (textureRef.current[0]) gl.deleteTexture(textureRef.current[0]);
        if (textureRef.current[1]) gl.deleteTexture(textureRef.current[1]);
        if (fbRef.current[0]) gl.deleteFramebuffer(fbRef.current[0]);
        if (fbRef.current[1]) gl.deleteFramebuffer(fbRef.current[1]);
      }
    };
  };

  // Handle WebGL context loss and restoration
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL context lost");
      cancelAnimationFrame(animationFrameId.current);
    };

    const handleContextRestored = () => {
      console.log("WebGL context restored");
      initializeWebGL();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

  // Initialize WebGL on mount
  useEffect(() => {
    initializeWebGL();
  }, [shaderParams]);

  return (
    <div
      className="fixed top-0 right-0 h-full w-full bg-zinc-100 text-left"
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow text-sm">
        <div>Temperature: {shaderParams.TEMPERATURE.toFixed(1)}</div>
        <div>Coupling (J): {shaderParams.J.toFixed(1)}</div>
        <div>Speed: {shaderParams.EVOLUTION_SPEED.toFixed(1)}</div>
        <div>
          Topology:{" "}
          {
            ["Square", "Triangular", "Hexagonal", "Small-world", "Random"][
              shaderParams.TOPOLOGY
            ]
          }
        </div>
      </div>
    </div>
  );
}

export default Canvas;
