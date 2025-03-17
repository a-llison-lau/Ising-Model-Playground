import React, { useEffect, useRef } from "react";
import vertexShaderSource from "../shaders/vert.glsl?raw";
import fragmentShaderSource from "../shaders/frag.glsl?raw";

interface IsingModelSimulationProps {
  width?: number;
  height?: number;
  coupling?: number;
  field?: number;
  temperature?: number;
  speed?: number;
}

const IsingModelSimulation: React.FC<IsingModelSimulationProps> = ({
  coupling = 1.0,
  field = 0.0,
  temperature = 2.27,
  speed = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number>(0);
  const iterationRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  interface TextureData {
    textures: WebGLTexture[];
    framebuffers: WebGLFramebuffer[];
  }

  const texturesRef = useRef<TextureData>({ textures: [], framebuffers: [] });

  // Initialize WebGL
  const initWebGL = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    if (!gl) {
      console.error("WebGL not supported");
      return false;
    }

    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return false;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Quad covering the entire clip space
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Initialize textures for ping-pong rendering
    initTextures(gl, displayWidth, displayHeight);

    return true;
  };

  const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  // Link shaders into a program
  const createProgram = (
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  };

  // Initialize textures for ping-pong rendering
  const initTextures = (
    gl: WebGLRenderingContext,
    width: number,
    height: number
  ): void => {
    const textures: WebGLTexture[] = [];
    const framebuffers: WebGLFramebuffer[] = [];

    // Use either power-of-two dimensions or CLAMP_TO_EDGE
    const isPowerOf2Width = (width & (width - 1)) === 0;
    const isPowerOf2Height = (height & (height - 1)) === 0;
    const isPowerOf2 = isPowerOf2Width && isPowerOf2Height;

    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      if (!texture) continue;

      gl.bindTexture(gl.TEXTURE_2D, texture);

      // For non-power-of-2 textures, must use CLAMP_TO_EDGE
      if (!isPowerOf2) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      // Create random initial state for the simulation
      const data = new Uint8Array(width * height * 4);
      for (let j = 0; j < data.length; j++) {
        data[j] = Math.random() > 0.5 ? 255 : 0;
      }

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

      // Create a framebuffer for this texture
      const fbo = gl.createFramebuffer();
      if (!fbo) continue;

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );

      textures.push(texture);
      framebuffers.push(fbo);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    texturesRef.current = { textures, framebuffers };
  };

  // Handle resize to keep canvas dimensions in sync
  const handleResize = (): void => {
    if (!canvasRef.current || !glRef.current) return;

    const canvas = canvasRef.current;
    const gl = glRef.current;

    const dpr = window.devicePixelRatio || 1;

    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const { textures, framebuffers } = texturesRef.current;
      textures.forEach((texture) => gl.deleteTexture(texture));
      framebuffers.forEach((fbo) => gl.deleteFramebuffer(fbo));

      initTextures(gl, displayWidth, displayHeight);

      gl.viewport(0, 0, displayWidth, displayHeight);
    }
  };

  const render = (timestamp: number): void => {
    if (!canvasRef.current || !glRef.current || !programRef.current) return;

    const canvas = canvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;
    const { textures, framebuffers } = texturesRef.current;

    handleResize();

    const displayWidth = canvas.width;
    const displayHeight = canvas.height;

    previousTimeRef.current = timestamp;

    // Run multiple iterations per frame based on speed
    for (let step = 0; step < speed; step++) {
      const nextIteration = iterationRef.current + 1;
      iterationRef.current = nextIteration;

      // Set which textures to use for this iteration
      const sourceIndex = iterationRef.current % 2;
      const targetIndex = (iterationRef.current + 1) % 2;

      gl.useProgram(program);

      // Set uniform values
      const u_resolution = gl.getUniformLocation(program, "u_resolution");
      gl.uniform2f(u_resolution, displayWidth, displayHeight);

      const u_coupling = gl.getUniformLocation(program, "u_coupling");
      gl.uniform1f(u_coupling, coupling);

      const u_field = gl.getUniformLocation(program, "u_field");
      gl.uniform1f(u_field, field);

      const u_temperature = gl.getUniformLocation(program, "u_temperature");
      gl.uniform1f(u_temperature, temperature);

      const u_iteration = gl.getUniformLocation(program, "u_iteration");
      gl.uniform1f(u_iteration, iterationRef.current % 2);

      const u_random_seed = gl.getUniformLocation(program, "u_random_seed");
      gl.uniform1f(u_random_seed, Math.random());

      const a_position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(a_position);
      gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

      const u_spin = gl.getUniformLocation(program, "u_spin");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[sourceIndex]);
      gl.uniform1i(u_spin, 0);

      // First pass: Compute new spin states
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[targetIndex]);
      gl.viewport(0, 0, displayWidth, displayHeight);

      const u_pass = gl.getUniformLocation(program, "u_pass");
      gl.uniform1f(u_pass, 0.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Second pass: Render to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, displayWidth, displayHeight);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[targetIndex]);
      gl.uniform1i(u_spin, 0);

      gl.uniform1f(u_pass, 1.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const success = initWebGL();

      if (success) {
        handleResize();
        window.addEventListener("resize", handleResize);
        requestRef.current = requestAnimationFrame(render);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      if (glRef.current) {
        const gl = glRef.current;
        const { textures, framebuffers } = texturesRef.current;

        textures.forEach((texture) => gl.deleteTexture(texture));
        framebuffers.forEach((fbo) => gl.deleteFramebuffer(fbo));

        if (programRef.current) {
          gl.deleteProgram(programRef.current);
        }
      }
    };
  }, []);

  return (
    <div
      className="fixed top-0 right-0 h-full w-full bg-zinc-100 text-left"
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default IsingModelSimulation;
