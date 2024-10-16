//------------------Labirynth-----------------------
// This is a simple example of a multi-player 3D shooter.
// It is loosely based upon the early Maze War game created at NASA Ames in 1973
// https://en.wikipedia.org/wiki/Maze_War and has elements of Pacman, The Colony and Dodgeball.
//------------------------------------------------------------------------------------------
// This is intended to be ported to the Multisynq for Unity platform. Most of this application
// can be easily translated to Unity. The only object that requires replicated computation is 
// the missile which when fired must execute on all clients. It computes collisions with user
// avatars and the maze walls.
//------------------------------------------------------------------------------------------
// Previous versions:
// - minimal world - showing we exist. We get an alert when a new user joins.
// - add simple avatars w/ mouselook interface
// - add missiles and collision detection
// - fix textures, add powerup with fake glow, add wobble shader
// - better missiles. Maze walls are instanced. Generate the maze.
// - collision detection with walls for avatars and missiles.
// - columns, CSM lighting
// - added floor reflections, enhance lighting, fixed disappearing columns
// - added the horse weenie
// - changed sky,added uv coordinates to hexasphere
// - avatar & missile tests collision with columns
// - seasonal trees weenies
// - made the missiles glow, slowed it down
// - place player at random location when spawned
// - Sound effects:
// -- missile bounce sound
// -- missile fire sound
// -- ready to shoot sound and click when not ready
// -- player enter/exit game
// -- missile whoosh when it goes by
// Fixed sounds not playing after a while
//------------------------------------------------------------------------------------------
// To do:

// Sounds effects need to be added.
// - avatar death groan when hit
// - powerup collected tone
// create three+ powerups:
// 1. red - 10 second invincibility
// 2. blue - 10 second speed boost
// 3. green - 10 second missile boost
// Need to pre-render textures on dynamic objects like missiles.
// burn marks on walls when hit by missiles - these fade away.
// scoring, leaderboard - steal from Multiblaster
// add mobile controls
// missile/missile collision test * I think this is working
// missile light should flicker
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

import power_color from "./assets/textures/metal_hex/metal_0076_color_2k.jpg";
import power_normal from "./assets/textures/metal_hex/metal_0076_normal_opengl_2k.png";
import power_roughness from "./assets/textures/metal_hex/metal_0076_roughness_2k.jpg";
import power_displacement from "./assets/textures/metal_hex/metal_0076_height_2k.png";
import power_metalness from "./assets/textures/metal_hex/metal_0076_metallic_2k.jpg";

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
import eyeball_glb from "./assets/eyeball.glb";
import column_glb from "./assets/column2.glb";
import hexasphere_glb from "./assets/hexasphere.glb";
import horse_glb from "./assets/Horse_Copper.glb";
import fourSeasonsTree_glb from "./assets/fourSeasonsTree.glb";

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
let readyToLoad = false;
let eyeball;
let column;
let hexasphere;
let horse;
let trees;
let seasons;

// Audio Manager
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
        else {
            audioLoader.load( soundURL, buffer => {
                soundList[soundURL] = {buffer, count:0};
                playSoundOnce(soundList[soundURL], parent3D, force, loop);
            });
        }
    }
    return play;
}();

function playSoundOnce(sound, parent3D, force, loop = false) {
    console.log("playSoundOnce", sound.count, maxSound, parent3D);
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

// Load 3D Models
//------------------------------------------------------------------------------------------
async function modelConstruct() {
    const gltfLoader = new ADDONS.GLTFLoader();
    const dracoLoader = new ADDONS.DRACOLoader();
    dracoLoader.setDecoderPath('./src/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    return [eyeball, column, hexasphere, horse, trees] = await Promise.all( [
        // add additional GLB files to load here
        gltfLoader.loadAsync( eyeball_glb ),
        gltfLoader.loadAsync( column_glb ),
        gltfLoader.loadAsync( hexasphere_glb ),
        gltfLoader.loadAsync( horse_glb ),
        gltfLoader.loadAsync( fourSeasonsTree_glb )
    ]);
}

modelConstruct().then( () => {
    readyToLoad = true;
    column = column.scene.children[0];
    console.log("hexasphere",hexasphere);
    hexasphere = hexasphere.scene.children[0].children[0];
    seasons = {spring: new THREE.Group(), summer: new THREE.Group(), fall: new THREE.Group(), winter: new THREE.Group()};
    console.log(trees);
    let counter = 0;

    trees.scene.children.forEach(node => {
        if (node.name) {
            if (node.name.includes("spring")) seasons.spring.add(node.clone());
            else if (node.name.includes("summer")) seasons.summer.add(node.clone());
            else if (node.name.includes("fall")) seasons.fall.add(node.clone());
            else if (node.name.includes("winter")) seasons.winter.add(node.clone());
        }
    });
    seasons.spring.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0); } });
    seasons.summer.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
    seasons.fall.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
    seasons.winter.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; m.position.set(0,0,0);} });
});

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

// Create complex materials
//------------------------------------------------------------------------------------------
function complexMaterial(options) {
    const material = new THREE.MeshStandardMaterial();
    const textureLoader = new THREE.TextureLoader();
    const repeat = options.repeat || [1,1];
    textureLoader.load( options.colorMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = options.anisotropy || 4;
        map.repeat.set( ...repeat );
        map.encoding = THREE.SRGBColorSpace;
        material.map = map;
        material.needsUpdate = true;
        //console.log(options.name,"colorMap", map);
    } );
    if (options.normalMap) textureLoader.load( options.normalMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.normalMap = map;
        material.needsUpdate = true;
        if (options.normalScale) material.normalScale.set(options.normalScale);
        //console.log(options.name,"normalMap", map);
    } );
    if (options.roughnessMap) textureLoader.load( options.roughnessMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.roughnessMap = map;
        if (options.roughness) material.roughness = options.roughness;
        material.needsUpdate = true;
        //console.log(options.name,"roughnessMap", map);
    } );
    if (options.metalnessMap) textureLoader.load( options.metalnessMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.metalnessMap = map;
        if (options.metalness) material.metalness = options.metalness;
        material.needsUpdate = true;
        //console.log(options.name,"metalnessMap", map);
    } );
    if (options.displacementMap) textureLoader.load( options.displacementMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        material.displacementMap = map;
        if (options.displacementScale) material.displacementScale = options.displacementScale;
        if (options.displacementBias) material.displacementBias = options.displacementBias;
        material.needsUpdate = true;
        //console.log(options.name,"displacementMap", map);
    } );
    if (options.emissiveMap) textureLoader.load( options.emissiveMap, map => {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set( ...repeat );
        map.encoding = THREE.SRGBColorSpace;
        material.emissiveMap = map;
        if (options.emissiveIntensity) material.emissiveIntensity = options.emissiveIntensity;
        material.needsUpdate = true;
        //console.log(options.name,"emissiveMap", map);
    } );

    if (options.emissive) material.emissive = options.emissive; // this is the color of the emissive object
    if (options.name) material.name = options.name;
    if (options.transparent) material.transparent = options.transparent;
    if (options.opacity) material.opacity = options.opacity;
    if (options.side) material.side = options.side;
    material.needsUpdate = true;
    //console.log(options.name, material);
    csm.setupMaterial(material);
    return material;
}

let missileMaterial;
let powerMaterial;
let wallMaterial;
let floorMaterial;

// Maze Generator
// This generates a (mostly) braided maze. That is a kind of maze that has no dead ends. This actually does have dead ends
// on the edges, but I decided to leave it as is.
//------------------------------------------------------------------------------------------

class MazeActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init(options);
        this.rows = options._rows || 20;
        this.columns = options._columns || 20;
        this.cellSize = options._cellSize || 20;
        this.createMaze(this.rows,this.columns);
        this.constructWalls();
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
    clean() {// remove N and W
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

        const clearCorner = (x,y) => {
            this.map[x+1][y+2].N = this.map[x+1][y+1].S =
            this.map[x+2][y+2].N = this.map[x+2][y+1].S = true;
            this.map[x+1][y+1].E = this.map[x+2][y+1].W =
            this.map[x+1][y+2].E = this.map[x+2][y+2].W = true;
        };

        clearCorner(0,0);
        clearCorner(17,0);
        clearCorner(0,17);
        clearCorner(17,17);
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
    constructWalls() {
    //    let eastWallGeometry = new THREE.BoxGeometry( Q.WALL_THICKNESS, Q.WALL_HEIGHT, Q.CELL_SIZE-Q.COLUMN_RADIUS, 1, 2, 4 );
    //    let southWallGeometry = new THREE.BoxGeometry( Q.CELL_SIZE-Q.COLUMN_RADIUS, Q.WALL_HEIGHT, Q.WALL_THICKNESS,4,1,2);
    //    let wallMaterial = new THREE.MeshStandardMaterial( {color: 0xAAAACC, roughness: 0.7, metalness:0.8  } );
    //    let walls = [];
        const r = q_axisAngle([0,1,0],PI_2);
        for (let y = 0; y < this.rows; y++) {
          for (let x = 0; x < this.columns; x++) {

           // south walls
              if (!this.map[x][y].S && x>0) {
                const t = [x*this.cellSize - this.cellSize/2, 0, y*this.cellSize];
                WallActor.create({parent: this, translation: t});
              }

            // east walls
              if (!this.map[x][y].E && y>0) {
                const t = [x*this.cellSize, 0, (y+1)*this.cellSize - 3*this.cellSize/2];
                WallActor.create({parent: this, translation: t, rotation: r});
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

    init(options) {
         super.init(options);
    }
}
BaseActor.register('BaseActor');

// BasePawn
// This is the ground of the world. This uses a simple transparent tile texture with a
// reflecting mirror just beneath it.
//------------------------------------------------------------------------------------------
export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        floorMaterial = complexMaterial({
            colorMap: marble_color,
            normalMap: marble_normal,
            roughnessMap: marble_roughness,
            displacementMap: marble_displacement,
            anisotropy: 4,
            metalness: 0.1,
            repeat: [20, 20],
            transparent: true,
            opacity: 0.8,
            name: "floor"
        });
        this.material = floorMaterial;
        this.geometry = new THREE.PlaneGeometry(MAZE_ROWS*CELL_SIZE, MAZE_COLUMNS* CELL_SIZE);
        this.geometry.rotateX(toRad(-90));
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;
        const group = new THREE.Group();
        group.add(base);
        this.mirrorGeometry = new THREE.PlaneGeometry(MAZE_ROWS*CELL_SIZE, MAZE_COLUMNS* CELL_SIZE);
        const mirror = new ADDONS.Reflector( this.mirrorGeometry, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0xb5b5b5
        } );
        mirror.position.y = -0.1;
        mirror.rotateX( -PI_2 );
        group.add( mirror );

        this.setRenderObject(group);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

// My Model Root
// Construct the game world
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

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
                ColumnActor.create({translation: t});
                //const t2 = [t[0]+10, 3, t[2]+10];
                //PowerActor.create({translation: t2});
            }
        }
        this.horse = HorseActor.create({translation:[210.9,10,209.70], scale:[8.75,8.75,8.75]});
        let s = 8.0;
        this.spring = TreeActor.create({season:"spring",translation: [20, 0.5, 20], scale:[s,s,s]});
        this.summer = TreeActor.create({season:"summer",translation: [20, 0.5, 360], scale:[s,s,s]});
        this.fall = TreeActor.create({season:"fall",translation: [360, 0.5, 360], scale:[s,s,s]});
        this.winter = TreeActor.create({season:"winter",translation: [360, 0.5, 20], scale:[s,s,s]});
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
    }

    buildView() {
        const rm = this.service("ThreeRenderManager");
        rm.camera.add( listener );
        rm.listener = listener;
        rm.renderer.shadowMap.enabled = true;
        rm.renderer.shadowMap.type = THREE.PCFShadowMap;
        rm.renderer.toneMapping = THREE.ReinhardToneMapping;
        const ambientLight = new THREE.AmbientLight( 0xffffff, 0.6 );
        rm.scene.add( ambientLight );
        const blueLight = new THREE.DirectionalLight( 0x446699, 1.5 );
        blueLight.position.set( -1, -1, 1 ).normalize().multiplyScalar( -200 );
        rm.scene.add( blueLight );
        const redLight = new THREE.DirectionalLight( 0x995533, 1.5 );
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

        const loader = new THREE.TextureLoader();
        loader.load( sky, skyTexture => {
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(skyTexture);
            skyEnvironment.encoding = THREE.LinearSRGBColorSpace;
            rm.scene.background = skyEnvironment.texture;
            //rm.scene.environment = skyEnvironment.texture;
        } );
        missileMaterial = complexMaterial({
            colorMap: missile_color,
            normalMap: missile_normal,
            roughnessMap: missile_roughness,
            metalnessMap: missile_metalness,
            displacementMap: missile_displacement,
            repeat: [1.5,1],
            displacementScale: 0.1,
            displacementBias: -0.05,
            side: THREE.DoubleSide,
            name: "missile"
        });

        powerMaterial = complexMaterial({
            colorMap: power_color,
            normalMap: power_normal,
            roughnessMap: power_roughness,
            metalnessMap: power_metalness,
            displacementMap: power_displacement,
            repeat: [1.5,1],
            displacementScale: 0.1,
            displacementBias: -0.05,
            name: "power"
        });

        wallMaterial = complexMaterial({
            colorMap: corinthian_color,
            normalMap: corinthian_normal,
            roughnessMap: corinthian_roughness,
            displacementMap: corinthian_displacement,
            displacementScale: 1.5,
            displacementBias: -0.8,
            anisotropy: 4,
            repeat: [2, 1],
            name: "wall"
        });
    }

    rotateSky(angle) {
        const rm = this.service("ThreeRenderManager");
        this.skyRotation.y = angle;
        rm.scene.backgroundRotation = this.skyRotation;
    }

    update(time, delta) {
        super.update(time, delta);
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
       // this.set({translation: [10+100*Math.random(),6.5,10+100*Math.random()]});
        this.eyeball = EyeballActor.create({parent: this});
        this.listen("shootMissile", this.shootMissile);
        this.listen("origin", this.origin);
    }

    origin() {
        console.log("AvatarActor origin");
        this.translation = [10,5,10];
    }

    shootMissile() {
        console.log("AvatarActor shootMissile");
        this.canShoot = false;
        this.say("shootMissileSound", this.id);
        this.future(MISSILE_LIFE).reloadMissile();
        MissileActor.create({avatar: this});
    }

    reloadMissile() {
        this.say("recharged");
        this.canShoot = true;
    }

    kill() {
        console.log("testCollision", this.id, "KILLED");
        FireballActor.create({parent: this, radius:this.radius});
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
        if (readyToLoad && eyeball) {
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
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
        this.service("AvatarManager").avatars.add(this);
        this.listen("shootMissileSound", this.didShoot);
        this.listen("recharged", this.recharged);
        this.subscribe(this.viewId, "synced", this.handleSynced);
    }

    handleSynced() {
        console.log("session is synced - play sound");
        soundSwitch = true;
    }

    destroy() {
        super.destroy();
        this.service("AvatarManager").avatars.delete(this);
    }

    // If this is YOUR avatar, the AvatarPawn automatically calls this.drive() in the constructor.
    // The drive() function sets up the user interface for the avatar.
    // If this is not YOUR avatar, the park() function is called.
    drive() {
        console.log("DRIVE");
        this.gas = 0;
        this.turn = 0;
        this.strafe = 0;
        this.highGear = 1;
        this.pointerId = 0;

        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        //this.subscribe("input", "tap", this.doPointerTap);
        this.subscribe("input", 'wheel', this.onWheel);
    }

    park() {
        this.gas = 0;
        this.turn = 0;
        this.strafe = 0;
        this.highGear = 1;
    }

    didShoot() {
        if (this.isMyAvatar) return; // only play the sound if it is not your avatar
        this.shootSound.stop();
        playSound(shootSound, this.renderObject, false);
    }

    shootMissile() {
        if (this.actor.canShoot) {
            console.log("shootMissile");
            this.say("shootMissile");
            playSound(shootSound, null, false);
        } else {
            playSound(shootFailSound, null, false);
            console.log("can't shoot");
        }
    }

    recharged() {
        console.log("recharged");
        playSound(rechargedSound, this.renderObject, false);
    }

    keyDown(e) {
        console.log("keyDown", e.key);
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
        console.log("AvatarPawn.onPointerDown()", e);
        const im = this.service("InputManager");
        if ( im.inPointerLock ) this.shootMissile();
        else im.enterPointerLock();
    }

    doPointerUp(e) {
        console.log("AvatarPawn.onPointerUp()", e);
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
    const xy = e.xy;
    console.log("AvatarPawn.onPointerMove()", e);
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            if (this.gas || this.strafe) {
                const factor = delta/1000;
                const speed = this.gas * 20 * factor * this.highGear;
                const strafeSpeed = this.strafe * 20 * factor * this.highGear;
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
        const zCell = 1+Math.floor(z/CELL_SIZE);

        if ( xCell>=0 && xCell < MAZE_COLUMNS && zCell>=0 && zCell < MAZE_ROWS ) { //on the map
            // what cell are we in?
            const cell = mazeActor.map[xCell][zCell];
            // where are we within the cell?
            const offsetX = x - (xCell-0.5)*CELL_SIZE;
            const offsetZ = z - (zCell-0.5)*CELL_SIZE;

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
            console.log("cell: ", xCell, zCell, collided);
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
        return [x, y, z];
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
        let cellX = Math.floor(18.9*Math.random());
        let cellY = Math.floor(18.9*Math.random());

        if ( cellX === 11 && cellY === 11 ) { // don't spawn in the center
            cellX = 10;
            cellY = 10;
        }
        const t = [20*cellX+10,6.5,20*cellY+10];
        this.avatar = AvatarActor.create({
            translation: t,
            driver: this.userId,
            tags: ["avatar", "block"]
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
        this.velocity = v3_scale(this.direction, MISSILE_SPEED);
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.hasBounced = false; // I can kill my avatar if I bounce off a wall first
        GlowActor.create({parent: this, color: 0xff8844, depthTest: true, radius: 1.25, glowRadius: 0.5, falloff: 0.1, opacity: 0.75, sharpness: 0.5});
        this.flicker = PointFlickerActor.create({parent: this, color: 0xff8844});
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
            this.future(10).tick(count+1);
        }
    }

    testCollision( actor ) {
        //console.log("testCollision", actor.translation);
        if (actor.id === this.id) return false; // don't kill yourself
        if (actor.id === this._avatar.id && !this.hasBounced) return false; // don't kill yourself
        const distanceSqr = v3_distanceSqr(this.translation, actor.translation);
        const collide = actor.radius + this.radius;
        const collideSqr = collide*collide;
        if (distanceSqr < collideSqr) {
            actor.kill();
            this.destroy();
            return true;
        }
        return false;
    }

    verifyMaze() {
        const mazeActor = this.wellKnownModel("ModelRoot").maze;
        const cellInset = CELL_SIZE/2 - this.radius;
        let [x,y,z] = this.translation;

        const xCell = 1+Math.floor(x/CELL_SIZE);
        const zCell = 1+Math.floor(z/CELL_SIZE);

        if ( xCell>=0 && xCell < MAZE_COLUMNS && zCell>=0 && zCell < MAZE_ROWS ) { //off the map
            // what cell are we in?
            const cell = mazeActor.map[xCell][zCell];
            // where are we within the cell?
            const offsetX = x - (xCell-0.5)*CELL_SIZE;
            const offsetZ = z - (zCell-0.5)*CELL_SIZE;

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

    constructor(actor) {
        super(actor);
        this.radius = actor.radius;
        this.loadInstance();
    }

    loadInstance() {
        if (this.doomed) return;
        let missileInstance = this.useInstance("missile");
        if (!missileInstance) { // does the instance not exist?
            if (readyToLoad && hexasphere) { // is it ready to load?
                const geometry = hexasphere.geometry.clone();
                this.fixUV(geometry);
                const material = missileMaterial;
                geometry.scale(0.05,0.05,0.05);
                //geometry.rotateX(-PI_2);
                const im = this.service("ThreeInstanceManager");
                im.addMaterial("missile", material);
                im.addGeometry("missile", geometry);
                im.addMesh("missile", "missile", "missile");
                missileInstance =this.useInstance("missile");
                missileInstance.mesh.material.needsUpdate = true;
                csm.setupMaterial(missileInstance.mesh.material);
                missileInstance.mesh.receiveShadow = true;
                missileInstance.mesh.castShadow = true;
            } else this.future(100).loadInstance(); // not ready to load - try again later
        }
    }

    fixUV(geometry) {
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

    update(time, delta) {
        super.update(time, delta);
    }
}
MissilePawn.register("MissilePawn");

// PointFlickerActor
// The missile emits a flickering light.
//------------------------------------------------------------------------------------------
class PointFlickerActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "PointFlickerPawn" }
    get color() { return this._color || 0xff8844 }

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

// PowerPawn
//------------------------------------------------------------------------------------------
export class PointFlickerPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        console.log("PointFlickerPawn constructor", this);
        this.pointLight = new THREE.PointLight(this.actor.color, 20, 10, 2);
        this.setRenderObject(this.pointLight);
        this.listen("bounce", this.playBounce);
        playSound( missileSound, this.renderObject, true);
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

// PowerActor
// Power up that a player can pick up to fuel their missile.
//------------------------------------------------------------------------------------------
class PowerActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "PowerPawn" }

    init(options) {
        super.init(options);
        this.center = this.translation[1];
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.offset = Math.random()*Math.PI;
        console.log("PowerActor init", this, this.parent);
        GlowActor.create({parent: this});
        this.future(100).tick();
    }

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
PowerActor.register('PowerActor');

//------------------------------------------------------------------------------------------
// PowerPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class PowerPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        console.log("PowerPawn constructor", this);
        this.startTime = this.now();
        this.power = this.createInstance();
        //this.setRenderObject(this.power);
    }

   createInstance() {
        const im = this.service("ThreeInstanceManager");
        let power = this.useInstance("power");
        if ( !power ) {
            const geometry = new THREE.IcosahedronGeometry( 1, 20 );
            im.addMaterial("power", powerMaterial);
            im.addGeometry("power", geometry);
            im.addMesh("power", "power", "power");
            power = this.useInstance("power");
        }
        //const powerGlow = im.instances.mesh("powerGlow");
        //power.add(powerGlow);
        power.mesh.material.needsUpdate = true;
        power.receiveShadow = true;
        return power;
    }
}
PowerPawn.register("PowerPawn");

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
            im.addMaterial("wall", wallMaterial);
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
//------------------------------------------------------------------------------------------
//-- ColumnActor -----------------------------------------------------------------------------
// Columns .
//------------------------------------------------------------------------------------------
class ColumnActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "ColumnPawn"}

}
ColumnActor.register('ColumnActor');
//------------------------------------------------------------------------------------------
//-- ColumnPawn ------------------------------------------------------------------------------
// Display the columns at every intersection of the maze.
//------------------------------------------------------------------------------------------
class ColumnPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeInstanced) {
    constructor(...args) {
        super(...args);
        this.loadInstance();
    }
    loadInstance() {
        if (this.doomed) return;
        let columnInstance = this.useInstance("column");
        if (!columnInstance) { // does the instance not exist?
            if (readyToLoad && column) { // is it ready to load?
                const geometry = column.geometry.clone();
                const material = column.material;
                geometry.scale(0.028,0.028,0.028);
                geometry.rotateX(-PI_2);
                const im = this.service("ThreeInstanceManager");
                im.addMaterial("column", material);
                im.addGeometry("column", geometry);
                im.addMesh("column", "column", "column");
                columnInstance =this.useInstance("column");
                columnInstance.mesh.material.needsUpdate = true;
                csm.setupMaterial(columnInstance.mesh.material);
                columnInstance.mesh.receiveShadow = true;
                columnInstance.mesh.castShadow = true;
            } else this.future(100).loadInstance(); // not ready to load - try again later
        }
    }
}
ColumnPawn.register("ColumnPawn");

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
        if (readyToLoad && horse) {
            this.horse = horse.scene.clone();
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
class TreeActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "TreePawn" }
    get season() { return this._season || "spring"}
}
TreeActor.register('TreeActor');

class TreePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.load3D();
    }

    load3D() {
        if (this.doomed) return;
        if (readyToLoad && seasons && seasons[this.actor.season]) {
            const tree = seasons[this.actor.season];
            this.tree = tree.clone(); // clone because we will modify it
            this.tree.traverse( m => {if (m.geometry) { m.castShadow=true; m.receiveShadow=true; } });
            this.setRenderObject(this.tree);
        } else this.future(100).load3D();
    }

    destroy() {
        super.destroy();
        this.tree.traverse( obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
    }
}
TreePawn.register("TreePawn");

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