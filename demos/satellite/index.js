// Satellite Demo
//
// Croquet Studios, 2021

import { App, ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, StartWorldcore, toRad, sphericalRandom, TAU, viewRoot } from "@croquet/worldcore-kernel";
import { UIManager, Widget, SliderWidget } from "@croquet/worldcore-widget";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

import earth_fbx from "./assets/earth_fbx.fbx";
import earth_txt from "./assets/earth_txt.jpg";


//------------------------------------------------------------------------------------------
// -- FrameActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A simple actor that just holds a position in the screen graph.

class FrameActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return FramePawn}
}
FrameActor.register('FrameActor');

//------------------------------------------------------------------------------------------
// -- FramePawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Pawns inherit tug from their parents. We set the tug of the screen log to a low value
// so movement is smoother.

class FramePawn extends mix(Pawn).with(PM_Smoothed) {
    constructor(...args) {
        super(...args);
        this.tug = 0.01;
    }
}

//------------------------------------------------------------------------------------------
// -- EarthActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actor for the earth. It has a tick that will rotate it slowly.

class EarthActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return EarthPawn}

    init(options = {}) {
        super.init(options);
        this.future(0).tick(0)
    }

    tick(delta) {
        const spin = q_axisAngle([0,1,0], delta/1000 * toRad(2));
        this.rotateTo(q_multiply(this.rotation, spin));
        this.future(50).tick(50);
    }
}
EarthActor.register('EarthActor');

let e;

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
            e = this.model;
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
// -- TiltActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actor controlling the tilt of the satellite's rotation. It doesn't have any code because
// all the work is done in the Avatar mixin.

class TiltActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() { return TiltPawn }

}
TiltActor.register('TiltActor');

//------------------------------------------------------------------------------------------
// -- TiltPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The pawn controlling the tilt. It listens for angle changes from the UI, then sends the
// the new rotation axis to the actor.
//
// Note the use of that avatar's throttle to avoid overloading the reflector. Also the pawn
// only listens for inputs if its owned by the local player. That way you only control
// one satellite at a time.

class TiltPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {

    constructor(...args) {
        super(...args);
        this.rotateThrottle = 200;
        if (this.isMyPlayerPawn) this.subscribe("hud", "angle", this.onChangeAngle);
    }

    onChangeAngle(a) {
        const angle = -(2*a-1) * Math.PI/2;
        const q = q_axisAngle([0,0,1], angle);
        this.throttledRotateTo(q);
    }

}

//------------------------------------------------------------------------------------------
// -- AxisActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actor controlling the orbital rotation of the satellite. It has a tick that rotates
// it at constant rate.

class AxisActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() { return AxisPawn }

    init(options = {}) {
        options.rotation = q_axisAngle([0,1,0], Math.random() * TAU);
        super.init(options);
        this.future(0).tick(0)
    }

    tick(delta) {
        const spin = q_axisAngle([0,1,0], delta/1000 * toRad(20));
        this.rotateTo(q_multiply(this.rotation, spin));
        this.future(50).tick(50);
    }
}
AxisActor.register('AxisActor');

//------------------------------------------------------------------------------------------
// -- AxisPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Doesn't do anything, but we need it for the avatar and player mixins.

class AxisPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {
}

//------------------------------------------------------------------------------------------
// -- OrbitActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actor controlling the radius of the satellite's orbit. It doesn't have any code because
// all the work is done in the Avatar mixin.

class OrbitActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return OrbitPawn}

}
OrbitActor.register('OrbitActor');

//------------------------------------------------------------------------------------------
// -- OrbitPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The pawn controlling the radius. It listens for changes from the UI, then sends the
// the new rotation axis to the actor.
//
// Note the use of that avatar's throttle to avoid overloading the reflector. Also the pawn
// only listens for inputs if its owned by the local player. That way you only control
// one satellite at a time.

class OrbitPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {

    constructor(...args) {
        super(...args);
        this.moveThrottle = 200;
        if (this.isMyPlayerPawn) this.subscribe("hud", "radius", this.onChangeRadius);
    }

    onChangeRadius(r) {
        const radius = 120 + r * 200;
        this.throttledMoveTo([0,0,radius]);
    }

}

//------------------------------------------------------------------------------------------
// -- SatelliteActor -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The actual satellite actor. It generates a random axis to spin around when it's created.

class SatelliteActor extends mix(Actor).with(AM_Smoothed, AM_Player) {
    get pawn() {return SatellitePawn}

    init(options = {}) {
        super.init(options);
        this.axis = sphericalRandom();

        const r = 1 - Math.random() * 0.5;
        const g = 1 - Math.random() * 0.5;
        const b = 1 - Math.random() * 0.5;
        this.color = [r,g,b];

        this.future(0).tick(0)
    }

    tick(delta) {
        const spin = q_axisAngle(this.axis, delta/1000 * toRad(45));
        this.rotateTo(q_multiply(this.rotation, spin));
        this.future(50).tick(50);
    }

}
SatelliteActor.register('SatelliteActor');

//------------------------------------------------------------------------------------------
// -- SatellitePawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The satellite's pawn. It creates a a three.js render model and colors it red if it belongs
// to the local player.

class SatellitePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Player) {

    constructor(...args) {
        super(...args);

        let color = new THREE.Color(...this.actor.color);
        // if (this.isMyPlayerPawn)  color = new THREE.Color(1,0,0);

        this.geometry = new THREE.BoxGeometry( 15, 15, 15 );
        this.material = new THREE.MeshStandardMaterial({color});
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

        if (this.isMyPlayerPawn) this.future(1).hilite(cube);
    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    hilite(cube) { // Delay until the outline renderer is set up.
        viewRoot.outlinePass.selectedObjects = [cube];
    }
}

//------------------------------------------------------------------------------------------
// -- MyPlayerManager ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Our player manager has an overloaded createPlayer method that does all the set-up when
// a new player joins.

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        const root = this.service("ModelRoot");
        options.parent = root.center;
        const tilt = TiltActor.create(options);
        const axis = AxisActor.create({parent: tilt});
        const orbit = OrbitActor.create({parent: axis, translation: [0, 0, 220]});
        const satellite = SatelliteActor.create({parent: orbit});
        return tilt;
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
// -- MyModelRoot --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the scene graph and the earth itself are the only thing created in the model
// at start up.

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!");
        this.center = FrameActor.create();
        const earth = EarthActor.create({parent: this.center});
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
        return [ InputManager, ThreeRenderManager, UIManager];
    }

    constructor(model) {
        super(model);

        const threeRenderManager = this.service("ThreeRenderManager");

        this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), threeRenderManager.scene, threeRenderManager.camera );
        this.outlinePass.edgeStrength = 4;
        threeRenderManager.composer.addPass( this.outlinePass );

        threeRenderManager.renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0));
        threeRenderManager.camera.position.set(0,0,500);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.15 );
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

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});

        this.rSlider = new SliderWidget({
            parent: this.HUD,
            anchor: [0.5,0],
            pivot: [0.5,0],
            local: [0,20],
            size: [300, 20],
            percent: 0.5,
            onChange: p => this.publish("hud", "radius", p)
        })

        this.aSlider = new SliderWidget({
            parent: this.HUD,
            anchor: [1,0.5],
            pivot: [1,0.5],
            local: [-20,0],
            size: [20, 200],
            percent: 0.5,
            onChange: p => this.publish("hud", "angle", p)
        })

    }

}

//------------------------------------------------------------------------------------------
// -- Start --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// High tick rate so the rotation is smooth.

StartWorldcore({
    appId: 'io.croquet.satellite',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: App.autoSession(),
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 60,
});



