// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale, AM_Avatar, PM_Avatar,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, PlayerManager, RapierPhysicsManager, AM_RapierPhysics, LoadRapier, TAU, sphericalRandom, Triangles, CachedObject, q_multiply } from "@croquet/worldcore";
import paper from "./assets/paper.jpg";


//------------------------------------------------------------------------------------------
// MoveActor
//------------------------------------------------------------------------------------------

class MoveActor extends mix(Actor).with(AM_Avatar) {
    init() {
        // const axis = sphericalRandom();
        // const angle = Math.random() * TAU;
        // const rotation = q_axisAngle(axis, angle);
        // const location = [0*Math.random()-0, 3, 0*Math.random()-0];

        // this.index = Math.floor(Math.random() * 30);

        super.init("MovePawn");

    }

}
MoveActor.register('MoveActor');

//------------------------------------------------------------------------------------------
// MovePawn
//------------------------------------------------------------------------------------------

let mp;

class MovePawn extends mix(Pawn).with(PM_Avatar, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
        mp = this;
    }

    buildDraw() {
        const mesh = CachedObject("moveMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const mesh = UnitCube();

        // const modelRoot = GetNamedView('ViewRoot').model;
        // const color = modelRoot.colors[this.actor.index];

        // mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }


}
MovePawn.register('MovePawn');

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        const axis = sphericalRandom();
        const angle = Math.random() * TAU;
        const rotation = q_axisAngle(axis, angle);
        const location = [0*Math.random()-0, 3, 0*Math.random()-0];

        this.index = Math.floor(Math.random() * 30);

        super.init("MyPawn", {location, rotation});

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 1000
        });

        const spin = v3_scale(sphericalRandom(),Math.random() * 100);
        this.applyTorque(spin);
        this.applyForce([0,350,0]);

    }

}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
// MyProjectile
//------------------------------------------------------------------------------------------

class MyProjectile extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        const axis = sphericalRandom();
        const angle = Math.random() * TAU;
        const rotation = [0,0,0,1];
        const location = [0, 16, 16];

        this.index = Math.floor(Math.random() * 30);

        super.init("MyPawn", {location, rotation});

        this.addRigidBody({type: 'dynamic'});
        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 1000
        });

        const spin = v3_scale(sphericalRandom(),Math.random() * 20);
        this.applyTorque(spin);
        this.applyForce([0,50,-200]);

    }

}
MyProjectile.register('MyProjectile');


//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("cubeMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {
        const mesh = UnitCube();

        const modelRoot = GetNamedView('ViewRoot').model;
        const color = modelRoot.colors[this.actor.index];

        mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }


}
MyPawn.register('MyPawn');


//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        super.init("FloorPawn", {rigidBodyType: 'static', location: [0,0,0], scale: [1,1,1]});
        this.addRigidBody({type: 'static'});
        this.addBoxCollider({
            size: [50,1,50],
            friction: 1,
            density: 1,
            restitution: 1000
        });

    }
}
FloorActor.register('FloorActor');

//------------------------------------------------------------------------------------------
// FloorPawn
//------------------------------------------------------------------------------------------

class FloorPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);

        const c =  [0.6,0.6,0.6,1];

        this.mesh = new Triangles();
        this.mesh.addFace([[-50, 0, -50], [-50, 0, 50], [50, 0, 50], [50, 0, -50]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
        this.mesh.load();
        this.mesh.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.mesh, this.material));
    }
}
FloorPawn.register('FloorPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting test!!!!");

        FloorActor.create();
        const move = MoveActor.create();

        this.actors = [];

        this.seedColors();
        this.spawnLimit = 200;

        this.subscribe("input", " Down", this.shoot);
        this.subscribe("input", "touchTap", this.shoot);
        this.subscribe("input", "dDown", this.raycast);

        // this.future(0).tick();
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
        }
    }

    tick() {
        this.spawn();
        this.future(200).tick();
    }

    raycast() {
        console.log("Raycast!");
        const phyicsManager = this.wellKnownModel('RapierPhysicsManager');
        const rr = phyicsManager.castRay([0,50,0], [0,-1,0], 50);
        console.log(rr);
    }

    shoot() {
        if (this.actors.length >= this.spawnLimit) {
            const doomed = this.actors.shift();
            doomed.destroy();
        }
        const p = MyProjectile.create();
        this.actors.push(p);
    }

    spawn() {
        if (this.actors.length >= this.spawnLimit) {
            const doomed = this.actors.shift();
            doomed.destroy();
        }
        const a = MyActor.create();
        this.actors.push(a);
        // console.log(this.actors.length);
    }

    createManagers() {
        console.log("Creating root");
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create({gravity: [0,-9.8, 0], timeStep: 50}));
        this.actorManager = this.addManager(ActorManager.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.ui.setScale(1);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.8, 0.8, 0.8]);
        this.render.lights.setDirectionalColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);
        this.render.camera.setLocation(m4_scalingRotationTranslation(1, q_axisAngle([1,0,0], toRad(-47)), [0,19,19]));
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.4);
            ao.density = 1;
            ao.falloff = 0.7;

        }

        this.webInput.addChord("strafeLeft", ['ArrowLeft', 'Shift']);
        this.webInput.addChord("spinLeft", ['ArrowLeft'], ['Shift']);

        this.subscribe("input", "spinLeftDown", () => console.log("Spin Left Down"));
        this.subscribe("input", "spinLeftUp", () => console.log("Spin Left Up"));
        this.subscribe("input", "strafeLeftDown", () => console.log("Strafe Left Down"));
        this.subscribe("input", "strafeLeftUp", () => console.log("Strafe Left Up"));
        this.subscribe("input", "mouseDelta", this.onMouseDelta)

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());
        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());
    }

    onMouseDelta(delta) {
        console.log(delta);
        // if (mp) {
        //     const loc = mp.location;
        //     // console.log(loc);
        //     const newLoc = [loc[0]+0.03 * delta[0], loc[1], loc[2]+0.03 * delta[1]];
        //     mp.throttledMoveTo(newLoc);
        // }
        if (mp) {
            const rot = mp.rotation;
            const dRot = q_axisAngle([0,1,0], delta[0] * 0.005);
            const newRot = q_multiply(mp.rotation, dRot);
            mp.throttledRotateTo(newRot);
            // mp.rotateTo(newRot);

        }
    }

}


async function go() {
    await LoadRapier();
    // App.messages = true;
    App.makeWidgetDock();
    // const session = await Session.join(`wctest-${App.autoSession("q")}`, MyModelRoot, MyViewRoot, {tps: "60"});
    const session = await Session.join(`wctest`, MyModelRoot, MyViewRoot, {tps: "60"});
}

go();
