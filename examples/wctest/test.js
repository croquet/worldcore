// World Core Test
//
// Croquet Studios, 2020

import { startSession } from "@croquet/croquet";
import { ModelRoot, ViewRoot, Actor, Pawn, NamedView, GetNamedView, mix, WebInputManager, AM_Smoothed, PM_Smoothed, AM_Spatial } from "../worldcore";

//------------------------------------------------------------------------------------------
// Mixins
//------------------------------------------------------------------------------------------

export const PM_RenderUnity = superclass => class extends superclass {

    constructor(unityType, ...args) {
        super(...args);
        this.unityType = unityType;
        this.createUnityObject();
    }

    destroy() {
        super.destroy();
        this.deleteUnityObject();
    }

    createUnityObject() {
        const unity = GetNamedView('UnityRenderManager');
        if (unity) this.unityHandle = unity.create(this.unityType, this.global);
    }

    deleteUnityObject() {
        const unity = GetNamedView('UnityRenderManager');
        if (unity) unity.delete(this.unityHandle);
    }

    refresh() {
        super.refresh();
        const unity = GetNamedView('UnityRenderManager');
        if (unity) unity.refresh(this.unityHandle, this.global);
    }

};

//------------------------------------------------------------------------------------------
// Managers
//------------------------------------------------------------------------------------------

// The manager may not exist yet when the pawns are recreated. How to recreate all the unity objects?
// Loop through the pawn manager looking for PM_UnityRender objects

class UnityRenderManager extends NamedView {
    constructor() {
        super('UnityRenderManager');
        this.nextHandle = 1;
        console.log("Start up Unity renderer!");
        this.rebuild();

    }

    destroy() {
        super.destroy();
        console.log("Shut down Unity renderer!");
    }

    rebuild() {
        const pawnManager = GetNamedView('PawnManager');
        pawnManager.pawns.forEach(pawn => {
            if (pawn.createUnityObject) pawn.createUnityObject();
        });
    }

    // update(time) {
    // }

    create(type, matrix) {
        const handle = this.nextHandle++;
        console.log("Creating Unity render object of type " + type + " with handle " + handle + " and matrix " + matrix);
        return handle;
    }

    delete(handle) {
        console.log("Deleting Unity render object " + handle);
    }

    refresh(handle, matrix) {
        console.log("Refreshing Unity render object " + handle);
    }
}

//------------------------------------------------------------------------------------------
// Actor & Pawn
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Smoothed) {
    init() { super.init('TestPawn'); }
}
TestActor.register("TestActor");

class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_RenderUnity) {
    constructor(...args) {
        super("Alpha", ...args);
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
        console.log(this.sessionId);
        this.subscribe('input', 'dDown', this.createActor);
        this.subscribe('input', 'eDown', this.moveActor);
    }

    createActor() {
        if (this.actor0) return;
        this.actor0 = TestActor.create();
        this.actor1 = TestActor.create();
        //this.actor0.addChild(this.actor1);
    }

    moveActor() {
        if (!this.actor0) return;
        this.actor0.moveTo([1,0,0]);
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

        this.webInputManager = this.addManager(new WebInputManager());
        this.unityRenderManager = this.addManager(new UnityRenderManager());

    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
