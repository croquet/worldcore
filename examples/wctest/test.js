// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_translation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, q_multiply, PlayerManager, AM_Player, PM_Player, RapierPhysicsManager, AM_RapierPhysics, AM_RapierPhysicsS, AM_RapierPhysicsStatic } from "@croquet/worldcore";
import diana from "./assets/diana.jpg";

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        super.init("MyPawn", options);
        this.setLocation([0,0,0]);
        this.future(0).tick(0);
    }

    tick(delta) {
        const physicManager =  this.wellKnownModel('RapierPhysicsManager');
        // const pointer = physicManager.world.getRigidBody(this.rigidBodyHandle);

        // const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
        // const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
        // const q2 = q_multiply(this.rotation, q_multiply(q0, q1));

        // this.rigidBody.setRotation(q2[0], q2[1], q2[2], q2[3]);
        // this.rotateTo(q2);
        // this.rotateTo(q_multiply(this.rotation, q_multiply(q0, q1)));

        const t = this.rigidBody.translation();
        const r = this.rigidBody.rotation();

        const v = [t.x, t.y, t.z];
        const q = [r.x, r.y, r.z, r.w];

        this.moveTo(v);


        this.rotateTo(q);

        if (v[1] < -5) {
            this.destroy();
            return;
        }
        this.future(20).tick(20);
    }

}
MyActor.register('MyActor');


//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
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

class aaa {
    static ttt()  { if (super.ttt) super.ttt(); console.log("ttt");}
}

class bbb extends aaa {
    static ttt()  { if (super.ttt) super.ttt(); console.log("ooo");}
}


//------------------------------------------------------------------------------------------
// MyBlock
//------------------------------------------------------------------------------------------

class MyBlock extends mix(Actor).with(AM_Smoothed, AM_RapierPhysicsStatic) {
    init(options) {
        super.init("MyPawn", options);
        this.setLocation([0,-3,0]);
        // this.future(0).tick(0);
    }

    // tick(delta) {
    //     const physicManager =  this.wellKnownModel('RapierPhysicsManager');

    //     const t = this.rigidBody.translation();
    //     const r = this.rigidBody.rotation();

    //     const v = [t.x, t.y, t.z];
    //     const q = [r.x, r.y, r.z, r.w];

    //     this.moveTo(v);


    //     this.rotateTo(q);

    //     if (v[1] < -5) {
    //         this.destroy();
    //         return;
    //     }
    //     this.future(20).tick(20);
    // }

}
MyBlock.register('MyBlock');


//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting test!!!!");

        this.subscribe("input", "mouseXY", this.mouse);
        this.subscribe("input", "dDown", this.spawn);

        MyBlock.create();
    }

    mouse(xy) {
        // console.log(xy);
    }

    spawn() {
        MyActor.create();
    }

    createManagers() {
        console.log("Creating root");
        this.playerManager = this.addManager(PlayerManager.create());
        this.phyicsManager = this.addManager(RapierPhysicsManager.create());
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



