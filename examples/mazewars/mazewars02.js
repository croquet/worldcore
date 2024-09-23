// mazewars - a tutorial reimagining of the original MazeWars game from the ground up
// Each version of the mazewars.js file is a step in the tutorial - and each is fully functional
// We start with a minimal working example and add features and improvements in each step
// You can switch between the versions by changing the entry point in the webpack.config.js file.
//------------------------------------------------------------------------------------------
// mazewars01.js - minimal world - showing we exist. We get an alert when a new user joins.
// mazewars02.js - add simple avatars

import { App, Constants, StartWorldcore, ModelRoot, ViewRoot,Actor, mix,
    InputManager, AM_Spatial, PM_Spatial, PM_Smoothed, Pawn, AM_Avatar, PM_Avatar, UserManager, User,
    toRad, q_yaw, q_pitch, q_axisAngle, v3_add, v3_rotate, v3_scale } from "@croquet/worldcore-kernel";
import { THREE, ADDONS, PM_ThreeVisible, ThreeRenderManager, PM_ThreeCamera } from "@croquet/worldcore-three";
import paper from "./assets/textures/paper.jpg";
// Illustration 112505376 / 360 Sky © Planetfelicity | Dreamstime.com
import sky from "./assets/textures/alienSky1.jpg";
import apiKey from "./assets/apiKey";
import eyeball_glb from "./assets/eyeball.glb";

// Global Variables
const PI_2 = Math.PI/2;
const PI_4 = Math.PI/4;
const MISSILE_LIFE = 4000;

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

let eyeball;
async function eyeConstruct() {
    const gltfLoader = new ADDONS.GLTFLoader();
    const dracoLoader = new ADDONS.DRACOLoader();
    const baseUrl = window.location.origin;
    dracoLoader.setDecoderPath(`${baseUrl}/assets/draco/`);
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load( eyeball_glb, gltf => eyeball = gltf.scene );
}

eyeConstruct();

//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
         super.init(options);
         this.set({translation: [0,-5,0]});
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
    constructor(actor) {
        console.log("BasePawn constructor");
        super(actor);
        const worldX = 256, worldZ=256;
        const cellSize = 2.5;

        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 10, 10 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.8, 0.5, 0.2), map: this.paperTexture} );
        this.geometry = new THREE.PlaneGeometry(worldX*cellSize,worldZ*cellSize, worldX, worldZ);
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
        return [InputManager, ThreeRenderManager];
    }

    onStart() {
        this.buildLights();
    }

    buildLights() {
        const loader = new THREE.TextureLoader();
        loader.load( sky, skyTexture => {
            const rm = this.service("ThreeRenderManager");
            //rm.renderer.shadowMap.enabled = true;
            //rm.renderer.shadowMap.type = THREE.PCFShadowMap;
            rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
            const ambient = new THREE.AmbientLight( 0xffffff, 0.2 );
            rm.scene.add(ambient);
            rm.scene.add(sunLight); // this is a global object
            rm.scene.fog = new THREE.Fog( 0x9D5D4D, 200, 400 );
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
    }

    reloadMissile() {
        console.log("AvatarActor reloadMissile");
        this.canShoot = true;
    }
}
AvatarActor.register('AvatarActor');

class EyeballActor extends mix(Actor).with(AM_Spatial,) {
    get pawn() { return "EyeballPawn" }
}
EyeballActor.register('EyeballActor');

//------------------------------------------------------------------------------------------
// AvatarPawn
// The avatar is designed to instantly react to user input and the publish those changes
// so other users are able to see and interact with this avatar. Though there will be some latency
// between when you see your actions and the other users do, this should have a minimal
// impact on gameplay.
//------------------------------------------------------------------------------------------

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
        if (eyeball) {
            this.eye = eyeball.clone();
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

class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar) {

    constructor(actor) {
        super(actor);
        this.yaw = q_yaw(this.rotation);
        this.yawQ = q_axisAngle([0,1,0], this.yaw);
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

    doPointerMove(e) {
    const xy = e.xy;
    console.log("AvatarPawn.onPointerMove()", e);
    }

//    doPointerTap() {
//        this.shootNow = true;
//        this.shootMissile();
//        this.shootNow = false;
//    }

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
                    console.log(this.yaw, this.strafe*PI_2, this.yaw+PI_2);
                    const leftQ = q_axisAngle([0,1,0], this.yaw+PI_2);
                    const left = v3_rotate([0,0,-1], leftQ);
                    const leftVelocity = v3_scale(left, strafeSpeed);
                    velocity = v3_add(velocity, leftVelocity);
                }
                // set translation to limit after any collision
                const translation = v3_add(this.translation, velocity);
                this.positionTo(translation, this.yawQ);
                sunLight.position.set(...v3_add(translation, sunBase));
            }
        }
    }

    goHome() {
        const translation = [this.random() * 10-5, 0, this.random()*10-5];
        this.yaw = Math.PI/2;
        const rotation = q_axisAngle([0,1,0], this.yaw);

        this.positionTo(translation, rotation);
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

        const placementAngle = Math.random() * Math.PI * 2;
        const placementDist = 15 + Math.random() * 30; // 15 to 45 (closest bollard is around 50 from centre)
        // choose an orientation that isn't out along the placement spoke, in case
        // we're near the tower and the camera behind us gets blocked
        const yaw = placementAngle + Math.PI + (1 - Math.random() * 2) * Math.PI/2;
        const props = options.savedProps || {
            translation: [placementDist * Math.sin(placementAngle), 0, placementDist * Math.cos(placementAngle)],
            rotation: q_axisAngle([0,1,0], yaw),
        };

        this.avatar = AvatarActor.create({
            parent: base,
            driver: this.userId,
            tags: ["avatar", "block"],
            ...props
        });
    }

    destroy() {
        super.destroy();
        if (this.avatar) this.avatar.destroy();
    }
}
MyUser.register('MyUser');
//------------------------------------------------------------------------------------------
//-- StartWorldcore ------------------------------------------------------------------------------
// We either start or join a Croquet session here.
// If we are using the lobby, we use the session name in the URL to join an existing session.
// If we are not using the lobby, we create a new session.
//------------------------------------------------------------------------------------------

// redirect to lobby if not in iframe or session
const inIframe = window.parent !== window;
const url = new URL(window.location.href);
const sessionName = url.searchParams.get("session");
url.pathname = url.pathname.replace(/[^/]*$/, "index.html");
if (!inIframe || !sessionName) window.location.href = url.href;

// ensure unique session per lobby URL
const BaseUrl = url.href.replace(/[^/?#]*([?#].*)?$/, "");
Constants.LobbyUrl = BaseUrl + "index.html";    // hashed into sessionId without params

// QR code points to lobby, with session name in hash
url.searchParams.delete("session");
url.hash = encodeURIComponent(sessionName);
App.sessionURL = url.href;

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
