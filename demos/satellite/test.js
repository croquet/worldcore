// World Core Test
//
// Croquet Studios, 2021

import { ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, v3_normalize, StartWorldcore, toRad, sphericalRandom, TAU } from "@croquet/worldcore-kernel";
import { UIManager, Widget, JoystickWidget, ButtonWidget, ImageWidget, TextWidget, SliderWidget } from "@croquet/worldcore-widget";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import earth_fbx from "./assets/earth_fbx.fbx";
import earth_txt from "./assets/earth_txt.jpg";


//------------------------------------------------------------------------------------------
// FrameActor
//------------------------------------------------------------------------------------------

class FrameActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return FramePawn}
}
FrameActor.register('FrameActor');

//------------------------------------------------------------------------------------------
// FramePawn
//------------------------------------------------------------------------------------------

class FramePawn extends mix(Pawn).with(PM_Smoothed) {

    constructor(...args) {
        super(...args);
        this.tug = 0.01;
    }
}

//------------------------------------------------------------------------------------------
// EarthActor
//------------------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------------------
// EarthPawn
//------------------------------------------------------------------------------------------

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
        });

        console.log("Earth");
        console.log(this.tug);
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
// TiltActor
//------------------------------------------------------------------------------------------

class TiltActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() { return TiltPawn }

    init(options = {}) {
        options.rotation = q_axisAngle([0,0,1], toRad(-60));
        super.init(options);
        this.rotateThrottle = 200;
    }

}
TiltActor.register('TiltActor');

class TiltPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {

    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) this.subscribe("hud", "angle", this.onChangeAngle);
    }

    onChangeAngle(a) {
        const angle = (2*a-1) * Math.PI/2;
        const q = q_axisAngle([0,0,1], angle);
        this.throttledRotateTo(q);
    }

}

//------------------------------------------------------------------------------------------
// AxisActor
//------------------------------------------------------------------------------------------

class AxisActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() { return AxisPawn }

    init(options = {}) {
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

class AxisPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {

    constructor(...args) {
        super(...args);
    }

}

//------------------------------------------------------------------------------------------
// OrbitActor
//------------------------------------------------------------------------------------------

class OrbitActor extends mix(Actor).with(AM_Avatar, AM_Player) {

    get pawn() {return OrbitPawn}

    init(options = {}) {
        options.translation = [0,0,200];
        super.init(options);
    }

}
OrbitActor.register('OrbitActor');

//------------------------------------------------------------------------------------------
// OrbitPawn
//------------------------------------------------------------------------------------------

class OrbitPawn extends mix(Pawn).with(PM_Avatar, PM_Player) {

    constructor(...args) {
        super(...args);
        this.moveThrottle = 200;
        if (this.isMyPlayerPawn) this.subscribe("hud", "radius", this.onChangeRadius);
    }

    onChangeRadius(r) {
        const radius = 120 + r * 100;
        this.throttledMoveTo([0,0,radius]);
    }

}

//------------------------------------------------------------------------------------------
// SatelliteActor
//------------------------------------------------------------------------------------------

class SatelliteActor extends mix(Actor).with(AM_Smoothed, AM_Player) {
    get pawn() {return SatellitePawn}

    init(options = {}) {
        super.init(options);
        this.axis = sphericalRandom();
        this.future(0).tick(0)
    }

    tick(delta) {
        const axis = v3_normalize([1,2,3]);
        const spin = q_axisAngle(this.axis, delta/1000 * toRad(45));
        this.rotateTo(q_multiply(this.rotation, spin));
        this.future(50).tick(50);
    }

}
SatelliteActor.register('SatelliteActor');

//------------------------------------------------------------------------------------------
// SatellitePawn
//------------------------------------------------------------------------------------------

class SatellitePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Player) {

    constructor(...args) {
        super(...args);

        let color = new THREE.Color(1,1,1);
        if (this.isMyPlayerPawn) color = new THREE.Color(1,0,0);

        this.geometry = new THREE.BoxGeometry( 10, 10, 10 );
        this.material = new THREE.MeshStandardMaterial({color});
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        // this.model.children.forEach( child => {
        //     child.material.map.dispose();
        //     child.material.dispose();
        //     child.geometry.dispose();
        // })
    }
}

//------------------------------------------------------------------------------------------
// MyPlayerManager
//------------------------------------------------------------------------------------------

class MyPlayerManager extends PlayerManager {

    createPlayer(options) {
        const root = this.service("ModelRoot");
        options.parent = root.center;
        const tilt = TiltActor.create(options);
        const axis = AxisActor.create({parent: tilt});
        const orbit = OrbitActor.create({parent: axis, translation: [0, 0, 200]});
        const satellite = SatelliteActor.create({parent: orbit});
        return tilt;
    }

}
MyPlayerManager.register("MyPlayerManager");

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ MyPlayerManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");
        this.center = FrameActor.create();
        const earth = EarthActor.create({parent: this.center});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [ InputManager, ThreeRenderManager, UIManager];
    }

    constructor(model) {
        super(model);

        const threeRenderManager = this.service("ThreeRenderManager");
        threeRenderManager.renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0));
        threeRenderManager.camera.position.set(0,0,500);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.15 );
        // const sun = new THREE.DirectionalLight( 0xffffff, 0.95 );
        const sun = new THREE.SpotLight( 0xffffff, 0.95 );
        sun.position.set(500, 0, 500);
        sun.angle= toRad(20);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 1024; // default
        sun.shadow.mapSize.height = 1024; // default
        sun.shadow.camera.near = 100; // default
        sun.shadow.camera.far = 1000; // default

        lighting.add(ambient);
        lighting.add(sun);
        threeRenderManager.scene.add(lighting);

        threeRenderManager.renderer.shadowMap.enabled = true;
        threeRenderManager.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});

        this.rSlider = new SliderWidget({
            parent: this.HUD,
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size: [20, 300],
            onChange: p => this.publish("hud", "radius", p)
        })

        this.aSlider = new SliderWidget({
            parent: this.HUD,
            anchor: [0,0],
            pivot: [0,0],
            local: [20,20],
            size: [20, 300],
            onChange: p => this.publish("hud", "angle", p)
        })


    }

}


StartWorldcore({
    appId: 'io.croquet.wctest',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: 'test',
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 60,
});



