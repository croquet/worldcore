// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_translation, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, q_multiply, PlayerManager, AM_Player, PM_Player, RapierPhysicsManager, AM_RapierPhysics, AM_RapierPhysicsS, AM_RapierPhysicsStatic, rapierStart, setRapier, LoadRapier, v3_normalize, TAU, sphericalRandom, q_identity, Triangles } from "@croquet/worldcore";
import diana from "./assets/diana.jpg";
import paper from "./assets/paper.jpg";

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        const axis = sphericalRandom();
        const angle = Math.random() * TAU;
        const rotation = q_axisAngle(axis, angle);
        const location = [4*Math.random()-2, 20, 4*Math.random()-2];

        this.color = [0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 1];
        super.init("MyPawn", {location, rotation});
        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            friction: 1,
            density: 1,
            restitution: 1
        });

        // this.future(0).tick(20);
    }

    // tick(delta) {

    //     if (this.location[1] < -5) {
    //         this.destroy();
    //         return;
    //     }
    //     this.future(20).tick(20);
    // }

}
MyActor.register('MyActor');


//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);

        this.cube = UnitCube();
        this.cube.setColor(this.actor.color);
        this.cube.load();
        this.cube.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.setDrawCall(new DrawCall(this.cube, this.material));
    }
}
MyPawn.register('MyPawn');


//------------------------------------------------------------------------------------------
// FloorActor
//------------------------------------------------------------------------------------------

class FloorActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        super.init("FloorPawn", {rigidBodyType: 'static', location: [0,0,0], scale: [1,1,1]});
        this.addBoxCollider({
            size: [50,1,50],
            friction: 1,
            density: 1,
            restitution: 1
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
        this.mesh.addFace([[-50, 0.5, -50], [-50, 0.5, 50], [50, 0.5, 50], [50, 0.5, -50]], [c,c,c,c], [[0,0], [100,0], [100,100], [0,100]]);
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
        console.log("Starting test");

        this.subscribe("input", "dDown", this.start);

        FloorActor.create();
        this.actors = [];

    }

    start()  {
        this.future(200).tick();
    }

    tick() {
        this.spawn();
        this.future(200).tick();
    }

    spawn() {
        if (this.actors.length >= 500) {
            const  doomed = this.actors.shift();
            doomed.destroy();
        }
        const a = MyActor.create();
        this.actors.push(a);
        //console.log(this.actors.length);
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
        this.render.lights.setDirectionalColor([0.5, 0.5, 0.5]);
        this.render.lights.setDirectionalAim([0.2,-1,0.1]);
        this.render.camera.setLocation(m4_scalingRotationTranslation(1, q_axisAngle([1,0,0], toRad(-45)), [0,20,20]));
        this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

        const ao = this.render.aoShader;
        if (ao) {
            ao.setRadius(0.5);
            ao.density = 1.2;
            ao.falloff = 0.7;

        }

    }

    createManagers() {
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());

        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

}

//rapierStart();

async function go() {
    // const r = await import("@dimforge/rapier3d");
    // setRapier(r);
    await LoadRapier();
    // App.messages = true;
    // App.makeWidgetDock();
    // const session = await Session.join(`rapier-test-${App.autoSession("q")}`, RapierModel, RapierView);
    const session = await Session.join("wctest", MyModelRoot, MyViewRoot, {tps: "20"});
    // console.log(session.model.world);
}

go();

// Session.join("wctest", MyModelRoot, MyViewRoot, {tps: "50"});



