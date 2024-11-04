//------------------Labirynth---------------------------------------------------------------
// This is a simple example of a multi-player 3D shooter.
// It is loosely based upon the early Maze War game created at NASA Ames in 1973
// https://en.wikipedia.org/wiki/Maze_War and has elements of Pacman, The Colony and Dodgeball.
//------------------------------------------------------------------------------------------
// This is intended to be ported to the Multisynq for Unity platform. Most of this application
// can be easily translated to Unity. The only object that requires replicated computation is
// the missile which when fired must execute on all clients. It computes collisions with user
// avatars and the maze walls.
//------------------------------------------------------------------------------------------
// Changes:
// Minimal world - showing we exist. We get an alert when a new user joins.
// Add simple avatars w/ mouselook interface
// Add missiles and collision detection
// Fix textures, add powerup with fake glow, add wobble shader
// Better missiles. Maze walls are instanced. Generate the maze.
// Collision detection with walls for avatars and missiles.
// Columns, CSM lighting
// Added floor reflections, enhance lighting, fixed disappearing columns
// Added the horse weenie
// Changed sky, added uv coordinates to hexasphere
// Avatar & missile tests collision with columns
// Seasonal trees weenies
// Made the missiles glow, slowed it down
// Place player at random location when spawned
// Sound effects:
// Missile bounce sound
// - missile fire sound
// - ready to shoot sound and click when not ready
// - player enter/exit game
// - missile whoosh when it goes by
// Cell collected tone
// Fixed sounds not playing after a while
// Fixed getting stuck under the horse
// Restructured loaded instance management
// Added ivy to some walls
// Added color to instances
// Break the floor model into a grid of floor tiles
// You can only claim cells from one of your own cells
// You can't claim a corner - they are fixed to the season color.
// Preloaded assets (sounds, textures, models). This is done before the main
// render loop starts. It is still taking too long to complete loading.
// Display the claimed cells on a 2D minimap.
// Track your avatar's location on the minimap.
// Missiles are color coded by the player's season color.
// Rotated the minimap so that my season color is at the bottom.
// Made the corner cells darker to make them more obvious.
// The players spawn and respawn in their own corners.
// Resize the minimap when the window is resized.
// Players cannot be harmed while on those four tiles, but they can shoot back. Projectiles bounce.
// You can only shoot if you are on your own season color.
// You move 1.5 times faster when you are on your own color.
// Added a compass rose to the minimap.
// Missile/missile collision works.
//------------------------------------------------------------------------------------------
// To do:
// Add effects when you capture a cell.
// Shaders need to be "warmed-up" before they are used.
// If a user slices off a section of cells so that it is no longer connected to
// your tree, those cells revert to their original, null color. Use flood fill:
// https://www.geeksforgeeks.org/flood-fill-algorithm-implement-fill-paint/
// When you lose territory, players can actually see and hear it go away. Each cell
// would make a loss sound. But it would be quite fast - as each cell is lost - which
// alerts everyone to pay attention to the minimap.
// The iris of the eyes must match the season color.
// Hook up the clock - start with 5 minutes.
// Mobile controls:
// - Joystick on left side for movement
// - Joystick on right side for looking around and tap to shoot
// Add end game and effects.
// Need a rules screen at the start. See:
// https://docs.google.com/document/d/1qjPm6pxaejuq5KydRh0C6Honory8DLICO3jfQkpJotc/edit?usp=sharing
// Scoring, leaderboard - steal from Multiblaster
// Display your captured cells
// Add mobile controls
// Chat -broadcast messages to all players, colors are their team color.
//------------------------------------------------------------------------------------------
// Bugs:
// The avatar is probably visible to other players before you can see them on
// loading. Need to hide the new avatar until it is able to play.
// Sometimes, a delay will cause you to jump through a wall - including outside of
// the maze. This is very bad.
//------------------------------------------------------------------------------------------

import { App, StartWorldcore, ViewService, ModelRoot, ViewRoot,Actor, mix,
    InputManager, AM_Spatial, PM_Spatial, PM_Smoothed, Pawn, AM_Avatar, PM_Avatar, UserManager, User,
    toRad, q_yaw, q_pitch, q_axisAngle, v3_add, v3_sub, v3_normalize, v3_rotate, v3_scale, v3_distanceSqr } from "@croquet/worldcore-kernel";
import { THREE, ADDONS, PM_ThreeVisible, ThreeRenderManager, PM_ThreeCamera, PM_ThreeInstanced, ThreeInstanceManager } from "@croquet/worldcore-three";
import FakeGlowMaterial from './src/FakeGlowMaterial.js';
import apiKey from "./src/apiKey.js";

// Textures
//------------------------------------------------------------------------------------------
import sky from "./assets/textures/aboveClouds.jpg";
import missile_color from "./assets/textures/metal_gold_vein/metal_0080_color_2k.jpg";
import missile_normal from "./assets/textures/metal_gold_vein/metal_0080_normal_opengl_2k.png";
import missile_roughness from "./assets/textures/metal_gold_vein/metal_0080_roughness_2k.jpg";
import missile_displacement from "./assets/textures/metal_gold_vein/metal_0080_height_2k.png";
import missile_metalness from "./assets/textures/metal_gold_vein/metal_0080_metallic_2k.jpg";
/*
import power_color from "./assets/textures/metal_hex/metal_0076_color_2k.jpg";
import power_normal from "./assets/textures/metal_hex/metal_0076_normal_opengl_2k.png";
import power_roughness from "./assets/textures/metal_hex/metal_0076_roughness_2k.jpg";
import power_displacement from "./assets/textures/metal_hex/metal_0076_height_2k.png";
import power_metalness from "./assets/textures/metal_hex/metal_0076_metallic_2k.jpg";
*/
import marble_color from "./assets/textures/marble_checker/marble_0013_color_2k.jpg";
import marble_normal from "./assets/textures/marble_checker/marble_0013_normal_opengl_2k.png";
import marble_roughness from "./assets/textures/marble_checker/marble_0013_roughness_2k.jpg";
import marble_displacement from "./assets/textures/marble_checker/marble_0013_height_2k.png";

import corinthian_color from "./assets/textures/corinthian/concrete_0014_color_2k.jpg";
import corinthian_normal from "./assets/textures/corinthian/concrete_0014_normal_opengl_2k.png";
import corinthian_roughness from "./assets/textures/corinthian/concrete_0014_roughness_2k.jpg";
import corinthian_displacement from "./assets/textures/corinthian/concrete_0014_height_2k.png";

// 3D Models
//------------------------------------------------------------------------------------------
// https://free3d.com/3d-model/eyeball-3d-model-181166.html
import eyeball_glb from "./assets/eyeball.glb";
// https://free3d.com/3d-model/-doric-column--353773.html
import column_glb from "./assets/column2.glb";
// https://www.robscanlon.com/hexasphere/
import hexasphere_glb from "./assets/hexasphere.glb";
// https://optimesh.gumroad.com/l/SJpXC
import horse2_glb from "./assets/Horse_Copper2.glb";
// https://sketchfab.com/tochechka
import fourSeasonsTree_glb from "./assets/fourSeasonsTree.glb";
// https://sketchfab.com/dangry
import ivy_glb from "./assets/ivy2.glb";

// Shaders
//------------------------------------------------------------------------------------------
import fireballTexture from "./assets/textures/explosion.png";
import * as fireballFragmentShader from "./src/shaders/fireball.frag.js";
import * as fireballVertexShader from "./src/shaders/fireball.vert.js";

// Sounds
//------------------------------------------------------------------------------------------
import bounceSound from "./assets/sounds/bounce.wav";
import shootSound from "./assets/sounds/shot1.wav";
import shootFailSound from "./assets/sounds/ShootFail.wav";
import rechargedSound from "./assets/sounds/Recharge.wav";
import enterSound from "./assets/sounds/avatarEnter.wav";
import exitSound from "./assets/sounds/avatarLeave.wav";
import missileSound from "./assets/sounds/Warning.mp3";
import implosionSound from "./assets/sounds/Implosion.mp3";
import cellSound from "./assets/sounds/Ping.wav";

// Global Variables
//------------------------------------------------------------------------------------------
const PI_2 = Math.PI/2;
const PI_4 = Math.PI/4;
const MISSILE_LIFE = 4000;
const CELL_SIZE = 20;
const AVATAR_RADIUS = 4;
const MISSILE_RADIUS = 2;
const WALL_EPSILON = 0.01;
const MAZE_ROWS = 20;
const MAZE_COLUMNS = 20;
const MISSILE_SPEED = 0.50;

let csm; // CSM is Cascaded Shadow Maps
const seasons = {spring:{cell:{x:0,y:0}, angle:180+45, radians:Math.PI-PI_4, color:0xFFB6C1, color2:0xCC8A94, color3:0xB37780},
    summer: {cell: {x:0,y:18}, angle:270+45, radians:Math.PI+Math.PI*3/2-PI_4, color:0x90EE90, color2:0x65AA65, color3:0x508850},
    autumn: {cell:{x:18, y:18}, angle:0+45, radians:0-PI_4, color:0xFFE5B4, color2:0xCCB38B, color3:0xB39977},
    winter: {cell:{x:18, y:0}, angle:90+45, radians:Math.PI+PI_2-PI_4, color:0xA5F2F3, color2:0x73BFBF, color3:0x5AA5A5}};
// Minimap canvas
const minimapCanvas = document.createElement('canvas');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCtx.globalAlpha = 0.1;
minimapCanvas.width = 200;
minimapCanvas.height = 200;


function scaleMinimap() {
    const minimapDiv = document.getElementById('minimap');
    const height = Math.min(window.innerHeight, window.innerWidth);

    // Calculate size where diagonal is 1/3 of page height
    // For a square, diagonal = side * √2
    // So, side = diagonal / √2
    const diagonal = height / 2;
    const sideLength = diagonal / Math.sqrt(2);

    // Set the size
    minimapDiv.style.width = `${sideLength}px`;
    minimapDiv.style.height = `${sideLength}px`;
    minimapCanvas.style.width = `${sideLength}px`;
    minimapCanvas.style.height = `${sideLength}px`;
    compass.resize(sideLength/3);
}

let readyToLoad3D = false;
let readyToLoadTextures = false;
let readyToLoadSounds = false;
let eyeball;
let column;
let hexasphere;
let horse;
let trees;
let plants;
let ivy;

class Compass {
    constructor(size = 40) {
        this.element = document.getElementById('compass');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setSize(size);
        this.element.appendChild(this.canvas);
        this.draw(0);
    }

    setSize(size) {
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;
        this.canvas.width = size;
        this.canvas.height = size;
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.radius = (size / 2) - 2;
    }

    draw(angle) {
        const ctx = this.ctx;
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Save context for rotation
        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(-angle);
        // Draw direction indents
        const indentSize = this.radius * 0.15;
        const directions = [0, Math.PI/2, Math.PI, Math.PI*3/2];
        directions.forEach( dir => {
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(0, -this.radius + indentSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.rotate(Math.PI/2);
        });

        // Draw north (red) half of needle
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -this.radius + indentSize);
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw south (white) half of needle
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.radius - indentSize);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Restore context
        ctx.restore();
    }

    update(angle) {
        this.draw(angle);
    }

    resize(size) {
        this.setSize(size);
        this.draw(0);
    }
}
// Usage:
const compass = new Compass(40);
scaleMinimap();
// Update with angle in radians
// compass.update(Math.PI); // Point south
// compass.update(avatar.rotation.y); // Use avatar's rotation
// Resize if needed
// compass.resize(50); // Make it 50px

class CountdownTimer {
    constructor(durationMinutes = 8) {
        this.element = document.getElementById('countdown');
        this.timeRemaining = durationMinutes * 60; // Convert to seconds
        this.isRunning = false;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.tick();
        }
    }

    pause() {
        this.isRunning = false;
    }

    reset(minutes = 9) {
        this.timeRemaining = minutes * 60;
        this.updateDisplay();
        this.element.style.color = 'rgba(255, 255, 255, 0.9)'; // Reset color
    }

    tick() {
        if (!this.isRunning) return;

        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            this.updateDisplay();
            setTimeout(() => this.tick(), 1000);
        } else {
            this.onComplete();
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;

        // Remove padStart for minutes, keep it for seconds
        this.element.textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Color changes based on time remaining
        if (this.timeRemaining <= 30) {
            this.element.style.color = 'rgba(255, 50, 50, 0.9)';
        } else if (this.timeRemaining <= 60) {
            this.element.style.color = 'rgba(255, 255, 0, 0.9)';
        }
    }

    onComplete() {
        this.isRunning = false;
        this.element.style.color = 'rgba(255, 0, 0, 0.9)';
        // Add any completion logic here
    }
}

// Usage
const timer = new CountdownTimer(8);

// Start the countdown
timer.start();

// Sound Manager
//------------------------------------------------------------------------------------------
let soundSwitch = false; // turn sound on and off
let volume = 1;

const maxSound = 16;
const listener = new THREE.AudioListener();
const soundList = {};
const soundLoops = [];
const loopSoundVolume = 0.25;

export const playSound = function() {
    const audioLoader = new THREE.AudioLoader();

    function play(soundURL, parent3D, force, loop = false) {
        if (!force && !soundSwitch) return;
        if (soundList[soundURL]) playSoundOnce(soundList[soundURL], parent3D, force, loop);
    }
    return play;
}();

function playSoundOnce(sound, parent3D, force, loop = false) {
    // console.log("playSoundOnce", sound.count, maxSound, parent3D);
    if (!force && sound.count>maxSound) return;
    sound.count++;
    let mySound;
    if (parent3D) {
        mySound = new THREE.PositionalAudio( listener );  // listener is a global
        //mySound = new MyAudio( listener );  // listener is a global
        mySound.setRefDistance( 8 );
        mySound.setVolume( volume );
    }
    else {
        mySound = new THREE.Audio( listener );
        mySound.setVolume( volume * loopSoundVolume );
        soundLoops.push(mySound);
    }

    mySound.setBuffer( sound.buffer );
    mySound.setLoop(loop);
    if (parent3D) {
        parent3D.add(mySound);
        parent3D.mySound = mySound;
        mySound.onEnded = ()=> { sound.count--; mySound.removeFromParent(); };
    } else mySound.onEnded = ()=> { sound.count--; };

    mySound.play();
}

async function loadSounds() {
    const audioLoader = new THREE.AudioLoader();
    return Promise.all([
        audioLoader.loadAsync(bounceSound),
        audioLoader.loadAsync(shootSound),
        audioLoader.loadAsync(shootFailSound),
        audioLoader.loadAsync(rechargedSound),
        audioLoader.loadAsync(enterSound),
        audioLoader.loadAsync(exitSound),
        audioLoader.loadAsync(missileSound),
        audioLoader.loadAsync(implosionSound),
        audioLoader.loadAsync(cellSound),
    ]);
}
loadSounds().then( sounds => {
    readyToLoadSounds = true;
    console.log("sounds loaded-------------------");
    soundList[bounceSound] = {buffer:sounds[0], count:0};
    soundList[shootSound] = {buffer:sounds[1], count:0};
    soundList[shootFailSound] = {buffer:sounds[2], count:0};
    soundList[rechargedSound] = {buffer:sounds[3], count:0};
    soundList[enterSound] = {buffer:sounds[4], count:0};
    soundList[exitSound] = {buffer:sounds[5], count:0};
    soundList[missileSound] = {buffer:sounds[6], count:0};
    soundList[implosionSound] = {buffer:sounds[7], count:0};
    soundList[cellSound] = {buffer:sounds[8], count:0};
});

// Load 3D Models
//------------------------------------------------------------------------------------------
async function modelConstruct() {
    const gltfLoader = new ADDONS.GLTFLoader();
    const dracoLoader = new ADDONS.DRACOLoader();
    dracoLoader.setDecoderPath('./src/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    return [eyeball, column, ivy, hexasphere, horse, trees] = await Promise.all( [
        // add additional GLB files to load here
        gltfLoader.loadAsync( eyeball_glb ),
        gltfLoader.loadAsync( column_glb ),
        gltfLoader.loadAsync( ivy_glb ),
        gltfLoader.loadAsync( hexasphere_glb ),
        gltfLoader.loadAsync( horse2_glb ),
        gltfLoader.loadAsync( fourSeasonsTree_glb ),
    ]);
}
const instances = {};
const materials = {};
const geometries = {};
// Floor cell instance geometry
geometries.floor = new THREE.PlaneGeometry(20,20,2,2);
geometries.floor.rotateX(toRad(-90));

modelConstruct().then( () => {
    readyToLoad3D = true;
    console.log("models loaded-------------------");
    instances.column = column.scene.children[0];
    instances.column.geometry.scale(0.028,0.028,0.028);
    instances.column.geometry.rotateX(-PI_2);
    instances.ivy0 = ivy.scene.children[0];
    instances.ivy1 = ivy.scene.children[1];
    instances.ivy0.geometry.scale(8,5,4);
    instances.ivy1.geometry.scale(8,5,4);
    instances.ivy0.geometry.translate(0,3.5,0);
    instances.hexasphere = hexasphere.scene.children[0].children[0];
    instances.hexasphere.geometry.scale(0.05,0.05,0.05);
    fixUV(instances.hexasphere.geometry);
    plants = {spring: new THREE.Group(), summer: new THREE.Group(), autumn: new THREE.Group(), winter: new THREE.Group()};
    horse = horse.scene.clone();
    horse.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });

    trees.scene.children.forEach(node => {
        if (node.name) {
            if (node.name.includes("spring")) plants.spring.add(node.clone());
            else if (node.name.includes("summer")) plants.summer.add(node.clone());
            else if (node.name.includes("fall")) plants.autumn.add(node.clone());
            else if (node.name.includes("winter")) plants.winter.add(node.clone());
        }
    });
    plants.spring.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0); } });
    plants.summer.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
    plants.autumn.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
    plants.winter.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
});
function fixUV(geometry) {
    // Angle around the Y axis, counter-clockwise when looking from above.
    function azimuth( vector ) { return Math.atan2( vector.z, -vector.x ); }

    // Angle above the XZ plane.
    function inclination( vector ) {return Math.atan2( -vector.y, Math.sqrt( ( vector.x * vector.x ) + ( vector.z * vector.z ) ) ); }

    const uvBuffer = [];
    const vertex = new THREE.Vector3();
    const positions = geometry.getAttribute('position').array;
    // console.log("fixUV", positions);
    for ( let i = 0; i < positions.length; i += 3 ) {

        vertex.x = positions[ i + 0 ];
        vertex.y = positions[ i + 1 ];
        vertex.z = positions[ i + 2 ];

        const u = azimuth( vertex ) / 2 / Math.PI + 0.5;
        const v = inclination( vertex ) / Math.PI + 0.5;
        uvBuffer.push( u, 1 - v );
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvBuffer, 2));
}
// Create fireball material
//------------------------------------------------------------------------------------------
let fireMaterial;
new THREE.TextureLoader().load(fireballTexture, texture => {
    fireMaterial = new THREE.ShaderMaterial( {
            uniforms: {
                tExplosion: { value: texture },
                time: { value: 0.0 },
                tOpacity: { value: 1.0 }
            },
            vertexShader: fireballVertexShader.vertexShader(),
            fragmentShader: fireballFragmentShader.fragmentShader(),
            side: THREE.DoubleSide
        } );
    });

let sky_t, missile_color_t, missile_normal_t, missile_roughness_t, missile_displacement_t, missile_metalness_t,
//    power_color_t, power_normal_t, power_roughness_t, power_displacement_t, power_metalness_t,
    marble_color_t, marble_normal_t, marble_roughness_t, marble_displacement_t,
    corinthian_color_t, corinthian_normal_t, corinthian_roughness_t, corinthian_displacement_t;

async function textureConstruct() {
    ["hexasphere", "wall", "floor"].forEach( name => {
        const material = new THREE.MeshStandardMaterial();
        materials[name] = material;
    });

    const textureLoader = new THREE.TextureLoader();

    return [sky_t, missile_color_t, missile_normal_t, missile_roughness_t, missile_displacement_t, missile_metalness_t,
    // power_color_t, power_normal_t, power_roughness_t, power_displacement_t, power_metalness_t,
     marble_color_t, marble_normal_t, marble_roughness_t, marble_displacement_t,
     corinthian_color_t, corinthian_normal_t, corinthian_roughness_t, corinthian_displacement_t
    ] = await Promise.all( [
        textureLoader.loadAsync(sky),
        textureLoader.loadAsync(missile_color),
        textureLoader.loadAsync(missile_normal),
        textureLoader.loadAsync(missile_roughness),
        textureLoader.loadAsync(missile_displacement),
        textureLoader.loadAsync(missile_metalness),
        // textureLoader.loadAsync(power_color),
        // textureLoader.loadAsync(power_normal),
        // textureLoader.loadAsync(power_roughness),
        // textureLoader.loadAsync(power_displacement),
        // textureLoader.loadAsync(power_metalness),
        textureLoader.loadAsync(marble_color),
        textureLoader.loadAsync(marble_normal),
        textureLoader.loadAsync(marble_roughness),
        textureLoader.loadAsync(marble_displacement),
        textureLoader.loadAsync(corinthian_color),
        textureLoader.loadAsync(corinthian_normal),
        textureLoader.loadAsync(corinthian_roughness),
        textureLoader.loadAsync(corinthian_displacement),
    ]);
}

textureConstruct().then( () => {
    readyToLoadTextures = true;
    console.log("textures loaded-------------------");
    complexMaterial({
        colorMap: missile_color_t,
        normalMap: missile_normal_t,
        roughnessMap: missile_roughness_t,
        metalnessMap: missile_metalness_t,
        displacementMap: missile_displacement_t,
        repeat: [1.5,1],
        displacementScale: 0.1,
        displacementBias: -0.05,
        side: THREE.DoubleSide,
        name: "hexasphere"
    });
/*
    complexMaterial({
        colorMap: power_color_t,
        normalMap: power_normal_t,
        roughnessMap: power_roughness_t,
        metalnessMap: power_metalness_t,
        displacementMap: power_displacement_t,
        repeat: [1.5,1],
        displacementScale: 0.1,
        displacementBias: -0.05,
        name: "power"
    });
*/
    complexMaterial({
        colorMap: corinthian_color_t,
        normalMap: corinthian_normal_t,
        roughnessMap: corinthian_roughness_t,
        displacementMap: corinthian_displacement_t,
        displacementScale: 1.5,
        displacementBias: -0.4,
        anisotropy: 4,
        repeat: [2, 1],
        name: "wall"
    });

    complexMaterial({
        colorMap: marble_color_t,
        normalMap: marble_normal_t,
        roughnessMap: marble_roughness_t,
        displacementMap: marble_displacement_t,
        anisotropy: 4,
        metalness: 0.1,
        repeat: [1, 1],
        transparent: true,
        opacity: 0.8,
        name: "floor"
    });
});

// Create complex materials
//------------------------------------------------------------------------------------------
function complexMaterial(options) {
    const material = materials[options.name];
    const repeat = options.repeat || [1,1];
    let map = options.colorMap;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = options.anisotropy || 4;
    map.repeat.set( ...repeat );
    map.encoding = THREE.SRGBColorSpace;
    material.map = options.colorMap;
    material.needsUpdate = true;

    if (options.normalMap) {
        map = options.normalMap;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.normalMap = map;
        material.needsUpdate = true;
        if (options.normalScale) material.normalScale.set(options.normalScale);
        //console.log(options.name,"normalMap", map);
    }
    if (options.roughnessMap) {
        map = options.roughnessMap;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.roughnessMap = map;
        if (options.roughness) material.roughness = options.roughness;
        material.needsUpdate = true;
        //console.log(options.name,"roughnessMap", map);
    }
    if (options.metalnessMap) {
        map = options.metalnessMap;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.metalnessMap = map;
        if (options.metalness) material.metalness = options.metalness;
        material.needsUpdate = true;
        //console.log(options.name,"metalnessMap", map);
    }
    if (options.displacementMap) {
        map = options.displacementMap;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.displacementMap = map;
        if (options.displacementScale) material.displacementScale = options.displacementScale;
        if (options.displacementBias) material.displacementBias = options.displacementBias;
        material.needsUpdate = true;
        //console.log(options.name,"displacementMap", map);
    }
    if (options.emissiveMap) {
        map = options.emissiveMap;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        map.encoding = THREE.SRGBColorSpace;
        material.emissiveMap = map;
        if (options.emissiveIntensity) material.emissiveIntensity = options.emissiveIntensity;
        material.needsUpdate = true;
        //console.log(options.name,"emissiveMap", map);
    }
    if (options.emissive) material.emissive = options.emissive; // this is the color of the emissive object
    if (options.name) material.name = options.name;
    if (options.transparent) material.transparent = options.transparent;
    if (options.opacity) material.opacity = options.opacity;
    if (options.side) material.side = options.side;
    material.needsUpdate = true;
    return material;
}

// Maze Generator
// This generates a (mostly) braided maze. That is a kind of maze that should have no dead ends.
// This actually does have dead ends on the edges, but I decided to leave it as is.
//------------------------------------------------------------------------------------------
class MazeActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init(options);
        this.rows = options._rows || 20;
        this.columns = options._columns || 20;
        this.cellSize = options._cellSize || 20;
        this.createMaze(this.rows,this.columns);
        this.constructMaze();
    }

    createMaze(width, height) {
      this.map = [];
      this.DIRECTIONS = {
        'N' : { dy: -1, opposite: 'S' },
        'S' : { dy:  1, opposite: 'N' },
        'E' : { dx:  1, opposite: 'W' },
        'W' : { dx: -1, opposite: 'E' }
      };
      this.WIDTH = width || 20;
      this.HEIGHT = height || 20;
      this.prefill();
      this.carve(this.WIDTH/2, this.HEIGHT/2, 'N');
      //console.log(this.output()); // if braid making holes?
      this.braid();
      this.clean();
      console.log("New Maze");
      console.log(this.output());
    }

    // initialize it with all walls on
    prefill() {
      for (let x = 0; x < this.WIDTH; x++) {
        this.map[x] = [];
        for (let y = 0; y < this.HEIGHT; y++) {
          this.map[x][y] = {};
        }
      }
    }

    // shuffle which direction to search
    shuffle(o) {
      for (let j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
    }

    // carve away a wall - don't go anywhere we have already been
    carve(x0, y0, direction) {
        const x1 = x0 + (this.DIRECTIONS[direction].dx || 0),
          y1 = y0 + (this.DIRECTIONS[direction].dy || 0);

      if (x1 === 0 || x1 === this.WIDTH || y1 === 0 || y1 === this.HEIGHT) {
        return;
      }

      if ( this.map[x1][y1].seen ) {
        return;
      }

      this.map[x0][y0][ direction ] = true;
      this.map[x1][y1][ this.DIRECTIONS[direction].opposite ] = true;
      this.map[x1][y1].seen = true;

      const directions = this.shuffle([ 'N', 'S', 'E', 'W' ]);
      for (let i = 0; i < directions.length; i++) {
        this.carve(x1, y1, directions[i]);
      }
    }

    // remove cull-de-sacs. This is incomplete, a few may remain along the edges
    braid() {
      for (let y = 2; y < this.HEIGHT-1; y++) {
        for (let x = 2; x < this.WIDTH-1; x++) {

          if (x>1 && !(this.map[x][y].S || this.map[x][y].E || this.map[x][y].N)) {
            this.map[x][y].E = true;
            this.map[x+1][y].W = true;
          }
          if (y>1 && !(this.map[x][y].E || this.map[x][y].N || this.map[x][y].W)) {
            this.map[x][y].N = true;
            this.map[x][y-1].S = true;
          }
          if (!(this.map[x][y].N || this.map[x][y].W || this.map[x][y].S)) {
            this.map[x][y].W = true;
            this.map[x-1][y].E = true;
          }
          if (!(this.map[x][y].W || this.map[x][y].S || this.map[x][y].W)) {
            this.map[x][y].S = true;
            this.map[x][y+1].N = true;
          }
        }
      }
    }

    // dump most of the data - don't need it anymore
    clean() {
        for (let y = 0; y < this.HEIGHT; y++) {
            for (let x = 0; x < this.WIDTH; x++) {
            delete this.map[x][y].seen;
            }
        }

        // the horse is in the center of the maze so add walls around it and remove walls nearby
        // a value of false means there is a wall
        const cell = this.map[11][11];
        cell.N = cell.S = cell.E = cell.W = false;
        this.map[11][10].S = this.map[11][12].N = false;
        this.map[10][11].E = this.map[12][11].W = false;

        this.map[10][10].S = this.map[10][11].N = this.map[10][11].S = this.map[10][12].N = true;
        this.map[12][10].S = this.map[12][11].N = this.map[12][11].S = this.map[12][12].N = true;
        this.map[10][10].E = this.map[11][10].W = this.map[11][10].E = this.map[12][10].W = true;
        this.map[10][12].E = this.map[11][12].W = this.map[11][12].E = this.map[12][12].W = true;

        const clearCorner = (x,y, season) => {
            this.map[x+1][y+2].N = this.map[x+1][y+1].S =
            this.map[x+2][y+2].N = this.map[x+2][y+1].S = true;
            this.map[x+1][y+1].E = this.map[x+2][y+1].W =
            this.map[x+1][y+2].E = this.map[x+2][y+2].W = true;
            this.setCornerSeason(x,y,season);
        };

        clearCorner(0,0, "spring");
        clearCorner(this.WIDTH-3,0,"winter");
        clearCorner(0,this.HEIGHT-3,"summer");
        clearCorner(this.WIDTH-3,this.HEIGHT-3,"autumn");
    }

    setCornerSeason(x,y, season) {
        // set the corners of the cell to the season
        const cell = this.map[x][y];
        if (cell.floor) { // only do this if the floor exists
            // console.log("setColor", cell, x,y, season);
            this.map[x][y].season = season;
            this.map[x][y].floor.setColor(seasons[season].color3);
            this.map[x+1][y].season = season;
            this.map[x+1][y].floor.setColor(seasons[season].color3);
            this.map[x][y+1].season = season;
            this.map[x][y+1].floor.setColor(seasons[season].color3);
            this.map[x+1][y+1].season = season;
            this.map[x+1][y+1].floor.setColor(seasons[season].color3);
        }
        else this.future(100).setCornerSeason(x,y,season);
    }

    // you can't claim a corner
    checkCornersSeason(x, y) {
        //console.log("checkCornersSeason", x, y, this.map[x][y].season, x<2 && y<2);
        if ( x < 2 && y < 2 ) return this.map[x][y].season;
        if ( x < 2 && y >= this.HEIGHT-3 ) return this.map[x][y].season;
        if ( x >= this.WIDTH-3 && y < 2 ) return this.map[x][y].season;
        if ( x >= this.WIDTH-3 && y >= this.HEIGHT-3 ) return this.map[x][y].season;
        return false;
    }

    // this lets me see the maze in the console
    output() {
      let output = '\n';
      for (let y = 0; y < this.HEIGHT; y++) {
        for (let x = 0; x < this.WIDTH; x++) {
          if (x>0)output += ( this.map[x][y].S ? ' ' : '_' );
          output += ( this.map[x][y].E ? ' ' : y===0?' ':'|' );
        }
        output += '\n';
      }
      output = output.replace(/_ /g, '__');
      return output;
    }

    setSeason(x,y, season) {
        // console.log("setSeason", x,y, season);
        const cell = this.map[x-1][y-1];
        if ( season !== cell.season ) {
            cell.season = season;
            //const  flicker = PointFlickerActor.create({parent: cell.floor, translation: [0,6.5,0], color: seasons[season].color});
            //flicker.future(500).destroy();
            cell.floor.setColor(seasons[season].color);
            return true;
        }
        return false;
    }

    getSeason(x,y) {
        return this.map[x-1][y-1].season;
    }

    getCellColor(x,y) {
        const cell = this.map[x-1][y-1];
        return cell.season ? seasons[cell.season].color : 0xFFFFFF;
    }

    constructMaze() {
        const r = q_axisAngle([0,1,0],PI_2);
        const ivyRotation = q_axisAngle([0,1,0],Math.PI);
        for (let y = 0; y < this.rows; y++) {
          for (let x = 0; x < this.columns; x++) {
            this.map[x][y].floor = InstanceActor.create({name:"floor", translation: [x*CELL_SIZE+CELL_SIZE/2, 0, y*CELL_SIZE+CELL_SIZE/2]});
           // south walls
            if (!this.map[x][y].S && x>0) {
                const t = [x*this.cellSize - this.cellSize/2, 0, y*this.cellSize];
                const wall = WallActor.create({parent: this, translation: t});

                if (Math.random() < 0.25) {
                    InstanceActor.create({name: "ivy0", parent: wall});
                    InstanceActor.create({name: "ivy1", parent: wall});
                    InstanceActor.create({name: "ivy0", parent: wall, rotation:ivyRotation});
                    InstanceActor.create({name: "ivy1", parent: wall, rotation:ivyRotation});
                }

            }
            // east walls
            if (!this.map[x][y].E && y>0) {
                const t = [x*this.cellSize, 0, (y+1)*this.cellSize - 3*this.cellSize/2];
                const wall = WallActor.create({parent: this, translation: t, rotation: r});

                if (Math.random() < 0.25) {
                    InstanceActor.create({name: "ivy0", parent: wall});
                    InstanceActor.create({name: "ivy1", parent: wall});
                    InstanceActor.create({name: "ivy0", parent: wall, rotation:ivyRotation});
                    InstanceActor.create({name: "ivy1", parent: wall, rotation:ivyRotation});
                }
            }
        }
      }
    }
 }
MazeActor.register("MazeActor");

// BaseActor
// This is the ground plane.
//------------------------------------------------------------------------------------------
class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}
}
BaseActor.register('BaseActor');

// BasePawn
// This is the ground of the world. This uses a simple transparent tile texture with a
// reflecting mirror just beneath it.
//------------------------------------------------------------------------------------------
class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.mirrorGeometry = new THREE.PlaneGeometry((MAZE_ROWS-1)*CELL_SIZE, (MAZE_COLUMNS-1)* CELL_SIZE);
        const mirror = new ADDONS.Reflector( this.mirrorGeometry, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0xb5b5b5
        } );
        mirror.position.set(-CELL_SIZE/2, -0.1, -CELL_SIZE/2);
        mirror.rotateX( -PI_2 );
        const group = new THREE.Group();
        group.add( mirror );

        this.setRenderObject(group);
    }
}
BasePawn.register("BasePawn");

// My Model Root
// Construct the game world
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        const xOffset = (MAZE_ROWS*CELL_SIZE)/2;
        const zOffset = (MAZE_COLUMNS*CELL_SIZE)/2;
        this.base = BaseActor.create({ translation:[xOffset,0,zOffset]});
        this.maze = MazeActor.create({translation: [0,5,0], rows: MAZE_ROWS, columns: MAZE_COLUMNS, cellSize: CELL_SIZE});
        for (let y = 0; y < MAZE_ROWS; y++) {
            for (let x = 0; x < MAZE_COLUMNS; x++) {
                const t = [x*CELL_SIZE, 0, y*CELL_SIZE];
                InstanceActor.create({name:"column", color:0xFFA07A,translation: t});
            }
        }
        this.horse = HorseActor.create({translation:[210.9,10,209.70], scale:[8.75,8.75,8.75]});
        const s = 9.0;
        this.spring = PlantActor.create({plant:"spring",translation: [20, 0.5, 20], scale:[s,s,s]});
        this.summer = PlantActor.create({plant:"summer",translation: [20, 0.5, 360], scale:[s,s,s]});
        this.autumn = PlantActor.create({plant:"autumn",translation: [360, 0.5, 360], scale:[s,s,s]});
        this.winter = PlantActor.create({plant:"winter",translation: [360, 0.5, 20], scale:[s,s,s]});
        this.skyAngle = 0;

        this.rotateSky();
    }

    rotateSky() {
        this.skyAngle += 0.001;
        if (this.skyAngle > 2*Math.PI) this.skyAngle -= 2*Math.PI;
        this.publish("root","rotateSky", this.skyAngle);
        this.future(100).rotateSky();
    }
}
MyModelRoot.register("MyModelRoot");

// MyViewRoot
// Construct the visual world
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, AvatarManager, ThreeInstanceManager];
    }

    onStart() {
        this.buildView();
        console.log("MyViewRoot onStart", this);
        this.skyRotation = new THREE.Euler(0, 0, 0);
        this.subscribe("root", "rotateSky", this.rotateSky);
        this.subscribe("input", "resize", scaleMinimap);
    }

    buildView() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        THREE.ColorManagement.enabled = true; // or false
        rm.renderer.useLegacyLights = false; // or true
        rm.doRender = false;
        rm.camera.add( listener );
        rm.listener = listener;
        rm.renderer.shadowMap.enabled = true;
        rm.renderer.shadowMap.type = THREE.PCFShadowMap;
        rm.renderer.toneMapping = THREE.ReinhardToneMapping;
        const ambientLight = new THREE.AmbientLight( 0xffffff, 1.5 );
        rm.scene.add( ambientLight );
        const blueLight = new THREE.DirectionalLight( 0x446699, 2.5 );
        blueLight.position.set( -1, -1, 1 ).normalize().multiplyScalar( -200 );
        rm.scene.add( blueLight );
        const redLight = new THREE.DirectionalLight( 0x995533, 2.5 );
        redLight.position.set( -1, -1, -0.5 ).normalize().multiplyScalar( -200 );
        rm.scene.add( redLight );
        csm = new ADDONS.CSM( {
            maxFar: 2000,
            cascades: 4,
            mode: 'practical',
            shadowMapSize: 2048,
            shadowBias: 0.0,
            lightDirection: new THREE.Vector3( -1, -1, -0.5 ).normalize(),
            camera: rm.camera,
            parent: rm.scene,
        } );
        this.buildSky();
    }

    buildSky() {
        if (readyToLoadTextures) {
            const rm = this.service("ThreeRenderManager");
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(sky_t);
            skyEnvironment.encoding = THREE.LinearSRGBColorSpace;
            rm.scene.background = skyEnvironment.texture;
        } else this.future(100).buildSky();
    }

    rotateSky(angle) {
        const rm = this.service("ThreeRenderManager");
        this.skyRotation.y = angle;
        rm.scene.backgroundRotation = this.skyRotation;
    }

    update(time, delta) {
        super.update(time, delta);
        if (readyToLoad3D && readyToLoadTextures && readyToLoadSounds) {
            const rm = this.service("ThreeRenderManager");
            rm.doRender = true;
        }
        if ( csm ) csm.update();
    }
}

// AvatarActor
// This is you. Most of the control code for the avatar is in the pawn.
// The AvatarActor has minimal need for replicated state except for user events.
//------------------------------------------------------------------------------------------
class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {
    get pawn() { return "AvatarPawn" }

    init(options) {
        super.init(options);
        this.isCollider = true;
        this.isAvatar = true;
        this.canShoot = true;
        this.radius = AVATAR_RADIUS;
        this.inCorner = true;
        this.eyeball = EyeballActor.create({parent: this});
        this.highGear = 1.0;
        this.listen("shootMissile", this.shootMissile);
        this.listen("claimCell", this.claimCell);
    }

    get season() {return this._season || "spring"}

    get color() {return seasons[this.season].color}

    claimCell(data) {
        const mazeActor = this.wellKnownModel("ModelRoot").maze;
        // only claim the cell if it is not already yours
        const seasonCorner = mazeActor.checkCornersSeason(data.x-1, data.y-1);
        this.inCorner = seasonCorner === this.season;
        if (mazeActor.map[data.x-1][data.y-1].season !== this.season) {
            this.highGear = 1.0;
            // if the cell you are moving from is yours, then you can claim it
            if (data.lastX && mazeActor.map[data.lastX-1][data.lastY-1].season === this.season) {
                // set the season of the cell you are moving to
                if (!seasonCorner && mazeActor.setSeason(data.x, data.y, this.season)) {
                    this.say("claimCellUpdate", {x:data.x, y:data.y, color:seasons[this.season].color});
                }
            }
        } else this.highGear = 1.5;
    }

    shootMissile() {
        console.log("AvatarActor shootMissile");
        this.canShoot = false;
        this.say("shootMissileSound", this.id);
        this.future(MISSILE_LIFE).reloadMissile();
        MissileActor.create({avatar: this, color: seasons[this.season].color2});
    }

    reloadMissile() {
        this.say("recharged");
        this.canShoot = true;
    }

    kill() {
        console.log("testCollision", this.id, "KILLED");
        FireballActor.create({parent: this, radius:this.radius});
        this.future(1000).respawn();
    }

    respawn() {
        const t = [CELL_SIZE*seasons[this.season].cell.x+10,6.5,CELL_SIZE*seasons[this.season].cell.y+10];
        const angle = Math.PI*2*seasons[this.season].angle/360;
        const r = q_axisAngle([0,1,0],angle);
        this.set({translation: t, rotation: r});
        this.say("respawn", {t, r, angle});
    }
}
AvatarActor.register('AvatarActor');

// Eyeball Actor/Pawn
// Tracks the orientation of the camera so others see where you are looking.
//------------------------------------------------------------------------------------------
class EyeballActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "EyeballPawn" }
}
EyeballActor.register('EyeballActor');

class EyeballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCamera) {

    constructor(actor) {
        super(actor);
        this.radius = AVATAR_RADIUS;
        this.pitch = q_pitch(this.rotation);
        this.pitchQ = q_axisAngle([1,0,0], this.pitch);
        if ( !this.parent.isMyAvatar ) {
            this.load3D();
        } else this.parent.eyeball = this;
        playSound( enterSound, this.renderObject );
        this.shootNow = true;
    }

    load3D() {
        if (this.doomed) return;
        if (readyToLoad3D && eyeball) {
            this.eye = eyeball.scene.clone();
            this.eye.scale.set(40,40,40);
            this.eye.rotation.set(0,Math.PI,0);
            this.eye.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; } });
            this.group = new THREE.Group();
            this.group.add(this.eye);
            this.setRenderObject(this.group);
        } else this.future(100).load3D();
    }

    update(time, delta) {
        super.update(time, delta);
        if ( this.parent.isMyAvatar ) this.refreshCameraTransform();
    }

    destroy() {
        super.destroy();
        if (this.renderObject) {
            playSound( exitSound );
            this.destroy3D( this.renderObject );
        }
    }

    destroy3D( obj3D ) {
        obj3D.traverse( obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}
EyeballPawn.register("EyeballPawn");

// AvatarPawn
// The avatar is designed to instantly react to user input and the publish those changes
// so other users are able to see and interact with this avatar. Though there will be some latency
// between when you see your actions and the other users do, this should have a minimal
// impact on gameplay.
//------------------------------------------------------------------------------------------
class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar) {

    constructor(actor) {
        super(actor);
        this.isAvatar = true;
        this.radius = actor.radius;
        this.yaw = q_yaw(this.rotation);
        compass.update(this.yaw + seasons[this.actor.season].radians);
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
        this.service("AvatarManager").avatars.add(this);
        this.listen("shootMissileSound", this.didShootSound);
        this.listen("recharged", this.rechargedSound);
        this.listen("claimCellUpdate", this.claimCellUpdate);
        this.listen("respawn", this.respawn);
        this.subscribe(this.viewId, "synced", this.handleSynced);
    }

    handleSynced() {
        console.log("session is synced - enable sound");
        soundSwitch = true;
    }

    destroy() {
        super.destroy();
        this.service("AvatarManager").avatars.delete(this);
    }

    respawn(data) {
        console.log("AvatarPawn respawn", data);
        this.positionTo(data.t, data.r);
        //this.set({translation: data.t, rotation: data.r});
        this.yaw = data.angle;
        compass.update(this.yaw + seasons[this.actor.season].radians);
        this.yawQ = data.r;
    }

    // If this is YOUR avatar, the AvatarPawn automatically calls this.drive() in the constructor.
    // The drive() function sets up the user interface for the avatar.
    // If this is not YOUR avatar, the park() function is called.
    drive() {
        console.log("DRIVE");
        this.gas = 0;
        this.turn = 0;
        this.strafe = 0;
        //this.highGear = 1;
        this.pointerId = 0;

        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        //this.subscribe("input", "tap", this.doPointerTap);
        this.subscribe("input", 'wheel', this.onWheel);
        this.createMinimap();
    }

    park() {
        this.gas = 0;
        this.turn = 0;
        this.strafe = 0;
        this.highGear = 1;
    }

    didShootSound() {
        if (this.isMyAvatar) return; // only play the sound if it is not your avatar
        this.shootSound.stop();
        playSound(shootSound, this.renderObject, false);
    }

    shootMissile() {
        if (this.actor.canShoot) {
            const mazeActor = this.wellKnownModel("ModelRoot").maze;
            if (this.actor.season === mazeActor.getSeason(this.lastX, this.lastY)) {
                this.say("shootMissile");
                playSound(shootSound, null, false);
                return;
            }
        }
        playSound(shootFailSound, null, false);
        console.log("can't shoot");
    }

    rechargedSound() {
        console.log("recharged");
        playSound(rechargedSound, this.renderObject, false);
    }

    keyDown(e) {
        //console.log("keyDown", e.key);
        switch (e.key) {
            case "ArrowUp": case "W": case "w":
                this.gas = 1; break;
            case "ArrowDown": case "S": case "s":
                this.gas = -1; break;
            case "ArrowLeft": case "A": case "a":
                this.strafe = 1; break;
            case "ArrowRight": case "D": case "d":
                this.strafe = -1; break;
            case "Shift":
                console.log("shiftKey Down");
                this.highGear = 1.5; break;
            case " ":
                this.shootMissile();
                break;
            case "o": case "O":
                console.log("AvatarPawn origin");
                this.say("origin");
                break;
            case "I": case "i":
                console.log( "AvatarPawn", this );
                break;
            case '-': case '_':
                volume = Math.max(0, volume - 0.1);
                soundLoops.forEach( sound => sound.setVolume(volume * loopSoundVolume) );
                break;
            case '+': case '=':
                volume = Math.min(1, volume + 0.1);
                soundLoops.forEach( sound => sound.setVolume(volume * loopSoundVolume) );
                break;
            case '/':
                soundSwitch = !soundSwitch; // toggle sound on and off
                soundLoops.forEach( sound => {if (soundSwitch) sound.play(); else sound.pause();} );
                console.log( "sound is " + soundSwitch);
                break;
            case 'm': case 'M':
                console.log("pause/play music");
                soundLoops.forEach( sound => {if (sound.isPlaying) sound.pause(); else sound.play();} );
                break;
            default:
        }
    }

    keyUp(e) {
        switch (e.key) {
            case "ArrowUp": case "W": case "w":
                this.gas = 0; break;
                case "ArrowDown": case "S": case "s":
                this.gas = 0; break;
                case "ArrowLeft": case "A": case "a":
                this.strafe = 0; break;
                case "ArrowRight": case "D": case "d":
                this.strafe = 0; break;
            case "Shift":
                console.log("shiftKey Up");
                this.highGear = 1; break;
            case " ":
                this.shootNow = false;
                break;
            default:
        }
    }

    onWheel(data) { // zoom in and out
    }

    doPointerDown(e) {
    //    console.log("AvatarPawn.onPointerDown()", e);
        const im = this.service("InputManager");
        if ( im.inPointerLock ) this.shootMissile();
        else im.enterPointerLock();
    }

    doPointerUp(e) {
        //console.log("AvatarPawn.onPointerUp()", e);
        // console.log("mouse0Up");
    }

    normalizeRotation(rotation) {
        return ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }

    doPointerDelta(e) {
        //console.log("AvatarPawn.onPointerDelta()", e.xy);
        // update the avatar's yaw
        const im = this.service("InputManager");
        if ( im.inPointerLock ) {
            this.yaw -= e.xy[0] * 0.002;
            this.yaw = this.normalizeRotation(this.yaw);
            compass.update(this.yaw + seasons[this.actor.season].radians);
            this.yawQ = q_axisAngle([0,1,0], this.yaw);
            this.positionTo(this.translation, this.yawQ);

            // update the eyeball's pitch
            let p = this.eyeball.pitch;
            p -= e.xy[1] * 0.002;
            p = Math.max(-PI_4, Math.min(PI_4, p));
            this.eyeball.pitch = p;
            this.eyeball.pitchQ = q_axisAngle([1,0,0], this.eyeball.pitch);
            this.eyeball.set({rotation: this.eyeball.pitchQ});
        }
    }

    doPointerMove(e) {
    //const xy = e.xy;
    //console.log("AvatarPawn.onPointerMove()", e);
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            if (this.gas || this.strafe) {
                const factor = delta/1000;
                const speed = this.gas * 20 * factor * this.actor.highGear;
                const strafeSpeed = this.strafe * 20 * factor * this.actor.highGear;
                const forward = v3_rotate([0,0,-1], this.yawQ);
                let velocity = v3_scale(forward, speed);
                if (strafeSpeed !== 0) {
                    const leftQ = q_axisAngle([0,1,0], this.yaw+PI_2);
                    const left = v3_rotate([0,0,-1], leftQ);
                    const leftVelocity = v3_scale(left, strafeSpeed);
                    velocity = v3_add(velocity, leftVelocity);
                }
                this.collide(velocity);
            }
        }
    }

    collide(velocity) {
        // set translation to limit after any collision
        let translation = v3_add(this.translation, velocity);
        const avatars = this.service("AvatarManager").avatars;
        for (const avatar of avatars) {
            if (avatar === this) continue; // don't collide with yourself
            const collideDist = this.radius+avatar.radius;
            const collideSqr = collideDist*collideDist;
            const distanceSqr = v3_distanceSqr(translation, avatar.translation);
            if (distanceSqr < collideSqr) {
                if (distanceSqr === 0) translation = this.translation;
                translation = v3_add(avatar.translation,
                    v3_scale(
                        v3_normalize(
                            v3_sub(translation, avatar.translation)), collideDist));

            }
        }
        translation = this.verifyMaze(translation);
        this.positionTo(translation, this.yawQ);
    }

    verifyMaze(loc) {
        const mazeActor = this.wellKnownModel("ModelRoot").maze;
        const cellInset = CELL_SIZE/2 - this.radius;
        let x = loc[0];
        let y = loc[1];
        let z = loc[2];
        const xCell = 1+Math.floor(x/CELL_SIZE);
        const yCell = 1+Math.floor(z/CELL_SIZE);

        if ( xCell>0 && xCell < MAZE_COLUMNS && yCell>0 && yCell < MAZE_ROWS ) { //on the map
            // what cell are we in?
            const cell = mazeActor.map[xCell][yCell];
            // where are we within the cell?
            const offsetX = x - (xCell-0.5)*CELL_SIZE;
            const offsetZ = z - (yCell-0.5)*CELL_SIZE;

            const s = offsetZ > cellInset;
            const n = offsetZ < -cellInset;
            const e = offsetX > cellInset;
            const w = offsetX < -cellInset;

            // check for corner collisions
            let collided = false;
            if (!cell.S && s) { z -= WALL_EPSILON + offsetZ - cellInset; collided = 'S'; }
            else if (!cell.N && n) { z -= offsetZ  + cellInset - WALL_EPSILON; collided = 'N'; }
            if (!cell.E && e) { x -= WALL_EPSILON + offsetX - cellInset; collided = 'E'; }
            else if (!cell.W && w) { x -= offsetX + cellInset - WALL_EPSILON; collided = 'W'; }

            if (!collided) {
                if (s && e) {
                    if ( offsetX < offsetZ ) x -= offsetX - cellInset;
                    else z -= offsetZ - cellInset;
                }
                else if (s && w) {
                    if ( -offsetX < offsetZ ) x -= offsetX + cellInset;
                    else z -= offsetZ - cellInset;
                }
                else if (n && e) {
                    if ( -offsetX > offsetZ ) x -= offsetX - cellInset;
                    else z -= offsetZ  + cellInset;
                }
                else if (n && w) {
                    if ( offsetX > offsetZ ) x -= offsetX + cellInset;
                    else z -= offsetZ + cellInset;
                }
            }
        } // else {}// if we find ourselves off the map, then jump back
        this.tryClaimCell(xCell, yCell);
        return [x, y, z];
    }

    tryClaimCell(x, y) {
        //console.log("AvatarPawn tryClaimCell", x, y, this.lastX, this.lastY, this.actor.inCorner);
        if (x!==this.lastX || y!==this.lastY) this.say("claimCell", {x, y, lastX:this.lastX, lastY:this.lastY});
        this.avatarMinimap(this.lastX, this.lastY, x, y);
        this.lastX = x;
        this.lastY = y;
    }

    claimCellUpdate(data) {
        //console.log("AvatarPawn claimCellUpdate", data);
        this.drawMinimapCell(data.x,data.y, data.color);
        playSound(cellSound, this.renderObject, false);
    }

    createMinimap() {
        //console.log("createMinimap");
        // Add the canvas to the minimap div
        const minimapDiv = document.getElementById('minimap');
        minimapDiv.appendChild(minimapCanvas);
        this.redrawMinimap();
    }

    redrawMinimap() {
        //console.log("redrawMinimap");
        const mazeActor = this.wellKnownModel("ModelRoot").maze;
        minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        for (let y = 1; y < mazeActor.rows; y++) {
            for (let x = 1; x < mazeActor.columns; x++) {
                this.drawMinimapCell(x,y,  mazeActor.getCellColor(x,y));
            }
        }
        const xCell = 1+Math.floor(this.translation[0]/CELL_SIZE);
        const yCell = 1+Math.floor(this.translation[2]/CELL_SIZE);
        this.avatarMinimap(null, null, xCell, yCell);
        const minimapDiv = document.getElementById('minimap');
        minimapDiv.style.transform = `rotate(${seasons[this.actor.season].angle}deg)`;
    }

    drawMinimapCell(x,y, color) {
        function hexNumberToColorString(hexNumber) {
            let hexString = hexNumber.toString(16);
            while (hexString.length < 6) {
                hexString = '0' + hexString;
            }
            return '#' + hexString.toUpperCase();
        }
        if (color !== 0xFFFFFF) {
            minimapCtx.clearRect(x*10-5, y*10-5, 9, 9);
            minimapCtx.globalAlpha = 0.6;
            minimapCtx.fillStyle = hexNumberToColorString(color);
            minimapCtx.fillRect(x*10-5, y*10-5, 9, 9);
        } else {
            minimapCtx.clearRect(x*10-5, y*10-5, 9, 9);
        }
    }

    avatarMinimap(lastX, lastY, x, y) {
        if (lastX) {
            const mazeActor = this.wellKnownModel("ModelRoot").maze;
            this.drawMinimapCell(lastX, lastY, mazeActor.getCellColor(lastX,lastY));
        }
        minimapCtx.globalAlpha = 0.9;
        minimapCtx.fillStyle = "#FFFFFF";
        minimapCtx.fillRect(x*10-4, y*10-4, 8, 8);
    }
}

AvatarPawn.register("AvatarPawn");

// MyUserManager
// Create a new avatar when a new user joins.
//------------------------------------------------------------------------------------------
class MyUserManager extends UserManager {
    init() {
        super.init();
    }
    get defaultUser() {return MyUser}
}

MyUserManager.register('MyUserManager');

class MyUser extends User {
    init(options) {
        super.init(options);
        console.log("MyUser init", this);
        let cellX = Math.floor(18.9*Math.random());
        let cellY = Math.floor(18.9*Math.random());

        if ( cellX === 10 && cellY === 10 ) { // don't spawn in the center
            cellX = 11;
            cellY = 11;
        }
        const season = ["spring","summer","autumn","winter"][this.userNumber%4];
        const t = [CELL_SIZE*seasons[season].cell.x+10,6.5,CELL_SIZE*seasons[season].cell.y+10];
        const r = q_axisAngle([0,1,0],Math.PI*2*seasons[season].angle/360);
        this.avatar = AvatarActor.create({
            translation: t,
            rotation: r,
            driver: this.userId,
            season
        });
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }
}
MyUser.register('MyUser');

// AvatarManager
// Easy to find all of the avatars in the world
//------------------------------------------------------------------------------------------
class AvatarManager extends ViewService {

    constructor() {
        super("AvatarManager");
        this.avatars = new Set();
    }
}
// MissileActor
// Fired by the avatar - they destroy the other players but bounce off of everything else
//------------------------------------------------------------------------------------------
class MissileActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "MissilePawn" }

    init(options) {
        super.init(options);
        this.isCollider = true;
        this.future(4000).destroy(); // destroy after some time
        this.radius = MISSILE_RADIUS;
        const t = [...this._avatar.translation];
        t[1]=5;
        this.translation = [...t];
        this.rotation = [...this._avatar.rotation];
        this.yaw = q_yaw(this.rotation);
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
        this.direction = v3_scale(v3_rotate(this.forward, this.yawQ), -1);
        this.velocity = v3_scale(this.direction, MISSILE_SPEED*2);
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.hasBounced = false; // I can kill my avatar if I bounce off a wall first
        InstanceActor.create({name: "hexasphere", parent: this});
        GlowActor.create({parent: this, color: options.color||0xff8844, depthTest: true, radius: 1.25, glowRadius: 0.5, falloff: 0.1, opacity: 0.75, sharpness: 0.5});
        this.flicker = PointFlickerActor.create({parent: this, playSound: true,color: options.color||0xff8844});
        this.tick(0);
        //console.log("MissileActor init", this);
    }

    resetGame() {
        this.destroy();
    }

    tick(count) {
        // test for collisions
        const actors = this.wellKnownModel('ActorManager').actors;
        this.translation = v3_add(this.translation, this.velocity);
        actors.forEach(actor => { if (!this.doomed && actor.isCollider) this.testCollision(actor); });

        if (!this.doomed) {
            this.verifyMaze();
            this.future(20).tick(count+1);
        }
    }

    testCollision( actor ) {
        // console.log("testCollision", actor.translation);
        if (actor.id === this.id) return false; // don't kill yourself
        if (actor.id === this._avatar.id && !this.hasBounced) return false; // don't kill yourself
        const distanceSqr = v3_distanceSqr(this.translation, actor.translation);
        const collide = actor.radius + this.radius;
        const collideSqr = collide*collide;
        if (distanceSqr < collideSqr) {
            if (actor.inCorner && distanceSqr > 0) {
                // the missile bounces off the avatar when they are in their own corner
                this.hasBounced = true;
                const d = 1/Math.sqrt(distanceSqr);
                const dd = v3_sub(this.translation, actor.translation);
                dd[1] = 0;
                const norm = v3_scale(dd, d);
                const dot = this.velocity[0]*norm[0] + this.velocity[2]*norm[2];
                const projection = v3_scale(norm, dot);
                this.velocity = v3_sub(this.velocity, v3_scale(projection, 2));
            } else {
                actor.kill();
                this.destroy();
                return true;
            }
        }
        return false;
    }

    verifyMaze() {
        const mazeActor = this.wellKnownModel("ModelRoot").maze;
        const cellInset = CELL_SIZE/2 - this.radius;
        let [x,y,z] = this.translation;

        const xCell = 1+Math.floor(x/CELL_SIZE);
        const yCell = 1+Math.floor(z/CELL_SIZE);

        if ( xCell>=0 && xCell < MAZE_COLUMNS && yCell>=0 && yCell < MAZE_ROWS ) { //off the map
            // what cell are we in?
            const cell = mazeActor.map[xCell][yCell];
            // where are we within the cell?
            const offsetX = x - (xCell-0.5)*CELL_SIZE;
            const offsetZ = z - (yCell-0.5)*CELL_SIZE;

            const s = offsetZ > cellInset;
            const n = offsetZ < -cellInset;
            const e = offsetX > cellInset;
            const w = offsetX < -cellInset;

            // we have to have the flickering light manage the bounce sound
            // because the missile is an instance and can't have children in threejs
            if (!cell.S && s) {
              z -= WALL_EPSILON + offsetZ - cellInset;
              this.velocity[2]=-this.velocity[2];
              this.hasBounced = true;
              this.flicker.say('bounce');
            }
            else if (!cell.N && n) {
              z -= offsetZ  + cellInset - WALL_EPSILON;
              this.velocity[2] = -this.velocity[2];
              this.hasBounced = true;
              this.flicker.say('bounce');
            }
            if (!cell.E && e) {
              x -= WALL_EPSILON + offsetX - cellInset;
              this.velocity[0] = -this.velocity[0];
              this.hasBounced = true;
              this.flicker.say('bounce');
            }
            else if (!cell.W && w) {
              x -= offsetX + cellInset - WALL_EPSILON;
              this.velocity[0] = -this.velocity[0];
              this.hasBounced = true;
              this.flicker.say('bounce');
            }
            if ( !this.hasBounced ) {
                if (s && e) {
                    if ( offsetX < offsetZ ) this.velocity[0] = -this.velocity[0];
                    else this.velocity[2]=-this.velocity[2];
                    this.hasBounced = true;
                    this.flicker.say('bounce');
                }
                else if (s && w) {
                    if ( -offsetX < offsetZ ) this.velocity[0] = -this.velocity[0];
                    else this.velocity[2]=-this.velocity[2];
                    this.hasBounced = true;
                    this.flicker.say('bounce');
                }
                else if (n && e) {
                    if ( -offsetX > offsetZ ) this.velocity[0] = -this.velocity[0];
                    else this.velocity[2]=-this.velocity[2];
                    this.hasBounced = true;
                    this.flicker.say('bounce');
                }
                else if (n && w) {
                    if ( offsetX > offsetZ ) this.velocity[0] = -this.velocity[0];
                    else this.velocity[2]=-this.velocity[2];
                    this.hasBounced = true;
                    this.flicker.say('bounce');
                }
            }
            this.translation = [x, y, z];
            this.yaw += 0.01;
            this.yawQ = q_axisAngle([0,1,0], this.yaw);
            this.rotation = this.yawQ;
        }
    }

    kill() { // missiles can kill missiles
        console.log("testCollision", this.id, "KILLED");
        if ( !this.doomed ) {
            FireballActor.create({translation: this.translation, radius: this.radius});
            this.destroy();
        }
    }
}
MissileActor.register('MissileActor');

// MissilePawn
// Flashy missile object.
//------------------------------------------------------------------------------------------
export class MissilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {
    get radius() { return this.actor.radius }
}
MissilePawn.register("MissilePawn");

// PointFlickerActor
// The missile emits a flickering light.
//------------------------------------------------------------------------------------------
class PointFlickerActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "PointFlickerPawn" }
    get color() { return this._color || 0xff8844 }
    get playSound() { return this._playSound || false }
    init(options) {
        super.init(options);
        // this.future(100).tick();
    }

    tick() { // add flickering light
        this.future(100).tick();
    }

    resetGame() {
        this.destroy();
    }
}
PointFlickerActor.register('PointFlickerActor');

// PointFlickerPawn
// The missile emits a flickering light- this also manages the sound.
//------------------------------------------------------------------------------------------
export class PointFlickerPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        console.log("PointFlickerPawn constructor", this);
        this.pointLight = new THREE.PointLight(this.actor.color, 20, 20, 2);
        this.setRenderObject(this.pointLight);
        if (this.actor.playSound) {
            this.listen("bounce", this.playBounce);
            playSound( missileSound, this.renderObject, true);
        }
    }

    playBounce() {
        playSound(bounceSound, this.renderObject, false);
    }

    destroy() {
        super.destroy();
        if (this.pointLight) this.pointLight.dispose();
    }
}
PointFlickerPawn.register("PointFlickerPawn");
// FireballActor 
// When a missile hits an avatar a fireball is generated. It is attached to the avatar.
//------------------------------------------------------------------------------------------
class FireballActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "FireballPawn" }

    init(options) {
        super.init(options);
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.future(3000).destroy(); // destroy after some time
        // console.log("FireballActor init", this, this.parent);
    }

    get radius() { return this._radius || AVATAR_RADIUS}

    resetGame() {
        this.destroy();
    }
}
FireballActor.register('FireballActor');

// FireballPawn
// Fireball explosion when hit by missile on pawn or other missile.
//------------------------------------------------------------------------------------------
export class FireballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        // console.log("FireballPawn constructor", this);
        this.startTime = this.now();
        this.material = fireMaterial;
        this.geometry = new THREE.IcosahedronGeometry( actor.radius*2, 20 );
        this.fireball = new THREE.Mesh(this.geometry, this.material);
        this.pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
        this.fireball.add(this.pointLight);
        this.setRenderObject(this.fireball);
        playSound(implosionSound, this.fireball, false);
    }

    update(time, delta) {
        super.update(time,delta);
        //this.refreshDrawTransform();
        const now = this.now(); // NB: time argument is not now()
        const age = now-this.startTime;
        this.fireball.material.uniforms[ 'time' ].value = time*this.actor.timeScale;
        this.fireball.material.uniforms[ 'tOpacity' ].value = 0.25;
        this.pointLight.intensity = 0.25+ 0.75* Math.sin(age*0.020)*Math.cos(age*0.007);
    }

    destroy() {
        super.destroy();
        if (this.geometry) this.geometry.dispose();
        //this.material.dispose();
        if (this.pointLight) this.pointLight.dispose();
    }
}
FireballPawn.register("FireballPawn");

// SphereActor
// Power up that a player can pick up to fuel their missile.
//------------------------------------------------------------------------------------------
class SphereActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "SpherePawn" }

    init(options) {
        super.init(options);
        this.center = this.translation[1];
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.offset = Math.random()*Math.PI;
        //console.log("SphereActor init", this, this.parent);
        //InstanceActor.create({name:"minotaur", parent: this});
       // GlowActor.create({parent: this});
       this.future(100).tick();
    }

    get name() { return this._name || "power" }

    tick() {
        const t = this.translation;
        t[1] = this.center + 0.5*Math.sin(this.now()*0.001 + this.offset);
        this.set({translation: t});
        this.future(100).tick();
    }

    resetGame() {
        this.destroy();
    }
}
SphereActor.register('SphereActor');

// SpherePawn
// Flashy sphere object.
//------------------------------------------------------------------------------------------
export class SpherePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.radius = actor.radius;
        this.createInstance();
    }

    createInstance() {
        const im = this.service("ThreeInstanceManager");
        const name = this.actor.name;
        let instance = this.useInstance(name);
        if ( !instance ) {
            const geometry = new THREE.IcosahedronGeometry( 1, 2 );
            csm.setupMaterial(materials.power);
            im.addMaterial(name, materials.power);
            im.addGeometry(name, geometry);
            im.addMesh(name, name, name);
            instance = this.useInstance(name);
            instance.mesh.castShadow = true;
        }
    }
}
SpherePawn.register("SpherePawn");

//--GlowActor ---------------------------------------------------------------------------
// Make the power up and missiles glow.
//------------------------------------------------------------------------------------------
class GlowActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "GlowPawn" }

    init(options) {
        super.init(options);
    }
    resetGame() {
        this.destroy();
    }

    get radius() { return this._radius || 2 }
    get glowRadius() { return this._glowRadius || 1 }
    get color() { return this._color || 0xff8844 }
    get transparent() { return this._transparent || true }
    get depthTest() { return this._depthTest || true }
    get falloff() { return this._falloff || 0.1 }
    get side() { return this._side || THREE.FrontSide }
    get sharpness() { return this._sharpness || 0.5 }
    get opacity() { return this._opacity || 1 }
}
GlowActor.register('GlowActor');

export class GlowPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
// can't use instancing because the FakeGlowMaterial doesn't support it
    constructor(actor) {
        super(actor);
        console.log("GlowPawn constructor", this);
        const sphere = new THREE.SphereGeometry(this.actor.radius, 32, 32);
        //console.log(this.color, this.radius);
        const material = new FakeGlowMaterial({
            glowColor: this.actor.color,
            glowInternalRadius: this.actor.glowRadius,
            glowSharpness: this.actor.sharpness,
            transparent: this.actor.transparent,
            depthTest: this.actor.depthTest,
            falloff: this.actor.falloff,
            opacity: this.actor.opacity,
            side: this.actor.side
        });
        this.glow = new THREE.Mesh(sphere, material);
        this.glow.renderOrder = 5000; // this must be set to a large number to keep the associated pawn visible
        this.setRenderObject(this.glow);
    }

    destroy() {
        this.glow.material.dispose();
        this.glow.geometry.dispose();
        super.destroy();
    }
}
GlowPawn.register("GlowPawn");
//------------------------------------------------------------------------------------------
//-- WallActor -----------------------------------------------------------------------------
// This provides a simple wall.
//------------------------------------------------------------------------------------------
class WallActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return "WallPawn"}
}
WallActor.register('WallActor');
//------------------------------------------------------------------------------------------
//-- WallPawn ------------------------------------------------------------------------------
// This is used to generate the walls of the maze.
//------------------------------------------------------------------------------------------
class WallPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.wall = this.createInstance();
    }

    createInstance() {
        const im = this.service("ThreeInstanceManager");
        let wall = this.useInstance("wall");
        if ( !wall ) {
            const width = 20;
            const height = 10;
            const frontWall = new THREE.PlaneGeometry(width, height);
            const backWall = new THREE.PlaneGeometry(width, height);
            backWall.rotateY(Math.PI);
            const geometry = ADDONS.BufferGeometryUtils.mergeGeometries([frontWall, backWall], false);
            csm.setupMaterial(materials.wall);
            im.addMaterial("wall", materials.wall);
            im.addGeometry("wall", geometry);
            im.addMesh("wall", "wall", "wall");
            wall = this.useInstance("wall");
        }
        wall.mesh.material.needsUpdate = true;
        wall.mesh.receiveShadow = true;
        wall.mesh.castShadow = true;
        return wall;
    }
}
WallPawn.register("WallPawn");

// InstanceActor
// Generate loaded instances.
//------------------------------------------------------------------------------------------
class InstanceActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return "InstancePawn"}
    get name() { return this._name || "column"}
    get color() { return this._color || 0xffffff }
    setColor(color) { this._color = color; this.say("color", color); }
}
InstanceActor.register('InstanceActor');

// InstancePawn
// Load 3D models and convert them into instances. This is used when we have many
// copies of the same model. Loading these as instances is a bit tricky, hence the
// separate class.
//------------------------------------------------------------------------------------------
class InstancePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.loadInstance();
        this.listen("color", this.doColor);
    }

    doColor(color) {
        this.setColor(new THREE.Color(color));
    }

    loadInstance() {
        if (this.doomed) return;
        const name = this.actor.name;
        let instance = this.useInstance(name);
        if (!instance) { // does the instance not exist?
            if (instances[name] || geometries[name]) { // is it ready to load?
                const geometry = geometries[name] || instances[name].geometry.clone();
                const material = materials[name] || instances[name].material;
                csm.setupMaterial(material);
                //console.log("InstancePawn", name, geometry, material);
                const im = this.service("ThreeInstanceManager");
                im.addMaterial(name, material);
                im.addGeometry(name, geometry);
                im.addMesh(name, name, name);
                instance = this.useInstance(name);
                instance.mesh.material.needsUpdate = true;
                csm.setupMaterial(instance.mesh.material);
                instance.mesh.receiveShadow = true;
                instance.mesh.castShadow = true;
            } else this.future(100).loadInstance(); // not ready to load - try again later
        }
        if (instance && this.actor.color) this.doColor(this.actor.color);
    }
}
InstancePawn.register("InstancePawn");

// HorseActor
// Hero statue at the center of the maze.
//------------------------------------------------------------------------------------------
class HorseActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "HorsePawn" }
}
HorseActor.register('HorseActor');

class HorsePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.load3D();
    }

    load3D() {
        if (this.doomed) return;
        if (readyToLoad3D && horse) {
            this.horse = horse.clone();
            this.horse.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; } });
            this.setRenderObject(this.horse);
        } else this.future(100).load3D();
    }

    destroy() {
        super.destroy();
        this.horse.traverse( obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}
HorsePawn.register("HorsePawn");

// TreeActor
// Seasonal trees in each corner of the maze.
//------------------------------------------------------------------------------------------
class PlantActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "PlantPawn" }
    get plant() { return this._plant || "spring"}
}
PlantActor.register('PlantActor');

class PlantPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.load3D();
    }

    load3D() {
        if (this.doomed) return;
        if (readyToLoad3D && plants && plants[this.actor.plant]) {
            const model3d = plants[this.actor.plant];
            this.model3d = model3d.clone(); // clone because we will modify it
//            this.tree.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; } });
            this.setRenderObject(this.model3d);
        } else this.future(100).load3D();
    }

    destroy() {
        super.destroy();
        this.model3d.traverse( obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}
PlantPawn.register("PlantPawn");

// StartWorldcore
// We either start or join a Croquet session here.
// If we are using the lobby, we use the session name in the URL to join an existing session.
// If we are not using the lobby, we create a new session.
//------------------------------------------------------------------------------------------

// redirect to lobby if not in iframe or session
/*const inIframe = window.parent !== window;
const url = new URL(window.location.href);
const sessionName = url.searchParams.get("session");
url.pathname = url.pathname.replace(/[^/]*$/, "index.html");
if (!inIframe || !sessionName) window.location.href = url.href;
*/
// ensure unique session per lobby URL
//const BaseUrl = url.href.replace(/[^/?#]*([?#].*)?$/, "");
//Constants.LobbyUrl = BaseUrl + "index.html";    // hashed into sessionId without params

// QR code points to lobby, with session name in hash
//url.searchParams.delete("session");
//url.hash = encodeURIComponent(sessionName);
//App.sessionURL = url.href;

App.makeWidgetDock({ iframe: true });
App.messages = true;

StartWorldcore({
    ...apiKey,
    appId: 'io.croquet.mazewars', // <-- feel free to change
    //name: sessionName,
    password: "none",
    location: true,
    model: MyModelRoot,
    view: MyViewRoot,
});