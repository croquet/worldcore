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
        console.log("Starting model!!!!!");
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
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
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

        // load all instanced/shared models once to prevent constant reloading whenever a new instance
        // of a model is created.
        this.loadSharedModels();
    }

    async loadSharedModels() {
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
        // save mesh for later use
        this.myMesh = obj.children[0];
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
        this.fireballObj = obj;
        // END FIREBALL LOADING // 

        // LOAD SPRAYPAWN / SLIME MODEL //
        objtxt = new THREE.TextureLoader().load( slime_txt );
        obj = await new Promise( (resolve, reject) => fbxLoader.load(slime_fbx, resolve, null, reject) );
        obj.children[0].scale.set( 0.2, 0.2, 0.2);
        obj.children[0].material.map = objtxt;
        obj.children[0].material.color = new THREE.Color(1, 1, 1);

        this.slimeObj = obj;
        console.log(this.slimeObj);
        console.log("finished loading slime object");
        // END SPRAYPAWN LOADING //

        // LOAD PLAYERCHARACTER / WIZARD MODEL //
        // END PLAYERCHARACTER LOADING //
    }

    resizeToWindow() {
        console.log("resizing!");
        this.render.camera.aspect = window.innerWidth / window.innerHeight;
        this.render.camera.updateProjectionMatrix();
        this.render.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createManagers() {
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
