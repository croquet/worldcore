// World Core Test
//
// Croquet Studios, 2020

import { Session, App } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, q_axisAngle, toRad, m4_translation, m4_scalingRotationTranslation, Actor, Pawn, mix,
    AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView,
    ActorManager, RenderManager, PM_Visible, UnitCube, Material, DrawCall, InstancedDrawCall, PawnManager, q_multiply, PlayerManager, AM_Player, PM_Player, RapierPhysicsManager, AM_RapierPhysics, AM_RapierPhysicsS, AM_RapierPhysicsStatic, rapierStart, setRapier, LoadRapier, v3_normalize, TAU, sphericalRandom, q_identity, Triangles, CachedObject, GetNamedModel, RegisterMixin } from "@croquet/worldcore";
import diana from "./assets/diana.jpg";
import paper from "./assets/paper.jpg";
import { Constants } from "../q2/node_modules/@croquet/teatime";

// function seedColors() {
//     Constants.colors = [];
//     for (let i = 0; i < 30; i++ ) {
//         Constants.colors.push([0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 1]);
//     }
// }

// seedColors();

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init() {
        const axis = sphericalRandom();
        const angle = Math.random() * TAU;
        const rotation = q_axisAngle(axis, angle);
        const location = [4*Math.random()-2, 50, 4*Math.random()-2];

        this.index = Math.floor(Math.random() * 30);
        // this.color = Constants.colors[this.index];
        // super.init("MyPawn", {location, rotation});


        super.init("MyPawn", {location, rotation});
        // this.setLocation(location);
        // this.setRotation(rotation);
        this.addRigidBody({type: 'dynamic'});
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

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);

        // this.cube = UnitCube();
        // this.cube.setColor(this.actor.color);
        // this.cube.load();
        // this.cube.clear();

        // this.material = new Material();
        // this.material.pass = 'opaque';
        // this.material.texture.loadFromURL(paper);

        //this.setDrawCall(new DrawCall(this.cube, this.material));
        // console.log(this.actor.index);
        this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
        // console.log(this.buildDraw());
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
        // const color = [0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 1];
        //console.log(this.actor);

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
        this.mesh.addFace([[-50, 0.5, -50], [-50, 0.5, 50], [50, 0.5, 50], [50, 0.5, -50]], [c,c,c,c], [[0,0], [25,0], [25,25], [0,25]]);
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

class NonModel {
    constructor() {
        console.log("Constructing nonmodel");
        this.value = 1234;
    }
}

class UnModel {
    constructor() {
        console.log("Constructing unmodel");
        this.value = 1234;
    }
}

class TestActor extends Actor {

    static xxx() {
        console.log("Static xxx1");
    }

    static types() {
        console.log("TestActor types");
        return {
            "SomeUniqueName": NonModel,
            "AnotherName": UnModel
        };
      }

    init(...args) {
        super.init(...args);
        console.log("Creating test actor");
        this.nonModel = new NonModel();
    }

}
console.log(TestActor);
TestActor.register('TestActor');

// class TestActor2 extends TestActor {

//     static types() {
//         console.log("TestActor2 types");
//         return {
//             "SomeUniqueName": NonModel,
//             "AnotherName": UnModel
//         };
//       }

// }
// TestActor2.register('TestActor2');

const AM_Test = superclass => class extends superclass {

    static xxx() {
        console.log("Static xxx2");
    }

   static types() {
       super.types();
       console.log("Mixin types");
       return {
           "SomeUniqueName": NonModel,
           "AnotherName": UnModel
       };
   }

    init(pawn, options) {
        super.init(pawn, options);
        this.unModel = new UnModel();
    }
};
RegisterMixin(AM_Test);

class MixedActor extends mix(TestActor).with(AM_Test) {

    static yyy() {
        console.log("Static yyy");
    }

}
console.log(MixedActor);
MixedActor.register('MixedActor');



//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init(...args) {
        super.init(...args);
        console.log("Starting test!!!!!!");

        // this.subscribe("input", " Down", this.start);

        FloorActor.create();


        //TestActor2.create();

        MixedActor.xxx();
        MixedActor.create();


        this.actors = [];

        this.seedColors();
        this.future(100).tick();
    }

    seedColors() {
        this.colors = [];
        for (let i = 0; i < 100; i++ ) {
            this.colors.push([0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1]);
        }
    }

    start()  {
        const physicsManager = this.wellKnownModel('RapierPhysicsManager');
        physicsManager.togglePause();
        //this.running = !this.running;
        // if (!this.started) this.future(200).tick();
        // this.started = true;
    }

    tick() {
        this.spawn();
        this.future(100).tick();
    }

    spawn() {
        if (this.actors.length >= 200) {
            const  doomed = this.actors.shift();
            doomed.destroy();
        }
        const a = MyActor.create();
        this.actors.push(a);
        // console.log(this.actors.length);
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
    App.makeWidgetDock();
    // const session = await Session.join(`rapier-test-${App.autoSession("q")}`, RapierModel, RapierView);
    const session = await Session.join("wctest", MyModelRoot, MyViewRoot, {tps: "30"});
    // console.log(session.model.world);
}

go();

// Session.join("wctest", MyModelRoot, MyViewRoot, {tps: "50x2"});



