import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';

interface SpineCharacterProps {
  x?: number;
  y?: number;
  scale?: number;
}

export default function SpineCharacter({ x = 100, y = 100, scale = 1 }: SpineCharacterProps) {
  return <SpineGLRenderer x={x} y={y} scale={scale} />;
}

// Simple 2D WebGL test implementation (working baseline)
const SpineGLRenderer = ({ x, y, scale }: SpineCharacterProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('✅ Loading WebGL test for mobile...');
    const timer = setTimeout(() => {
      console.log('✅ WebGL test ready for mobile');
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      console.log('🎮 Initializing WebGL test...');

      // Set viewport
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      // Set clear color (dark blue background)
      gl.clearColor(0.1, 0.1, 0.18, 1.0);

      // Create simple vertex shader
      const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec3 a_color;

        varying vec3 v_color;

        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_color = a_color;
        }
      `;

      // Create simple fragment shader
      const fragmentShaderSource = `
        precision mediump float;

        varying vec3 v_color;

        void main() {
          gl_FragColor = vec4(v_color, 1.0);
        }
      `;

      // Helper function to create shader
      function createShader(gl: ExpoWebGLRenderingContext, type: number, source: string) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Could not create shader');

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const error = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error('Shader compilation error: ' + error);
        }

        return shader;
      }

      // Create shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

      // Create shader program
      const program = gl.createProgram();
      if (!program) throw new Error('Could not create program');

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error('Program linking error: ' + error);
      }

      // Use the program
      gl.useProgram(program);

      // Get attribute and uniform locations
      const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
      const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');

      // Create a simple colorful triangle
      const vertices = new Float32Array([
        // Position (x, y)   // Color (r, g, b)
        0.0,  0.8,           1.0, 0.8, 0.0,  // Top vertex (gold)
       -0.8, -0.8,           1.0, 0.0, 0.0,  // Bottom-left (red)
        0.8, -0.8,           0.0, 1.0, 0.0,  // Bottom-right (green)
      ]);

      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Set up position attribute (2 floats per vertex)
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 5 * 4, 0);

      // Set up color attribute (3 floats per vertex, starting at offset 2*4 bytes)
      gl.enableVertexAttribArray(colorAttributeLocation);
      gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 5 * 4, 2 * 4);

      let rotation = 0;

      // Animation loop
      const animate = () => {
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Simple rotation by modifying vertices
        rotation += 0.02;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        // Rotate the triangle vertices
        const rotatedVertices = new Float32Array([
          // Rotate each vertex and keep original colors
          cos * 0.0 - sin * 0.6,   sin * 0.0 + cos * 0.6,    1.0, 0.8, 0.0,  // Top
          cos * -0.6 - sin * -0.6,  sin * -0.6 + cos * -0.6,  1.0, 0.0, 0.0,  // Bottom-left
          cos * 0.6 - sin * -0.6,   sin * 0.6 + cos * -0.6,   0.0, 1.0, 0.0,  // Bottom-right
        ]);

        // Update buffer with rotated vertices
        gl.bufferData(gl.ARRAY_BUFFER, rotatedVertices, gl.DYNAMIC_DRAW);

        // Draw the triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Present the frame
        gl.endFrameEXP();

        // Request next frame
        requestAnimationFrame(animate);
      };

      animate();
      console.log('🎮 WebGL test initialized successfully');

    } catch (err) {
      console.error('❌ Error initializing GL context:', err);
      setError(err instanceof Error ? err.message : 'Unknown GL error');
    }
  };

  if (isLoading) {
    return (
      <View style={{ padding: 20, backgroundColor: '#1a1a2e', borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Loading Simple WebGL Test...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20, backgroundColor: '#2e1a1a', borderRadius: 8 }}>
        <Text style={{ color: '#ff6b6b', textAlign: 'center' }}>
          GL Error: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: 200, height: 200, overflow: 'hidden', borderRadius: 8 }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
};