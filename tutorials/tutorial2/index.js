// World Core Tutorial 2
//
// Copyright Croquet Corporation, 2021
//
// This is the second in a series of tutorials illustrating how to build a Worldcore app. It
// assumes that you have familarity with the basics of the Croquet SDK, and understand the
// general concepts behind Worldcore. For more inforamation, see croquet.io/sdk.
//
// This tutorial show how to create a hierarchy of dynamic objects and control them using
// input events.

import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, PM_Visible, RenderManager, DrawCall, Cube,
    v3_normalize, q_axisAngle, toRad, InputManager, q_multiply,  } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- MyActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return MyPawn}

    init(options) {
        super.init(options);
        this.spawnChild();
        this.subscribe("input", "sDown", this.spawnChild)
        this.tick();
    }

    tick() {
        const q = q_axisAngle(v3_normalize([-1,1,-1]), toRad(4));
        const rotation = q_multiply(this.rotation, q );
        this.rotateTo(rotation);
        this.future(50).tick();
    }

    spawnChild() {
        if (this.children && this.children.size > 0) return;
        MyChildActor.create({parent: this, translation: [1.5,0,0], scale: 0.5} );
    }

}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
//-- MyChildActor --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyChildActor extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return MyPawn}

    init(options) {
        super.init(options);
        this.subscribe("input", "dDown", this.destroy)
    }

}
MyChildActor.register('MyChildActor');

//------------------------------------------------------------------------------------------
//-- MyPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);
        const mesh = Cube(1,1,1);
        mesh.load();    // Meshes need to be loaded to buffer them onto the graphics card
        mesh.clear();   // However once a mesh is loaded it can be cleared so its not taking up memory.
        this.setDrawCall(new DrawCall(mesh));
    }

}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static viewRoot() { return MyViewRoot };

    init(...args) {
        super.init(...args);
        MyActor.create({translation: [0,0,-4], rotation: q_axisAngle(v3_normalize([1,1,1]), toRad(45))});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {

    createServices() {
        this.addService(InputManager);
        this.addService(RenderManager);
    }

}

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

