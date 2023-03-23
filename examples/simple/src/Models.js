import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle, RegisterMixin, AM_OnNavGrid, AM_NavGrid } from "@croquet/worldcore";

import { TestPawn, BasePawn, AvatarPawn } from "./Views";


//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// GridActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GridActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnNavGrid) {
}
GridActor.register('GridActor');

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {
    get pawn() {return "BasePawn"}
}
BaseActor.register('BaseActor');


//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");

        this.base = BaseActor.create({gridPlane: 0, gridSize: 32, gridScale: 1});
        this.test0 = GridActor.create({parent: this.base, pawn: "TestPawn", translation:[0.5,0.5,0.5]});
        this.test1 = GridActor.create({parent: this.base, pawn: "TestPawn", translation:[0.5,0.5,0.5]});

        this.sun = TestActor.create({name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = TestActor.create({name: "planet", pawn: "OtherPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})




        this.subscribe("input", "xDown", this.test);
        // this.subscribe("input", "pointerDown", this.click);
    }

    click() {
        console.log("click");

        if (this.sun.pawn === "TestPawn") {
            this.sun.set({pawn: "BallPawn"});
        } else {
            this.sun.set({pawn: "TestPawn"});
        }
    }

    test() {
        console.log("test");
        const ppp = this.test0.findPathTo([1,0,0]);
        console.log(ppp);
    }


}
MyModelRoot.register("MyModelRoot");
