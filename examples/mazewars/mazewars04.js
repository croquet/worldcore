// mazewars - a tutorial reimagining of the original MazeWars game from the ground up
// Each version of the mazewars.js file is a step in the tutorial - and each is fully functional
// We start with a minimal working example and add features and improvements in each step
// You can switch between the versions by changing the entry point in the webpack.config.js file.
//------------------------------------------------------------------------------------------
// mazewars01.js - minimal world - showing we exist. We get an alert when a new user joins.
// mazewars02.js - add simple avatars w/ mouselook interface
// mazewars03.js - add missiles and collision detection
// mazewars04.js - fix textures, add powerup with fake glow, add wobble shader

import { App, StartWorldcore, ViewService, ModelRoot, ViewRoot,Actor, mix,
    InputManager, AM_Spatial, PM_Spatial, PM_Smoothed, Pawn, AM_Avatar, PM_Avatar, UserManager, User,
    toRad, q_yaw, q_pitch, q_axisAngle, v3_add, v3_sub, v3_normalize, v3_rotate, v3_scale, v3_distanceSqr } from "@croquet/worldcore-kernel";
import { THREE, ADDONS, CustomShaderMaterial, PM_ThreeVisible, ThreeRenderManager, PM_ThreeCamera } from "@croquet/worldcore-three";
import FakeGlowMaterial from './src/FakeGlowMaterial.js'
//import paper from "./assets/textures/paper.jpg";
// Illustration 112505376 / 360 Sky © Planetfelicity | Dreamstime.com
import sky from "./assets/textures/alienSky1.jpg";
// https://www.texturecan.com/details/616/
/**/
import wall_color from "./assets/textures/others/others_0035_color_2k.jpg";
import wall_normal from "./assets/textures/others/others_0035_normal_opengl_2k.png";
import wall_roughness from "./assets/textures/others/others_0035_roughness_2k.jpg";
import wall_displacement from "./assets/textures/others/others_0035_height_2k.png";
import wall_metalness from "./assets/textures/others/others_0035_metallic_2k.jpg";
/*
import power_color from "./assets/textures/metal_gold_vein/metal_0080_color_2k.jpg";
import power_normal from "./assets/textures/metal_gold_vein/metal_0080_normal_opengl_2k.png";
import power_roughness from "./assets/textures/metal_gold_vein/metal_0080_roughness_2k.jpg";
import power_displacement from "./assets/textures/metal_gold_vein/metal_0080_height_2k.png";
import power_metalness from "./assets/textures/metal_gold_vein/metal_0080_metallic_2k.jpg";
*/
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
    const baseUrl = window.location.origin;
    dracoLoader.setDecoderPath('./src/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    return [eyeball] = await Promise.all( [
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


    material.needsUpdate = true;
    return material;
}

function createWall() {
    // Wall dimensions
    const width = 20; // 16 feet
    const height = 10; // 10 feet
    const depth = 0.5; // Thin wall

    // Create geometry
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = complexMaterial({
        colorMap: wall_color,
        normalMap: wall_normal,
        //normalScale: new THREE.Vector2(1, 1),
        roughnessMap: wall_roughness,
        roughness: 0.20,
        metalnessMap: wall_metalness,
        metalness: 0.1,
        displacementMap: wall_displacement,
        displacementScale: 1.5,
        displacementBias: -0.8,
        anisotropy: 4,
        repeat: [2, 1],
        name: "wall"
    });
    // Create mesh
    const wall = new THREE.Mesh(geometry, material);
    wall.castShadow=true; wall.receiveShadow=true;
    return wall;
}

function createPower() {
    const geometry = new THREE.IcosahedronGeometry( 1, 20 );
    const material = complexMaterial({
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

    let glowMaterial = new FakeGlowMaterial({
        color: 0xff8844,
        intensity: 1,
        glowIntensity: 1,
        glowColor: 0xff8844,
        glowRadius: 5,
        innerGlow: true,
        transparent: true,
        depthTest: true
    });
    let sphere = new THREE.SphereGeometry(2, 32, 32);
    let glow = new THREE.Mesh(sphere, glowMaterial);
    const power = new THREE.Mesh(geometry, material);
    power.add(glow);
    power.receiveShadow = true;
    return power;
}
//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------
class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
         super.init(options);
         this.set({translation: [0,-5,0]});
         this.power = PowerActor.create({parent: this, translation: [5,3,5]});
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
            repeat: [10, 10],
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
        this.geometry = new THREE.PlaneGeometry(200,200);
        this.geometry.rotateX(toRad(-90));
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;
        const wall00 = createWall();
        wall00.position.set(0,5,0);
        base.add(wall00);
        const wall01 = createWall();
        wall01.position.set(0,5,20);
        base.add(wall01);
        const wall02 = createWall();
        wall02.position.set(20,5,0);
        base.add(wall02);
        const wall03 = createWall();
        wall03.position.set(20,5,20);
        base.add(wall03);
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
        return [InputManager, ThreeRenderManager, AvatarManager];
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
            const ambient = new THREE.AmbientLight( 0xffffff, 0.2 );
            rm.scene.add(ambient);
            rm.scene.add(sunLight); // this is a global object
            rm.scene.fog = new THREE.Fog( 0x9D5D4D, 800, 1500 );
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(skyTexture);
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
        console.log(this.parent);
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
export class MissilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        // Geometry
        let geometry = new THREE.IcosahedronGeometry(4, 50);
        geometry = ADDONS.BufferGeometryUtils.mergeVertices(geometry);
        geometry.computeTangents();

        // Mesh
        this.wobble = new THREE.Mesh(geometry, wobbleMaterial);
        this.wobble.customDepthMaterial = depthMaterial;
        this.wobble.castShadow = true;
        this.setRenderObject(this.wobble);
    }

    destroy() {
        super.destroy();
        if (this.geometry) this.geometry.dispose();
        //this.material.dispose();
        if (this.pointLight) this.pointLight.dispose();
    }

    update(time, delta) {
        super.update(time, delta);
        this.wobble.material.uniforms[ 'uTime' ].value = time/100;
    }
}
MissilePawn.register("MissilePawn");

//------------------------------------------------------------------------------------------
//--FireActor ---------------------------------------------------------------------------
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
//--FPowerActor ---------------------------------------------------------------------------
// When a missile hits an avatar a fireball is generated. It is attached to the avatar.
//------------------------------------------------------------------------------------------


class PowerActor extends mix(Actor).with(AM_Spatial) {
    get pawn() { return "PowerPawn" }

    init(options) {
        super.init(options);
        this.center = this.translation[1];
        this.timeScale = 0.00025 + Math.random()*0.00002;
        this.offset = Math.random()*Math.PI;
        console.log("PowerActor init", this, this.parent);
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
// FireballPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export class PowerPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        console.log("PowerPawn constructor", this);
        this.startTime = this.now();
        this.power = createPower();
        this.setRenderObject(this.power);
    }

    destroy() {
        super.destroy();
        //if (this.geometry) this.geometry.dispose();
        //this.material.dispose();
        //if (this.pointLight) this.pointLight.dispose();
    }
}
PowerPawn.register("PowerPawn");


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
