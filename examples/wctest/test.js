// World Core Test
//
// Croquet Studios, 2020

import { startSession } from "@croquet/teatime";
import { ModelRoot, ViewRoot, Actor } from "../worldcore";
import { GetNamedView } from "../worldcore/src/NamedView";

//------------------------------------------------------------------------------------------
// Actor & Pawn
//------------------------------------------------------------------------------------------

// class TestActor extends mix(Actor).with(AM_Avatar) {
//     init() { super.init('TestPawn'); }
// }
// TestActor.register("TestActor");

// class TestPawn extends mix(Pawn).with(PM_Avatar, PM_Visible) {
//     constructor(actor) {
//         super(actor);

//         this.cube = UnitCube();
//         this.cube.load();
//         this.cube.clear();

//         this.material = new Material();
//         this.material.pass = 'opaque';
//         //this.material.pass = 'instanced';
//         this.material.texture.loadFromURL(graph);

//         this.setDrawCall(new DrawCall(this.cube, this.material));
//         // this.setDrawCall(new InstancedDrawCall(this.cube, this.material));
//     }

//     destroy() {
//         super.destroy();
//         this.cube.destroy();
//         this.material.destroy();
//     }
// }
// TestPawn.register('TestPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        console.log("starting root!");
        this.subscribe('test', 'zero', ()=>this.createActor());
        this.subscribe('test', 'one', ()=>this.destroyActor());
    }

    createActor() {
        console.log("create actor!");
        if (this.actor0) return;
        this.actor0 = Actor.create();
        this.actor1 = Actor.create();
    }

    destroyActor() {
        if (this.actor0) this.actor0.destroy();
        if (this.actor1) this.actor0.destroy();
        this.actor0 = null;
        this.actor1 = null;
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);
        this.publish('test', 'zero');
        console.log(GetNamedView("PawnManager"));
    }

}


startSession("game", MyModelRoot, MyViewRoot, {tps: "10"});
