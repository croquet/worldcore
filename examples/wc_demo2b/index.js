// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, ActorManager, ThreeRenderManager, PawnManager, PlayerManager, RapierPhysicsManager,
    toRad, LoadRapier } from "@croquet/worldcore";
import { LevelActor } from "./src/Level";
import { MyPlayerPawn } from "./src/Player";
import { GameScreen } from "./src/HUD";

import * as THREE from 'three';

import { FBXLoader } from "./loaders/FBXLoader.js";

import fireball_txt from "./assets/fireball_greyscale.png";
import fireball_fbx from "./assets/fireball_mesh.fbx";
import slime_txt from "./assets/slime_texture.png";
import slime_fbx from "./assets/slime_mesh.fbx";

const ASSETS = {
    "./lambert5_Base_Color.png": fireball_txt,
    "./lambert1_Base_Color.png": slime_txt, // this doesn't seem to do anything?
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    //console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting model!!!!!!");
        this.seedColors();
        this.level = LevelActor.create();
        this.actors = [];
    }

    destroy() {
        this.level.destroy();
        super.destroy();
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 20}));
        this.actorManager = this.addManager(ActorManager.create());
    }

    seedColors() {
        this.colors = [];
        let colorRNG = 0;
        let primary = [0, 0];
        let secondary = [1, 0];
        let tertiary = [2, 0];
        let selectedColor = [0, 0, 0];
        for (let i = 0; i < 100; i++ ) {
            colorRNG = Math.floor( Math.random() * 6);
            primary[1] = 0.3*Math.random() + 0.7;
            secondary[1] = 0.5*Math.random() + 0.5;
            tertiary[1] = 0.3*Math.random();
            switch (colorRNG)
        {
            case 0:
                primary[0] = 0;
                secondary[0] = 1;
                tertiary[0] = 2;
                break;
            case 1:
                primary[0] = 0;
                secondary[0] = 2;
                tertiary[0] = 1;
                break;
            case 2:
                primary[0] = 1;
                secondary[0] = 2;
                tertiary[0] = 0;
                break;
            case 3:
                primary[0] = 1;
                secondary[0] = 0;
                tertiary[0] = 2;
                break;
            case 4:
                primary[0] = 2;
                secondary[0] = 0;
                tertiary[0] = 1;
                break;
            case 5:
                primary[0] = 2;
                secondary[0] = 1;
                tertiary[0] = 0;
                break;
            default:
                break;
        }
        selectedColor[primary[0]] = primary[1];
        selectedColor[secondary[0]] = secondary[1];
        selectedColor[tertiary[0]] = tertiary[1];
            this.colors.push([selectedColor[0], selectedColor[1], selectedColor[2], 1]);
        }
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        /*
        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);

        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);

        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.05);
            ao.density = 0.3;
            ao.falloff = 0.5;
        }
        */
       this.debugCollision = false;
        this.resizeToWindow();
        this.render.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const minUI = Math.min(this.ui.size[0], this.ui.size[1]);
        let s = 1;
        if (minUI < 600) s = minUI / 600;

        this.ui.setScale(s);

        this.gameScreen = new GameScreen(this.ui.root, {autoSize: [1,1]});
        this.subscribe("input", "resize", this.resizeToWindow);
    }

    async loadSharedModels() {
        this.fireballPromise = this.loadFireball();
        this.slimePromise = this.loadSlime();
    }

    async loadFireball() {
        console.log("Start loading fireball");
        // LOAD FIREBALL / PLAYER PROJECTILE MODEL //
        let objtxt = new THREE.TextureLoader().load( fireball_txt );
        const fbxLoader = new FBXLoader(assetManager);

        // load model from fbxloader
        let obj = await new Promise( (resolve, reject) => fbxLoader.load(fireball_fbx, resolve, null, reject) );

        // create material with custom settings to apply to loaded model
        let material = new THREE.MeshStandardMaterial( {map: objtxt,
            flatShading: false,
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100 } );
        // overwrite material
        obj.children[0].material = material;
        obj.children[0].position.set(0,0,0);
        obj.children[0].scale.set( 0.2, 0.2, 0.2);
        obj.children[0].rotation.set(0,0,0);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        obj.castShadow = true;
        obj.receiveShadow = true;

        if (this.debugCollision)
        {
            const threeColor = new THREE.Color(255, 255, 255);
            const geometry = new THREE.SphereBufferGeometry(
                this.actor.collisionScale, 12, 12 );
            const debugmaterial = new THREE.MeshStandardMaterial( {wireframe: true, color: threeColor} );
            let cube = new THREE.Mesh( geometry, debugmaterial );
            cube.position.set(this.actor.collisionLocation[0] * 20,
                this.actor.collisionLocation[1] * 20,
                this.actor.collisionLocation[2] * 20);
            obj.add(cube);
        }
        console.log("Finished loading fireball.");
        return obj;
    }

    async loadSlime() {
        // LOAD SPRAYPAWN / SLIME MODEL //
        console.log("Start loading slime");
        const objtxt = new THREE.TextureLoader().load( slime_txt );
        const fbxLoader = new FBXLoader(assetManager);
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(slime_fbx, resolve, null, reject) );
        obj.children[0].scale.set( 0.2, 0.2, 0.2);
        obj.children[0].material.map = objtxt;
        obj.children[0].material.color = new THREE.Color(1, 1, 1);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        obj.castShadow = true;
        obj.receiveShadow = true;

        console.log("finished loading slime object");
        return obj;
        // END SPRAYPAWN LOADING //
    }

    resizeToWindow() {
        console.log("resizing!");
        this.render.camera.aspect = window.innerWidth / window.innerHeight;
        this.render.camera.updateProjectionMatrix();
        this.render.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createManagers() {
        // start loading all instanced/shared models once to prevent constant reloading whenever a new instance
        // of a model is created. Needs to happen *before* creating pawns so the promises are there.
        this.loadSharedModels();

        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new ThreeRenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

        // create custom chords necessary for input
        this.webInput.addChord("strafeLeft", ['ArrowLeft', 'Shift']);
        this.webInput.addChord("spinLeft", ['ArrowLeft'], ['Shift']);
        this.webInput.addChord("strafeRight", ['ArrowRight', 'Shift']);
        this.webInput.addChord("spinRight", ['ArrowRight'], ['Shift']);
    }

}

async function go() {
    await LoadRapier();
    App.makeWidgetDock();
    const session = await Session.join(`wc-demo2-${App.autoSession()}`, MyModelRoot, MyViewRoot, {tps: 20});
}

go();
