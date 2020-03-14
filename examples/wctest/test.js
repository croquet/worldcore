// World Core Test
//
// Croquet Studios, 2020

import { startSession } from "@croquet/teatime";
import { ModelRoot, ViewRoot, Actor, Pawn, NamedView, GetNamedView, mix, AM_Spatial, PM_Spatial } from "../worldcore";

//------------------------------------------------------------------------------------------
// Mixins
//------------------------------------------------------------------------------------------

export const PM_RenderUnity = superclass => class extends superclass {

    constructor(type, ...args) {
        super(...args);
        console.log(type);
        console.log("Connect to Unity render manager!");
    }

    destroy() {
        super.destroy();
    }

    refresh() {
        super.refresh();
        console.log("Send pawn render info to Unity!");
    }

};

//------------------------------------------------------------------------------------------
// Managers
//------------------------------------------------------------------------------------------

class UnityRenderManager extends NamedView {
    constructor() {
        super('UnityRenderManager');
        this.nextID = 0;
    }

    update(time) {
        console.log("render update");
    }

    add(pawn) {
        const id = this.nextID++;
        return id;
    }

    delete(pawn) {

    }
}

//------------------------------------------------------------------------------------------
// Actor & Pawn
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial) {
    init() { super.init('TestPawn'); }
}
TestActor.register("TestActor");

class TestPawn extends mix(Pawn).with(PM_Spatial, PM_RenderUnity) {
    constructor(...args) {
        super("Unity Type!!!", ...args);
        console.log("Spawing pawn!");
    }
}
TestPawn.register('TestPawn');

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
        if (this.actor0) return;
        this.actor0 = TestActor.create();
        this.actor1 = TestActor.create();
        this.actor0.addChild(this.actor1);
    }

    destroyActor() {
        if (this.actor0) this.actor0.destroy();
        if (this.actor1) this.actor1.destroy();
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
        this.unityRenderManager = this.addManager(new UnityRenderManager());

        this.publish('test', 'zero');
        console.log(GetNamedView("PawnManager"));
    }

}


startSession("game", MyModelRoot, MyViewRoot, {tps: "10"});
