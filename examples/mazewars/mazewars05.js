//------------------MazeWars-----------------------
// This is a simple example of a multi-player 3D shooter.
// It is loosely based upon the early Maze War game created at NASA Ames in 1973
// https://en.wikipedia.org/wiki/Maze_War
// This version uses a true 3D rendered world with mouse-look and smooth motion.
// mazewars - a tutorial reimagining of the original MazeWars game from the ground up
// Each version of the mazewars.js file is a step in the tutorial - and each is fully functional
// We start with a minimal working example and add features and improvements in each step
// You can switch between the versions by changing the entry point in the webpack.config.js file.
//------------------------------------------------------------------------------------------
// This is intended to be ported to the Multisynq for Unity platform. Most of this application
// can be easily translated to Unity. The essential multi-player functionality is flagged so
// that it can be easily ported.
//------------------------------------------------------------------------------------------
// mazewars01.js - minimal world - showing we exist. We get an alert when a new user joins.
// mazewars02.js - add simple avatars w/ mouselook interface
// mazewars03.js - add missiles and collision detection
// mazewars04.js - fix textures, add powerup with fake glow, add wobble shader
// mazewars05.js - better missiles. Maze walls are instanced. Generate the maze.
//------------------------------------------------------------------------------------------
// issues:
// the missile is not visible when it is created sometimes - though the glow is visible
//------------------------------------------------------------------------------------------

import { App, StartWorldcore, ViewService, ModelRoot, ViewRoot,Actor, mix,
    InputManager, AM_Spatial, PM_Spatial, PM_Smoothed, Pawn, AM_Avatar, PM_Avatar, UserManager, User,
    toRad, q_yaw, q_pitch, q_axisAngle, v3_add, v3_sub, v3_normalize, v3_rotate, v3_scale, v3_distanceSqr } from "@croquet/worldcore-kernel";
import { THREE, ADDONS, CustomShaderMaterial, PM_ThreeVisible, ThreeRenderManager, PM_ThreeCamera, PM_ThreeInstanced, ThreeInstanceManager } from "@croquet/worldcore-three";
import FakeGlowMaterial from './src/FakeGlowMaterial.js';
//import { generateSnow, tickSnow } from './src/snow.js';

// Illustration 112505376 / 360 Sky © Planetfelicity | Dreamstime.com
import sky from "./assets/textures/alienSky1.jpg";
// import sky from "./assets/textures/hell.png";
// https://www.texturecan.com/details/616/
/**/
import wall_color from "./assets/textures/others/others_0035_color_2k.jpg";
import wall_normal from "./assets/textures/others/others_0035_normal_opengl_2k.png";
import wall_roughness from "./assets/textures/others/others_0035_roughness_2k.jpg";
import wall_displacement from "./assets/textures/others/others_0035_height_2k.png";
import wall_metalness from "./assets/textures/others/others_0035_metallic_2k.jpg";

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

import lava_color from "./assets/textures/lava/ground_0027_color_2k.jpg";
import lava_normal from "./assets/textures/lava/ground_0027_normal_opengl_2k.png";
import lava_roughness from "./assets/textures/lava/ground_0027_roughness_2k.jpg";
import lava_displacement from "./assets/textures/lava/ground_0027_height_2k.png";
import lava_emissive from "./assets/textures/lava/ground_0027_emissive_2k.jpg";

import apiKey from "./src/apiKey.js";
import eyeball_glb from "./assets/eyeball.glb";

import fireballTexture from "./assets/textures/explosion.png";
import * as fireballFragmentShader from "./src/shaders/fireball.frag.js";
import * as fireballVertexShader from "./src/shaders/fireball.vert.js";
import wobbleFragmentShader from "#glsl/wobble.frag.glsl";
import wobbleVertexShader from "#glsl/wobble.vert.glsl";

// Global Variables
const PI_2 = Math.PI/2;
const PI_4 = Math.PI/4;
const MISSILE_LIFE = 4000;
const COLLIDE_DIST = 8; // 2x eyeball and missile radius
const COLLIDE_SQ = COLLIDE_DIST * COLLIDE_DIST;
const MISSILE_SPEED = 0.75;

export const sunBase = [25, 50, 5];
export const sunLight =  function() {
    const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
    sun.position.set(...sunBase);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far =200;
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400;
    sun.shadow.camera.bottom = -200;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 1.5;
    sun.shadow.blurSamples = 4;
    return sun;
}();

let readyToLoad = false;
let eyeball;

async function modelConstruct() {
    const gltfLoader = new ADDONS.GLTFLoader();
    const dracoLoader = new ADDONS.DRACOLoader();
    dracoLoader.setDecoderPath('./src/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    return [eyeball] = await Promise.all( [
        // add additional GLB files to load here
        gltfLoader.loadAsync( eyeball_glb ),
    ]);
}

modelConstruct().then( readyToLoad = true );

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


const uniforms = {
    uTime: new THREE.Uniform(0),
    uPositionFrequency: new THREE.Uniform(0.5),
    uTimeFrequency: new THREE.Uniform(0.4),
    uStrength: new THREE.Uniform(0.3),
    uWarpPositionFrequency: new THREE.Uniform(0.38),
    uWarpTimeFrequency: new THREE.Uniform(0.12),
    uWarpStrength: new THREE.Uniform(1.7),
    uColorA: new THREE.Uniform(new THREE.Color(0xffff88)),
    uColorB: new THREE.Uniform(new THREE.Color(0xee0000))
};

const wobbleMaterial = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshPhysicalMaterial,
    uniforms,
    vertexShader: wobbleVertexShader,
    fragmentShader: wobbleFragmentShader,
    metalness: 0,
    roughness: 0.5,
    color: '#ffffff',
    transmission: 0,
    ior: 1.5,
    thickness: 1.5,
    transparent: true,
    wireframe: false
});

const depthMaterial = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshDepthMaterial,
    vertexShader: wobbleVertexShader,
    silent: true,

    // MeshDepthMaterial
    depthPacking: THREE.RGBADepthPacking
});

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
    material.needsUpdate = true;
    console.log(options.name, material);
    return material;
}

const missileMaterial = complexMaterial({
    colorMap: missile_color,
    normalMap: missile_normal,
    roughnessMap: missile_roughness,
    metalnessMap: missile_metalness,
    displacementMap: missile_displacement,
    repeat: [1.5,1],
    displacementScale: 0.1,
    displacementBias: -0.05,
    name: "missile"
});

const powerMaterial = complexMaterial({
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

const wallMaterial = complexMaterial({
    colorMap: wall_color,
    normalMap: wall_normal,
    roughnessMap: wall_roughness,
    metalnessMap: wall_metalness,
    displacementMap: wall_displacement,
    displacementScale: 1.5,
    displacementBias: -0.8,
    anisotropy: 4,
    metalness: 0.1,
    roughness: 0.20,
    repeat: [2, 1],
    name: "wall"
});

//------------------ 1.1. MAZE GENERATOR -----------------------
// This generates a (mostly) braided maze. That is a kind of maze that has no dead ends. This actually does have dead ends
// on the edges, but I decided to leave it as is.

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
          //delete this.map[x][y].N;
          //delete this.map[x][y].W;
          delete this.map[x][y].seen;
        }
      }
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
        const r = q_axisAngle([0,1,0],Math.PI/2);
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
//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------
class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
         super.init(options);
         this.rows = 20;
         this.columns = 20;
         this.cellSize = 20;
         const xOffset = (this.rows*this.cellSize)/2;
         const zOffset = (this.columns*this.cellSize)/2;
         this.set({translation: [xOffset,-5,zOffset]});
         this.power = PowerActor.create({parent: this, translation: [5,3,5]});
         MazeActor.create({rows: this.rows, columns: this.columns, cellSize: this.cellSize});
    }
}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
// This is the ground of the world. We generate a simple plane of worldX by worldY in size
// and compute the Perlin noise value at each x/z position to determine the height.
// We then renormalize the mesh vectors.
//------------------------------------------------------------------------------------------
export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        const floorMat = complexMaterial({
            colorMap: lava_emissive,
            normalMap: lava_normal,
            roughnessMap: lava_roughness,
            //metalnessMap: lava_metalness,
            displacementMap: lava_displacement,
            emissiveMap: lava_emissive,
            //emissiveIntensity: 10,
            emissive: new THREE.Color(0xffffff),
            repeat: [this.actor.rows, this.actor.columns],
            displacementScale: 1.5,
            displacementBias: -0.8,
            roughness: 0.30,
            name: "floor"
        });/*
        const floorMat = complexMaterial({
            colorMap: floor_color,
            normalMap: floor_normal,
            roughnessMap: floor_roughness,
            metalnessMap: floor_metalness,
            displacementMap: floor_displacement,
            repeat: [20, 20],
            anisotropy: 4,
            name: "floor"
        });*/
        floorMat.envMap = null;
        this.material = floorMat;
        this.geometry = new THREE.PlaneGeometry(this.actor.rows*this.actor.cellSize, this.actor.columns* this.actor.cellSize);
        this.geometry.rotateX(toRad(-90));
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;
        this.setRenderObject(base);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyUserManager];
    }

    init(options) {
        super.init(options);
        this.base = BaseActor.create();
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, AvatarManager, ThreeInstanceManager];
    }

    onStart() {
        this.buildLights();
    }

    buildLights() {
        const loader = new THREE.TextureLoader();
        loader.load( sky, skyTexture => {
            const rm = this.service("ThreeRenderManager");
            //rm.doRender = false;
            rm.renderer.shadowMap.enabled = true;
            rm.renderer.shadowMap.type = THREE.PCFShadowMap;
            rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
            rm.renderer.toneMapping = THREE.NeutralToneMapping;
            const ambient = new THREE.AmbientLight( 0xffffff, 0.2 );
            rm.scene.add(ambient);
            rm.scene.add(sunLight); // this is a global object
            rm.scene.fog = new THREE.Fog( 0x9D5D4D, 800, 1500 );
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(skyTexture);
            skyEnvironment.encoding = THREE.LinearSRGBColorSpace;
            rm.scene.background = skyEnvironment.texture;
            rm.scene.environment = skyEnvironment.texture;
        } );
    }
}

//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
// This is you. Most of the control code for the avatar is in the pawn in Avatar.js.
//------------------------------------------------------------------------------------------
class AvatarActor extends mix(Actor).with(AM_Spatial, AM_Avatar) {
    get pawn() { return "AvatarPawn" }

    init(options) {
        super.init(options);
        this.isAvatar = true;
        this.canShoot = true;
        this.set({translation: [40*(0.5-Math.random()),5,40*(0.5-Math.random())]});
        this.eyeball = EyeballActor.create({parent: this});
        this.listen("shootMissile", this.shootMissile);
    }

    shootMissile() {
        console.log("AvatarActor shootMissile");
        this.canShoot = false;
        this.future(MISSILE_LIFE).reloadMissile();
        MissileActor.create({parent: this.parent, avatar: this});
    }

    reloadMissile() {
        console.log("AvatarActor reloadMissile");
        this.canShoot = true;
    }

    kill() {
        console.log("testCollision", this.id, "KILLED");
        FireballActor.create({parent: this});
    }
}
AvatarActor.register('AvatarActor');

class EyeballActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "EyeballPawn" }
}
EyeballActor.register('EyeballActor');

class EyeballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCamera) {

    constructor(actor) {
        super(actor);
        this.pitch = q_pitch(this.rotation);
        this.pitchQ = q_axisAngle([1,0,0], this.pitch);
        if ( !this.parent.isMyAvatar ) {
            this.load3D();
        } else this.parent.eyeball = this;
        this.shootNow = true;
    }

    load3D() {
        if (this.doomed) return;
        if (readyToLoad && eyeball) {
            this.eye = eyeball.scene.clone();
            this.eye.scale.set(50,50,50);
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
        if (this.avatar3D) {
            this.destroy3D( this.avatar3D );
        }
        super.destroy();
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

//------------------------------------------------------------------------------------------
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
        this.yaw = q_yaw(this.rotation);
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
        this.service("AvatarManager").avatars.add(this);
        //const snow = generateSnow();
        //this.setRenderObject(snow);
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
        //this.shootSound.stop();
       //playSound(shootSound, this.tank, false);
    }

    shootMissile() {
        if (this.actor.canShoot) {
            console.log("shootMissile");
            this.say("shootMissile");
        } else {
            console.log("can't shoot");
        }
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
            case "I": case "i":
                if (this.developerMode === 5) console.log( "AvatarPawn", this );
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
        //tickSnow();
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
            const distanceSqr = v3_distanceSqr(translation, avatar.translation);
            if (distanceSqr < COLLIDE_SQ) {
                if (distanceSqr === 0) translation = this.translation;
                translation = v3_add(avatar.translation,
                    v3_scale(
                        v3_normalize(
                            v3_sub(translation, avatar.translation)), COLLIDE_DIST));

            }
        }
        this.positionTo(translation, this.yawQ);
        sunLight.position.set(...v3_add(translation, sunBase));
    }
}

AvatarPawn.register("AvatarPawn");
//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
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
        const base = this.wellKnownModel("ModelRoot").base;

        this.avatar = AvatarActor.create({
            parent: base,
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

//------------------------------------------------------------------------------------------
//-- AvatarManager ----------------------------------------------------------------------
// Easy to find all of the avatars in the world
//------------------------------------------------------------------------------------------
class AvatarManager extends ViewService {

    constructor() {
        super("AvatarManager");
        this.avatars = new Set();
    }
}

//------------------------------------------------------------------------------------------
//--MissileActor ---------------------------------------------------------------------------
// Fired by the avatar - they destroy the other players but bounce off of everything else
//------------------------------------------------------------------------------------------
class MissileActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "MissilePawn" }

    init(options) {
        super.init(options);
        this.future(8000).destroy(); // destroy after some time
        this.translation = [...this._avatar.translation];
        this.rotation = [...this._avatar.rotation];
        this.yaw = q_yaw(this.rotation);
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
        this.direction = v3_scale(v3_rotate(this.forward, this.yawQ), -1);
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.hasNotBounced = true;
        GlowActor.create({parent: this, color: 0x22aa44, depthTest: false, radius: 2, falloff: 0.05, opacity: 0.25});
        this.tick();
        //console.log("MissileActor init", this);
    }

    resetGame() {
        this.destroy();
    }

    tick() {
        // test for collisions
        const actors = this.wellKnownModel('ActorManager').actors;
        this.translation = v3_add(this.translation, v3_scale(this.direction, MISSILE_SPEED));
        actors.forEach(actor => { if (actor.isAvatar) this.testCollision(actor); });
        if (!this.doomed) this.future(10).tick();
    }

    testCollision( actor ) {
        //console.log("testCollision", actor.translation);
        if (actor.id === this._avatar.id && this.hasNotBounced) return; // don't kill yourself
        const distanceSqr = v3_distanceSqr(this.translation, actor.translation);
        if (distanceSqr < COLLIDE_SQ) {
            actor.kill();
            this.destroy();
        }
    }
}
MissileActor.register('MissileActor');

//------------------------------------------------------------------------------------------
// MissilePawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class MissilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.missile = this.createInstance();
        /*
        // Geometry
        let geometry = new THREE.IcosahedronGeometry(4, 50);
        geometry = ADDONS.BufferGeometryUtils.mergeVertices(geometry);
        geometry.computeTangents();

        // Mesh
        this.wobble = new THREE.Mesh(geometry, wobbleMaterial);
        this.wobble.customDepthMaterial = depthMaterial;
        this.wobble.castShadow = true;
        this.setRenderObject(this.wobble);
        */
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    //    if (this.geometry) this.geometry.dispose();
        //this.material.dispose();
    //    if (this.pointLight) this.pointLight.dispose();
    }
    createInstance() {
        const im = this.service("ThreeInstanceManager");
        let missile = this.useInstance("missile");
        if ( !missile ) {
            const geometry = new THREE.IcosahedronGeometry( 1, 20 );
            im.addMaterial("missile", missileMaterial);
            im.addGeometry("missile", geometry);
            im.addMesh("missile", "missile", "missile");
            missile = this.useInstance("missile");
        }
        missile.mesh.material.needsUpdate = true;
        missile.receiveShadow = true;
        return missile;
    }

    update(time, delta) {
        super.update(time, delta);
    //    this.wobble.material.uniforms[ 'uTime' ].value = time/100;
    }
}
MissilePawn.register("MissilePawn");

//------------------------------------------------------------------------------------------
//--FireballActor ---------------------------------------------------------------------------
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

    resetGame() {
        this.destroy();
    }
}
FireballActor.register('FireballActor');

//------------------------------------------------------------------------------------------
// FireballPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class FireballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        // console.log("FireballPawn constructor", this);
        this.startTime = this.now();
        this.material = fireMaterial;
        this.geometry = new THREE.IcosahedronGeometry( 8, 20 );
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
//------------------------------------------------------------------------------------------
//--PowerActor ---------------------------------------------------------------------------
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

    destroy() {
        this.releaseInstance();
        super.destroy();
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

    get radius() { return this._radius || 5 }
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
        const sphere = new THREE.SphereGeometry(2, 32, 32);
        console.log(this.color, this.radius);
        const material = new FakeGlowMaterial({
            glowColor: this.actor.color,
            glowInternalRadius: this.actor.radius,
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
        //this.releaseInstance();
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
export class WallPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeInstanced) {
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
        wall.receiveShadow = true;
        return wall;
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    }
}
WallPawn.register("WallPawn");
//------------------------------------------------------------------------------------------
//-- StartWorldcore ------------------------------------------------------------------------------
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