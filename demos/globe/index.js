// Globe Demo
//
// Croquet Studios, 2022

import { App, ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, StartWorldcore, toRad, sphericalRandom, TAU, viewRoot } from "@croquet/worldcore-kernel";
import { UIManager, Widget, SliderWidget } from "@croquet/worldcore-widget";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

import earth_fbx from "./assets/earth_fbx.fbx";
import earth_txt from "./assets/earth_txt.jpg";

//------------------------------------------------------------------------------------------
// -- EarthActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actor for the earth. It has a tick that will rotate it slowly.

class EarthActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return EarthPawn}

    init(options = {}) {
        super.init(options);
        this.spin = 10;
        this.future(0).tick(0)
        this.subscribe("input", "pointerDown", this.onClick);
        this.subscribe("input", "keyDown", this.onClick);
    }

    tick(delta) {
        const spin = q_axisAngle([0,1,0], delta/1000 * toRad(this.spin));
        this.rotateTo(q_multiply(this.rotation, spin));
        this.future(50).tick(50);
    }

    onClick() {
        if (this.spin) {
            this.spin = 0;
        } else {
            this.spin = 15;
        }
    }
}
EarthActor.register('EarthActor');

//------------------------------------------------------------------------------------------
// -- EarthPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The pawn for the earth. It loads an fbx model to display.
//
// Note that the loader returns a group with the actual model as the first child. We also
// load the texture separately and add it to the material.
//
// Model from https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa

class EarthPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const loader = new FBXLoader();
        loader.load(earth_fbx, obj => {
            this.model = obj;
            this.setRenderObject(this.model);
            let texture = new THREE.TextureLoader().load(earth_txt);
            const material = new THREE.MeshStandardMaterial({ map: texture });
            this.model.children[0].material = material;
            this.model.children[0].castShadow = true;
            this.model.children[0].receiveShadow = true;
            this.model.castShadow = true;
            this.model.receiveShadow = true;
            // e = this.model;
        });

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.model.children.forEach( child => {
            child.material.map.dispose();
            child.material.dispose();
            child.geometry.dispose();
        })
    }

}

//------------------------------------------------------------------------------------------
// -- MyModelRoot --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the scene graph and the earth itself are the only thing created in the model
// at start up.

class MyModelRoot extends ModelRoot {

    init(...args) {
        super.init(...args);
        EarthActor.create();
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// -- MyViewRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We create the three.js lighting and camera right in the view root. We also create the two
// sliders that control the orbit of the local satellite.

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [ InputManager, {service: ThreeRenderManager, options: {alpha: true}}];
    }

    constructor(model) {
        super(model);

        const threeRenderManager = this.service("ThreeRenderManager");

        this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), threeRenderManager.scene, threeRenderManager.camera );
        this.outlinePass.edgeStrength = 4;
        threeRenderManager.composer.addPass( this.outlinePass );

        // threeRenderManager.renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0));
        threeRenderManager.renderer.setClearColor(0x000000,  0);
        threeRenderManager.camera.position.set(0,0,250);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.45 );
        const sun = new THREE.SpotLight( 0xffffff, 0.95 );
        sun.position.set(500, 0, 500);
        sun.angle= toRad(30);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 100;
        sun.shadow.camera.far = 1000;

        lighting.add(ambient);
        lighting.add(sun);
        threeRenderManager.scene.add(lighting);

        threeRenderManager.renderer.shadowMap.enabled = true;
        threeRenderManager.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

}

//------------------------------------------------------------------------------------------
// -- Start --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// High tick rate so the rotation is smooth.

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.globe',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: App.autoSession(),
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 60,
});



