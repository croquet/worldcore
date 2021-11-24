// Fountain Demo
//
// Croquet Studios, 2021

import { App, ModelRoot, ViewRoot, q_axisAngle, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, q_multiply, InputManager, AM_Spatial, PM_Spatial, AM_Avatar, PM_Avatar, AM_Player, PM_Player, PlayerManager, ModelService, StartWorldcore, toRad, sphericalRandom, TAU, v3_add, v3_scale, viewRoot } from "@croquet/worldcore-kernel";
import { UIManager, Widget, SliderWidget } from "@croquet/worldcore-widget";
import { RapierPhysicsManager, AM_RapierPhysics, RAPIER } from "@croquet/worldcore-rapier";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial, AM_RapierPhysics) {

    get pawn() {return FountainPawn}

    init(options) {
        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newStatic());
        let cd = RAPIER.ColliderDesc.cylinder(3, 1);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(1.5);
        this.createCollider(cd);

        this.future(0).sprayTick();
    }

    sprayTick() {
        const r = Math.random();
        const origin = v3_add(this.translation, [0,3,0]);

        let p;
        if (r < 1.5) {
            p = CubeSprayActor.create({translation: origin});
        } else {
            p = SphereSprayActor.create({translation: origin});
        }

        const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];
        p.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
        p.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);

        this.future(250).sprayTick();
    }

}
FountainActor.register('FountainActor');

//------------------------------------------------------------------------------------------
// FountainPawn
//------------------------------------------------------------------------------------------

class FountainPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        let color = new THREE.Color(0.3,0.3,0.3);
        this.geometry = new THREE.CylinderGeometry( 1, 1, 6, 32 );
        this.material = new THREE.MeshStandardMaterial({color});
        const cube = new THREE.Mesh( this.geometry, this.material );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

    }

}

//------------------------------------------------------------------------------------------
// SprayActor
//------------------------------------------------------------------------------------------

export class SprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {

    init(options) {
        this.index = Math.floor(Math.random() * 10);
        super.init(options);
        const sprayManager = this.service("SprayManager");
        sprayManager.add(this);
    }
}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
// SprayPawn
//------------------------------------------------------------------------------------------

class SprayPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        if (!viewRoot.materials) viewRoot.materials = [];
        const i = this.actor.index;
        if (!viewRoot.materials[i]) {
            const modelRoot = this.modelService("ModelRoot");
            const color = new THREE.Color(...modelRoot.colors[i])
            viewRoot.materials[i] = new THREE.MeshStandardMaterial({color});
        }

    }

}

//------------------------------------------------------------------------------------------
// CubeSprayActor
//------------------------------------------------------------------------------------------

export class CubeSprayActor extends SprayActor {

    get pawn() {return CubeSprayPawn}

    init(options) {
        super.init(options);

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

class CubeSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const cube = new THREE.Mesh( this.geometry,  viewRoot.materials[i] );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);

    }

}

//------------------------------------------------------------------------------------------
// SphereSprayActor
//------------------------------------------------------------------------------------------

export class SphereSprayActor extends SprayActor {

    get pawn() {return SphereSprayPawn}

    init(options) {
        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());
        let cd = RAPIER.ColliderDesc.ball(0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(2);
        this.createCollider(cd);
    }

}
SphereSprayActor.register('SphereSprayActor');

//------------------------------------------------------------------------------------------
// SphereSprayPawn
//------------------------------------------------------------------------------------------

class SphereSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        this.geometry = new THREE.SphereGeometry(0.5);
        const cube = new THREE.Mesh( this.geometry,  viewRoot.materials[i] );
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

        cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        cd.setTranslation(20,0,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(1,40,40);
        cd.setTranslation(-20,0,0);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        cd.setTranslation(0,0,20);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

        cd = RAPIER.ColliderDesc.cuboid(40,40,1);
        cd.setTranslation(0,0,-20);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        this.createCollider(cd);

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

        const floorColor = new THREE.Color(0.4, 0.8, 0.2);
        const wallColor = new THREE.Color(0.7,0.7, 0.7);

        const geometry = new THREE.BoxGeometry( 40, 1, 40 );
        geometry.translate(0,-0.5,0)
        const floorMaterial = new THREE.MeshStandardMaterial( {color: floorColor} );
        const wallMaterial = new THREE.MeshStandardMaterial( {color: wallColor} );
        const floor = new THREE.Mesh( geometry, floorMaterial );
        floor.receiveShadow = true;
        level.add(floor);

        const wallGeo0 = new THREE.BoxGeometry( 40, 5, 1 );
        const wallGeo1 = new THREE.BoxGeometry( 40, 5, 1 );
        const wallGeo2 = new THREE.BoxGeometry( 1, 5, 40 );
        const wallGeo3 = new THREE.BoxGeometry( 1, 5, 40 );

        wallGeo0.translate(0,0,19.5)
        wallGeo1.translate(0,0,-19.5)
        wallGeo2.translate(19.5,0,0)
        wallGeo3.translate(-19.5,0, 0)

        const wall0 = new THREE.Mesh( wallGeo0, wallMaterial );
        // wall0.castShadow = true;
        wall0.receiveShadow = true;
        level.add(wall0);

        const wall1 = new THREE.Mesh( wallGeo1, wallMaterial );
        // wall0.castShadow = true;
        wall1.receiveShadow = true;
        level.add(wall1);

        const wall2 = new THREE.Mesh( wallGeo2, wallMaterial );
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        level.add(wall2);

        const wall3 = new THREE.Mesh( wallGeo3, wallMaterial );
        // wall0.castShadow = true;
        wall3.receiveShadow = true;
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
// -- SprayManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayManager extends ModelService {

    init(name = "SprayManager") {
        super.init(name);
        this.all = [];
    }

    add(spray) {
        while (this.all.length >= 500) {
            const doomed = this.all.shift();
            doomed.destroy();
        }
        this.all.push(spray);
    }

}
SprayManager.register("SprayManager");

//------------------------------------------------------------------------------------------
// -- MyModelRoot --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The root of the scene graph and the earth itself are the only thing created in the model
// at start up.

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [ SprayManager, {service: RapierPhysicsManager, options: {gravity: [0,-9.8, 0], timeStep: 15}} ];
    }

    init(...args) {
        super.init(...args);
        console.log("Start Model!!!");

        this.colors = [];
        for (let i = 0; i < 10; i++ ) {
            const r = Math.random() * 0.9;
            const g = Math.random() * 0.9;
            const b = Math.random() * 0.9;
            this.colors.push([0.9-r, 0.9-g, 0.9-b]);
        }

        const level = LevelActor.create({translation: [0,-0,0]});
        const fountain = FountainActor.create();

        this.subscribe("input", "click", this.shoot);
        this.subscribe("input", " Down", this.shoot);
    }

    shoot() {
        const p = SphereSprayActor.create({translation: [0, 17, 19]});
        // const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
        // p.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
        p.rigidBody.applyImpulse(new RAPIER.Vector3(0, 0, -16), true);
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
        return [InputManager, ThreeRenderManager, UIManager];
    }

    constructor(model) {
        super(model);

        const threeRenderManager = this.service("ThreeRenderManager");
        threeRenderManager.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        threeRenderManager.camera.rotateX(toRad(-30));
        threeRenderManager.camera.position.set(0,20,20);

        const lighting = new THREE.Group();
        const ambient = new THREE.AmbientLight( 0xffffff, 0.40 );
        const sun = new THREE.SpotLight( 0xffffff, 0.60 );
        sun.position.set(50, 50, 25);
        sun.angle= toRad(30);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 20;
        sun.shadow.camera.far = 150;

        lighting.add(ambient);
        lighting.add(sun);
        threeRenderManager.scene.add(lighting);

        threeRenderManager.renderer.shadowMap.enabled = true;
        threeRenderManager.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ui = this.service("UIManager");
        this.HUD = new Widget({parent: ui.root, autoSize: [1,1]});
    }
}

//------------------------------------------------------------------------------------------
// -- Start --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// High tick rate so the rotation is smooth.

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.fountain',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    password: 'password',
    name: App.autoSession(),
    model: MyModelRoot,
    view: MyViewRoot,
    tps: 30,
});



