// World Core Test
//
// Croquet Studios, 2021

import { ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, q_normalize, q_identity,  AM_Spatial, PM_Spatial, InputManager, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, v3_normalize, StartWorldcore, toRad } from "@croquet/worldcore-kernel";
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
// AxisActor
//------------------------------------------------------------------------------------------

class AxisActor extends mix(FrameActor).with(AM_Player) {

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

//------------------------------------------------------------------------------------------
// OrbitActor
//------------------------------------------------------------------------------------------

class OrbitActor extends mix(FrameActor).with(AM_Player) {

    get pawn() {return OrbitPawn}

    init(options = {}) {
        super.init(options);
        this.listen("radius", this.onChangeRadius)
    }

    onChangeRadius(r) {
        const radius = 120 + r * 100;
        this.moveTo([0,0,radius]);
    }
}
OrbitActor.register('OrbitActor');

//------------------------------------------------------------------------------------------
// OrbitPawn
//------------------------------------------------------------------------------------------

class OrbitPawn extends mix(FramePawn).with(PM_Player) {

    constructor(...args) {
        super(...args);
        if (this.isMyPlayerPawn) this.subscribe("hud", "radius", this.onChangeRadius);
    }

    onChangeRadius(r) {
        this.say("radius", r);
    }

}

//------------------------------------------------------------------------------------------
// SatelliteActor
//------------------------------------------------------------------------------------------

class SatelliteActor extends mix(Actor).with(AM_Smoothed, AM_Player) {
    get pawn() {return SatellitePawn}

    init(options = {}) {
        super.init(options);
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
        // options.translation = [0, 0, 120];
        options.rotation = q_axisAngle([0,1,0], toRad(45));
        const axis = AxisActor.create(options);
        const orbit = OrbitActor.create({parent: axis, translation: [0, 0, 200]});
        const satellite = SatelliteActor.create({parent: orbit});
        return orbit;
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
        EarthActor.create({parent: this.center});
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

        this.slider = new SliderWidget({
            parent: this.HUD,
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size: [20, 300],
            // step: 10,
            throttle: 20,
            onChange: p => this.publish("hud", "radius", p)
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
    tps: 15,
});



