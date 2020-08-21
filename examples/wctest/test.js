// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_translation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, q_multiply, PlayerManager, AM_Player, PM_Player, RapierPhysicsManager, AM_RapierPhysics, AM_RapierPhysicsS } from "@croquet/worldcore";
import diana from "./assets/diana.jpg";

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_Player, AM_RapierPhysics) {
    init(options) {
        super.init("MyPawn", options);
        this.setLocation([0,0,0]);
        this.future(0).tick(0);
    }

    tick(delta) {
        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const pointer = physicManager.world.getRigidBody(this.rigidBodyHandle);
        // console.log(this.rigidBodyHandle);

        const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
        const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
        const q2 = q_multiply(this.rotation, q_multiply(q0, q1));

        pointer.setRotation(q2[0], q2[1], q2[2], q2[3]);
        //this.rotateTo(q2);
        //this.rotateTo(q_multiply(this.rotation, q_multiply(q0, q1)));

        const t = pointer.translation();
        const r = pointer.rotation();

        const v = [t.x, t.y, t.z];
        const q = [r.x, r.y, r.z, r.w];
        //console.log(this.location);
        // console.log(v);
        // console.log(q);
        this.moveTo(v);

        // this.moveTo([t.x, t.y, t.z]);


        this.rotateTo(q);
        this.future(20).tick(20);
    }

}
MyActor.register('MyActor');


//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible, PM_Player) {
    constructor(...args) {
        super(...args);

        this.cube = UnitCube();
        this.cube.load();
        this.cube.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(diana);

        this.setDrawCall(new DrawCall(this.cube, this.material));

        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);
    }

    test1() {
        if (this.isMyPlayerPawn) this.draw.isHidden = true;
    }

    test2() {
        if (this.isMyPlayerPawn) this.draw.isHidden = false;
    }

}
MyPawn.register('MyPawn');

//------------------------------------------------------------------------------------------
// MyActor2
//------------------------------------------------------------------------------------------

class MyActor2 extends mix(Actor).with(AM_Smoothed, AM_RapierPhysicsS) {
    init(options) {
        super.init("MyPawn2", options);
        this.setLocation([0,-2,0]);
        this.future(0).tick(0);
    }

    tick(delta) {
        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        const pointer = physicManager.world.getRigidBody(this.rigidBodyHandle);
        // console.log(this.rigidBodyHandle);

        const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
        const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
        const q2 = q_multiply(this.rotation, q_multiply(q0, q1));

        pointer.setRotation(q2[0], q2[1], q2[2], q2[3]);
        //this.rotateTo(q2);
        //this.rotateTo(q_multiply(this.rotation, q_multiply(q0, q1)));

        const t = pointer.translation();
        const r = pointer.rotation();

        const v = [t.x, t.y, t.z];
        const q = [r.x, r.y, r.z, r.w];
        //console.log(this.location);
        // console.log(v);
        // console.log(q);
        this.moveTo(v);

        // this.moveTo([t.x, t.y, t.z]);


        this.rotateTo(q);
        this.future(20).tick(20);
    }

}
MyActor2.register('MyActor2');


//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn2 extends mix(Pawn).with(PM_Smoothed, PM_Visible, PM_Player) {
    constructor(...args) {
        super(...args);

        this.cube = UnitCube();
        this.cube.load();
        this.cube.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(diana);

        this.setDrawCall(new DrawCall(this.cube, this.material));

        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);
    }

    test1() {
        if (this.isMyPlayerPawn) this.draw.isHidden = true;
    }

    test2() {
        if (this.isMyPlayerPawn) this.draw.isHidden = false;
    }

}
MyPawn2.register('MyPawn2');

let rrr;

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting test");
        this.testActor = MyActor2.create();
    }

    createManagers() {
        console.log("Creating root");
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create(rrr));
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
        this.render.lights.setAmbientColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalColor([0.2, 0.2, 0.2]);
        this.render.lights.setDirectionalAim([0.2,0.1,-1]);
        this.render.camera.setLocation(m4_translation([0,0,10]));
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());

        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

}

Session.join("wctest", MyModelRoot, MyViewRoot, {tps: "50"});

// async function go() {
//     console.log("Running go");
//     rrr = await import("@dimforge/rapier3d");
//     console.log(rrr);
//     // App.messages = true;
//     // App.makeWidgetDock();
//     // const session = await Session.join(`rapier-test-${App.autoSession("q")}`, RapierModel, RapierView);

//     const session = await Session.join("game", MyModelRoot, MyViewRoot, {tps: "50"});
//     // console.log(session.model.world);
// }

// go();


