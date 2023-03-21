import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle, RegisterMixin, AM_OnGrid, AM_Grid } from "@croquet/worldcore";

import { TestPawn, BasePawn, AvatarPawn } from "./Views";


//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// TestActor2 -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor2 extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_OnGrid) {
}
TestActor2.register('TestActor2');

//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_Grid) {
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

        this.base = BaseActor.create({gridPlane: "xz"});
        this.test0 = TestActor2.create({parent: this.base, pawn: "TestPawn", translation:[0,0,0]});
        this.test1 = TestActor2.create({parent: this.base, pawn: "TestPawn", translation:[5,0,5]});
        console.log(this.test0.gridBin);

        this.sun = TestActor.create({name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = TestActor.create({name: "planet", pawn: "OtherPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})





        this.subscribe("input", "pointerDown", this.click);
    }

    click() {
        console.log("click");

        if (this.sun.pawn === "TestPawn") {
            this.sun.set({pawn: "BallPawn"});
        } else {
            this.sun.set({pawn: "TestPawn"});
        }

    }


}
MyModelRoot.register("MyModelRoot");
