// mazewars - a tutorial reimagining of the original MazeWars game from the ground up
// Each version of the mazewars.js file is a step in the tutorial - and each is fully functional
// We start with a minimal working example and add features and improvements in each step
// You can switch between the versions by changing the entry point in the webpack.config.js file.
//------------------------------------------------------------------------------------------
// mazewars01.js - minimal world - showing we exist

import { App, Constants, StartWorldcore, ModelRoot, ViewRoot,Actor, mix,
    InputManager, HUD,AM_Spatial, PM_Spatial, Pawn,
    toRad } from "@croquet/worldcore-kernel";
import { THREE, PM_ThreeVisible, ThreeRenderManager } from "@croquet/worldcore-three";
import paper from "./assets/textures/paper.jpg";
// Illustration 112505376 / 360 Sky © Planetfelicity | Dreamstime.com
import sky from "./assets/textures/alienSky1.jpg";
import apiKey from "./assets/apiKey";

// Global Variables
export const sunBase = [50, 100, 10];
export const sunLight =  function() {
    const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
    sun.position.set(...sunBase);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far =400;
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400;
    sun.shadow.camera.bottom = -200;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 1.5;
    sun.shadow.blurSamples = 4;
    return sun;
}();
//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
// This is the ground plane.
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return "BasePawn"}

    init(options) {
         super.init(options);
         this.set({translation: [0,-2.5,0]});
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
        const worldX = 512, worldZ=512;
        const cellSize = 2.5;

        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
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
/*
    static modelServices() {
        return [MyUserManager];
    }
*/
    init(options) {
        super.init(options);

    //   this.gameState = GameStateActor.create({});

    //    this.subscribe("game", "endGame", this.endGame); // from GameState.destroyedBot
    //    this.subscribe("game", "startGame", this.startGame); // from BotHUD button

        this.base = BaseActor.create();

    //    this.startGame();
    }

    startGame() {
        console.log("Start Game");
        this.publish("game", "gameStarted"); // alert the users to remove the start button
    }

    endGame() {
        console.log("End Game");
        this.service('ActorManager').actors.forEach( value => {if (value.resetGame) value.future(0).resetGame();});
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
            rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
            const ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
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
