// World Core Tutorial
//
// Copyright Croquet Corporation, 2021

import { ModelRoot, ViewRoot, Actor, Pawn, mix, AM_Spatial, PM_Spatial, PM_Visible, RenderManager, DrawCall, Cube,
    v3_normalize, q_axisAngle, toRad, StartWorldcore, InputManager } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- MyActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Spatial) {

    get pawn() {return MyPawn}

}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
//-- MyPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);
        const mesh = Cube(1,1,1);
        mesh.load();
        mesh.clear();
        this.setDrawCall(new DrawCall(mesh));
    }
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    init(...args) {
        super.init(...args);
        MyActor.create({translation: [0,0,-3], rotation: q_axisAngle(v3_normalize([1,1,1]), toRad(45))});
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
MyViewRoot.register("MyViewRoot");

StartWorldcore({appId: 'io.croquet.appId', name: 'tutorial', password: 'password'});

