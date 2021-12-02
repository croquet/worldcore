// Fountain Demo
//
// Croquet Studios, 2021

import { App, ModelRoot, ViewRoot, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, InputManager, AM_Spatial, PM_Spatial, ModelService, StartWorldcore, toRad, sphericalRandom, v3_add, v3_scale, viewRoot } from "@croquet/worldcore-kernel";
import { RapierPhysicsManager, AM_RapierPhysics, RAPIER } from "@croquet/worldcore-rapier";
import { ThreeRenderManager, PM_ThreeVisible, THREE } from "@croquet/worldcore-three";

//------------------------------------------------------------------------------------------
// -- FountainActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// It has a collider for the nozzle geometry. And it has a tick that runs every 250
// milliseconds that spawns geometric objects and fires them into the air. The fountain
// randomly picks what shape to spawn.

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
        const origin = v3_add(this.translation, [0,3,0]);

        let p;
        const r = Math.random();
        if (r < 0.5) {
            p = CubeSprayActor.create({translation: origin});
        } else if (r < 0.7) {
            p = SphereSprayActor.create({translation: origin});
        } else if (r < 0.9) {
            p = CylinderSprayActor.create({translation: origin});
        } else {
            p = ConeSprayActor.create({translation: origin});
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
// -- FountainPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Create the visuals for the nozzle.

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

    destroy() { // We should destroy three.js geometries and materials when we're done.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}

//------------------------------------------------------------------------------------------
// -- SprayActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A base class for all the actors in the spray. It randomly picks an index color, and
// registers the actor with the spray manager.

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
// -- SprayPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A base class for all the pawns in the spray. It lazily creates the materials that are used
// for each color.

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
// -- CubeSprayActor -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates a dynamic cube collider.

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
// -- CubeSprayPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates the 3D cube model.

class CubeSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        if (!viewRoot.cube) viewRoot.cube = new THREE.BoxGeometry( 1, 1, 1 );
        const mesh = new THREE.Mesh( viewRoot.cube,  viewRoot.materials[i] );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.setRenderObject(mesh);
    }
}

//------------------------------------------------------------------------------------------
// -- CylinderSprayActor -------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates a dynamic cylinder collider.

export class CylinderSprayActor extends SprayActor {

    get pawn() {return CylinderSprayPawn}

    init(options) {
        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());
        let cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(1.5);
        this.createCollider(cd);
    }
}
CylinderSprayActor.register('CylinderSprayActor');

//------------------------------------------------------------------------------------------
// -- CylinderSprayPawn --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates the 3D cylinder model.

class CylinderSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        if (!viewRoot.cylinder) viewRoot.cylinder = new THREE.CylinderGeometry( 0.5, 0.5, 1, 16 );
        const mesh = new THREE.Mesh( viewRoot.cylinder,  viewRoot.materials[i] );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.setRenderObject(mesh);
    }
}

//------------------------------------------------------------------------------------------
// -- ConeSprayActor -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates a dynamic cone collider.

export class ConeSprayActor extends SprayActor {

    get pawn() {return ConeSprayPawn}

    init(options) {
        super.init(options);

        this.createRigidBody(RAPIER.RigidBodyDesc.newDynamic());
        let cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
        cd.setRestitution(0.5);
        cd.setFriction(1);
        cd.setDensity(3);
        this.createCollider(cd);
    }
}
ConeSprayActor.register('ConeSprayActor');

//------------------------------------------------------------------------------------------
// -- ConeSprayPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates the 3D cone model.

class ConeSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        if (!viewRoot.cone) viewRoot.cone = new THREE.CylinderGeometry( 0, 0.5, 1, 16 );
        // this.geometry = new THREE.CylinderGeometry( 0, 0.5, 1, 16 );
        const cube = new THREE.Mesh( viewRoot.cone,  viewRoot.materials[i] );
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.setRenderObject(cube);
    }

}

//------------------------------------------------------------------------------------------
// -- SphereSprayActor ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates a dynamic sphere collider.

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
// -- SphereSprayPawn ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates the 3D sphere model.

class SphereSprayPawn extends SprayPawn {
    constructor(...args) {
        super(...args);
        const i = this.actor.index;

        if (!viewRoot.sphere) viewRoot.sphere = new THREE.SphereGeometry(0.5);
        // this.geometry = new THREE.SphereGeometry(0.5);
        const mesh = new THREE.Mesh( viewRoot.sphere,  viewRoot.materials[i] );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.setRenderObject(mesh);
    }
}

//------------------------------------------------------------------------------------------
// -- LevelActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates all the colliders for the floor and walls.

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
}
LevelActor.register('LevelActor');

//------------------------------------------------------------------------------------------
// -- LevelPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates all the 3D models for the floor and walls.

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        const level = new THREE.Group();

        const floorColor = new THREE.Color(0.4, 0.8, 0.2);
        const wallColor = new THREE.Color(0.7,0.7, 0.7);

        this.floorGeometry = new THREE.BoxGeometry( 40, 1, 40 );
        this.floorGeometry.translate(0,-0.5,0)
        this.floorMaterial = new THREE.MeshStandardMaterial( {color: floorColor} );
        this.wallMaterial = new THREE.MeshStandardMaterial( {color: wallColor} );
        const floor = new THREE.Mesh( this.floorGeometry, this.floorMaterial );
        floor.receiveShadow = true;
        level.add(floor);

        this.wallGeometry0 = new THREE.BoxGeometry( 40, 5, 1 );
        this.wallGeometry1 = new THREE.BoxGeometry( 40, 5, 1 );
        this.wallGeometry2 = new THREE.BoxGeometry( 1, 5, 40 );
        this.wallGeometry3 = new THREE.BoxGeometry( 1, 5, 40 );

        this.wallGeometry0.translate(0,0,19.5)
        this.wallGeometry1.translate(0,0,-19.5)
        this.wallGeometry2.translate(19.5,0,0)
        this.wallGeometry3.translate(-19.5,0, 0)

        const wall0 = new THREE.Mesh( this.wallGeometry0, this.wallMaterial );
        wall0.castShadow = true;
        wall0.receiveShadow = true;
        level.add(wall0);

        const wall1 = new THREE.Mesh( this.wallGeometry1, this.wallMaterial );
        wall1.castShadow = true;
        wall1.receiveShadow = true;
        level.add(wall1);

        const wall2 = new THREE.Mesh( this.wallGeometry2, this.wallMaterial );
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        level.add(wall2);

        const wall3 = new THREE.Mesh( this.wallGeometry3, this.wallMaterial );
        wall0.castShadow = true;
        wall3.receiveShadow = true;
        level.add(wall3);

        this.setRenderObject(level);
    }

    destroy() { // We should destroy the three.js geometries and materials when we're done.
        super.destroy();
        this.floorGeometry.dispose();
        this.wallGeometry0.dispose();
        this.wallGeometry1.dispose();
        this.wallGeometry2.dispose();
        this.wallGeometry3.dispose();
        this.wallMaterial.dispose();
        this.floorMaterial.dispose();
    }

}

//------------------------------------------------------------------------------------------
// -- SprayManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Keeps track of all the spray object and deletes the oldest when the maximum number is reached.

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

// Create the model-side services: the spray manager, and the Rapier physics engine.
// Creates the static level and the fountain.
// Spawns a random spray actor on a click or space bar press.

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

        this.level = LevelActor.create({translation: [0,-0,0]});
        this.fountain = FountainActor.create();

        this.subscribe("input", "click", this.shoot);
        this.subscribe("input", " Down", this.shoot);
    }

    destroy() {
        this.level.destroy();
        this.fountain.destroy();
    }

    shoot() {
        const origin = [0, 17, 19];

        let p;
        const r = Math.random();
        if (r < 0.5) {
            p = CubeSprayActor.create({translation: origin});
        } else if (r < 0.7) {
            p = SphereSprayActor.create({translation: origin});
        } else if (r < 0.9) {
            p = CylinderSprayActor.create({translation: origin});
        } else {
            p = ConeSprayActor.create({translation: origin});
        }

        const spin = v3_scale(sphericalRandom(),Math.random() * 1.5);
        p.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
        p.rigidBody.applyImpulse(new RAPIER.Vector3(0, 0, -16), true);
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// -- MyViewRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Create the view-side services: the input manager and the three.js render manager.
// Sets up the three.js camera and lighting.

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager];
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

    }

    destroy() { // We should destroy three.js geometries and materials when we're done.
        super.destroy();
        if (this.materials) this.materials.forEach( m => m.dispose());
        if (this.cube) this.cube.dispose();
        if (this.sphere) this.sphere.dispose();
        if (this.cone) this.cone.dispose();
        if (this.cylinder) this.cylinder.dispose();

    }
}

//------------------------------------------------------------------------------------------
// -- Start --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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



