import { THREE } from "@croquet/worldcore-three";
import snowflake from "../assets/textures/snowflake_1.png";

/**
 * Particles
 */

const parameters = {}
parameters.count = 2000;
parameters.randomness = 0.5;
parameters.randomnessPower = 3;
parameters.sizeMin = 1.0;
parameters.sizeMax = 4.0;
parameters.opacityMin = 0.1;
parameters.opacityMax = 0.4;
parameters.gravity = 25.0;

let geometry = null;
let material = null;
let points = null;

const wind = {
  current: 0,
  force: 0.1,
  target: 0.1,
  min: 0.1,
  max: 0.2,
  easing: 0.005
}

export function generateSnow( pixelRatio ) {
  /**
   * Geometry
   */
  geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(parameters.count * 3)
  const scales = new Float32Array(parameters.count * 1)
  const randomness = new Float32Array(parameters.count * 3)
  const speeds = new Float32Array(parameters.count * 3)
  const rotations = new Float32Array(parameters.count * 3)
  const opacities = new Float32Array(parameters.count * 1)

  for (let i = 0; i < parameters.count; i++)
  {
    const i3 = i * 3

    // Position
    positions[i3  ] = (Math.random() - 0.5) * 12
    positions[i3 + 1] = (Math.random() - 0.5) * 12
    positions[i3 + 2] = (Math.random() - 0.5) * 12

    // Randomness
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness

    // Random Positioning
    randomness[i3 + 0] = randomX
    randomness[i3 + 1] = randomY
    randomness[i3 + 2] = randomZ

    // Random Positioning
    opacities[i3 + 0] = Math.random() * (parameters.opacityMax - parameters.opacityMin) + parameters.opacityMin

    // Scale
    scales[i] = Math.random() * (parameters.sizeMax - parameters.sizeMin) + parameters.sizeMin

    // Speeds
    speeds[i3 + 0] =  1 + Math.random()
    speeds[i3 + 1] = Math.random() * (0.06 - 0.05) + 0.05
    speeds[i3 + 2] = Math.random() * (0.2 - 0.05) + 0.05

    // Rotations
    rotations[i3 + 0] = Math.random() * 2 * Math.PI
    rotations[i3 + 1] = Math.random() * 20
    rotations[i3 + 2] = Math.random() * 10
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3))
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 3))
  geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 3))
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))

  
  /**
   * Textures
   */
  const textureLoader = new THREE.TextureLoader();
  const particleTexture = textureLoader.load(snowflake); 

  
  /**
   * Material
   */
  material = new THREE.ShaderMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `precision mediump float;

attribute vec4 aPosition;
attribute float aOpacity;
attribute float aScale;
attribute vec3 aRotation;
attribute float aSize;
attribute vec3 aSpeed;

uniform float uTime;
uniform float uSize;
uniform float uGravity;
uniform vec3 uSpeed;
uniform vec3 uWorldSize;
uniform mat4 uProjection;
uniform float uWind;

varying float vRotation;
varying float vOpacity;

void main() {
    // Start with the object's transformation
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    
    vOpacity = aOpacity;
    vRotation = aRotation.x + uTime * aRotation.y;
    
    // Apply snow movement relative to the world position
    worldPosition.x = mod(worldPosition.x + uTime + uWind * aSpeed.x, uWorldSize.x * 2.0) - uWorldSize.x;
    worldPosition.y = mod(worldPosition.y - uTime * aSpeed.y * uGravity, uWorldSize.y * 2.0) - uWorldSize.y;
    worldPosition.x += (sin(uTime * aSpeed.z) * aRotation.z);
    worldPosition.z += cos(uTime * aSpeed.z) * aRotation.z;
    
    vec4 viewPosition = viewMatrix * worldPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    gl_PointSize = uSize * aScale;
    gl_PointSize *= (1.0 / -viewPosition.z);
}`,
    fragmentShader: `
      precision mediump float;
      varying float vOpacity;
      uniform sampler2D uTexture;

      varying float vRotation;

      void main() {

        vec2 rotated = vec2(
          cos(vRotation) * (gl_PointCoord.x - 0.5) + sin(vRotation) * (gl_PointCoord.y - 0.5) + 0.5,
          cos(vRotation) * (gl_PointCoord.y - 0.5) - sin(vRotation) * (gl_PointCoord.x - 0.5) + 0.5
        );

        vec4 snowflake = texture2D(uTexture, rotated);

        gl_FragColor = vec4(snowflake.rgb, snowflake.a * vOpacity);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 30 * pixelRatio },
      uSpeed: { value: new THREE.Vector3(0.0000001, 0.02, Math.random()) },
      uGravity: { value: parameters.gravity },
      uWorldSize: { value: new THREE.Vector3(6, 6, 6) },
      uTexture: { value: particleTexture },
      uRotation: { value: new THREE.Vector3(1, 1, 1) },
      uWind:{ value: 0 },
    }
  })

  /**
   * Points
   */
  points = new THREE.Points(geometry, material)
  return points;
}

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0;

export function tickSnow() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Wind Calculation
  wind.force += (wind.target - wind.force) * wind.easing;
  wind.current += wind.force * (deltaTime * 0.2);

  // Current Wind Uniform
  material.uniforms.uWind.value = wind.current;

  if (Math.random() > 0.995) {
    wind.target = (wind.min + Math.random() * (wind.max - wind.min)) * (Math.random() > 0.5 ? -1 : 1) * 100;
  }

  // Elapsed Time Uniform update
  material.uniforms.uTime.value = elapsedTime;
}