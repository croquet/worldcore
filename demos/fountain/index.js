// Fountain Demo
//
// Croquet Studios, 2021

import { App, ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, InputManager, AM_Spatial, PM_Spatial, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, StartWorldcore, toRad, sphericalRandom, TAU } from "@croquet/worldcore-kernel";
import { UIManager, Widget, SliderWidget } from "@croquet/worldcore-widget";
import { RapierPhysicsManager, AM_RapierPhysics, RAPIER } from "@croquet/worldcore-rapier";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
// CubeSprayActor
//------------------------------------------------------------------------------------------

export class CubeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {

    get pawn() {return CubeSprayPawn}

    init(options) {
        super.init(options);
        // this.index = Math.floor(Math.random() * 10);
        // super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());

        let cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);
    }

}
CubeSprayActor.register('CubeSprayActor');

//------------------------------------------------------------------------------------------
// CubeSprayPawn
//------------------------------------------------------------------------------------------

class CubeSprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        let color = new THREE.Color(1,1,1);
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial({color});
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

    }

}


export class LevelActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {

    get pawn() {return LevelPawn};

    init(options) {

        super.init(options);

        const rbd = RAPIER.RigidBodyDesc.newStatic();
        this.createRigidBody(rbd);

        let cd = RAPIER.ColliderDesc.cuboid(75,0.5,75); // Half heights
        cd.setTranslation(0,-0.5,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        // cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        // cd.setTranslation(16,0,0);
        // cd.setRestitution(0.5);
        // cd.setFriction(1);
        // this.createCollider(cd);

        // cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        // cd.setTranslation(-16,0,0);
        // cd.setRestitution(0.5);
        // cd.setFriction(1);
        // this.createCollider(cd);

        // cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        // cd.setTranslation(0,0,20);
        // cd.setRestitution(0.5);
        // cd.setFriction(1);
        // this.createCollider(cd);

        // cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        // cd.setTranslation(0,0,-16);
        // cd.setRestitution(0.5);
        // cd.setFriction(1);
        // this.createCollider(cd);

    }

    destroy() {
        super.destroy();
        // this.fountain.destroy();
    }
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const level = new THREE.Group();

        const geometry = new THREE.BoxGeometry( 30, 1, 30 );
        geometry.translate(0,-0.5,0)
        const material = new THREE.MeshStandardMaterial( {color: 0xf0f000} );
        const floor = new THREE.Mesh( geometry, material );
        // floor.castShadow = true;
        floor.receiveShadow = true;
        level.add(floor);

        const wallGeo0 = new THREE.BoxGeometry( 30, 5, 1 );
        const wallGeo1 = new THREE.BoxGeometry( 30, 5, 1 );
        const wallGeo2 = new THREE.BoxGeometry( 1, 5, 30 );
        const wallGeo3 = new THREE.BoxGeometry( 1, 5, 30 );

        wallGeo0.translate(0,0,10)
        wallGeo1.translate(0,0, -10)
        wallGeo2.translate(10,0,0)
        wallGeo3.translate(-10,0, 0)

        const wall0 = new THREE.Mesh( wallGeo0, material );
        // wall0.castShadow = true;
        wall0.receiveShadow = true;
        level.add(wall0);

        const wall1 = new THREE.Mesh( wallGeo1, material );
        // wall0.castShadow = true;
        wall1.receiveShadow = true;
        level.add(wall1);

        const wall2 = new THREE.Mesh( wallGeo2, material );
        // wall0.castShadow = true;
        wall1.receiveShadow = true;
        level.add(wall2);

        const wall3 = new THREE.Mesh( wallGeo3, material );
        // wall0.castShadow = true;
        wall1.receiveShadow = true;
        level.add(wall3);

        this.setRenderObject(level);
        ;



    }

    destroy() {
        super.destroy();
        // this.ground.destroy();
        // this.material.destroy();
    }

}

//------------------------------------------------------------------------------------------
// -- MyModelRoot --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the scene graph and the earth itself are the only thing created in the model
// at start up.

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ {service: RapierPhysicsManager, options: {gravity: [0,-9.8, 0], timeStep: 15}} ];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!");
        // this.center = FrameActor.create();
        // const earth = EarthActor.create({parent: this.center});
        const level = LevelActor.create({translation: [0,-0,0]});
        const spray = CubeSprayActor.create({translation: [0,15,0]});
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
        threeRenderManager.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        threeRenderManager.camera.rotateX(toRad(-30));
        threeRenderManager.camera.position.set(0,20,20);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.15 );
        const sun = new THREE.DirectionalLight( 0xffffff, 0.95 );
        sun.position.set(200, 100, 200);
        sun.angle= toRad(45);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 1000;

        lighting.add(ambient);
        lighting.add(sun);
        threeRenderManager.scene.add(lighting);

        threeRenderManager.renderer.shadowMap.enabled = true;
        threeRenderManager.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});

        // this.rSlider = new SliderWidget({
        //     parent: this.HUD,
        //     anchor: [0.5,0],
        //     pivot: [0.5,0],
        //     local: [0,20],
        //     size: [300, 20],
        //     percent: 0.5,
        //     onChange: p => this.publish("hud", "radius", p)
        // })

        // this.aSlider = new SliderWidget({
        //     parent: this.HUD,
        //     anchor: [1,0.5],
        //     pivot: [1,0.5],
        //     local: [-20,0],
        //     size: [20, 200],
        //     percent: 0.5,
        //     onChange: p => this.publish("hud", "angle", p)
        // })
    }
}

//------------------------------------------------------------------------------------------
// -- Start --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// High tick rate so the rotation is smooth.

StartWorldcore({
    appId: 'io.croquet.fountain',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: App.autoSession(),
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 60,
});



