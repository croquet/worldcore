// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_translation, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed,
    UserList, ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, q_multiply, LocalUser, PlayerManager, AM_Player, PM_Player, MyPlayerPawn } from "../worldcore";
import diana from "./assets/diana.jpg";

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_Player) {
    init(options) {
        super.init("MyPawn", options);
        this.setLocation([0,0,-7]);
        this.future(0).tick(0);
    }

    tick(delta) {
        const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
        const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
        this.rotateTo(q_multiply(this.rotation, q_multiply(q0, q1)));
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
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);
        // this.future(0).tick(0);
    }

    createManagers() {
        this.playerManager = this.addManager(PlayerManager.create());
        this.userList = this.addManager(UserList.create());
        this.actorManager = this.addManager(ActorManager.create());
    }

    test1() {
        // if (this.actor0) return;
        // this.actor0 = MyActor.create();
        // this.actor0.setLocation([0,0,-7]);
    }

    test2() {
        // if (!this.actor0) return;
        // this.actor0.destroy();
        // this.actor0 = null;
    }

    // tick(delta) {
    //     const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
    //     const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
    //     const q2 = q_axisAngle([1,0,0], 0.0017 * delta);
    //     const q3 = q_axisAngle([0,1,0], -0.0029 * delta);
    //     if (this.actor0) this.actor0.rotateTo(q_multiply(this.actor0.rotation, q_multiply(q0, q1)));
    //     if (this.actor1) this.actor1.rotateTo(q_multiply(this.actor1.rotation, q_multiply(q2, q3)));
    //     this.future(20).tick(20);
    // }
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
        this.render.camera.setLocation(m4_translation([0,0,0]));
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        //console.log(MyPlayerPawn());

        console.log("View root constructor done");

    }

    createManagers() {
        this.localUser = this.addManager(new LocalUser());
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());

        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

}

Session.join("game", MyModelRoot, MyViewRoot, {tps: "50"});
