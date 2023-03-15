import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial } from "@croquet/worldcore";
import { Paths } from "./Paths";

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {
}
TestActor.register('TestActor');


//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return "BasePawn"}
}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [Paths];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");

        this.base = BaseActor.create({});

        this.test0 = TestActor.create({pawn: "TestPawn",translation:[0,5,0]});
        this.test1 = TestActor.create({pawn: "TestPawn", parent: this.test0, translation:[5,0,0]});

        // this.test0.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
        // this.test1.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.test00 = TestActor.create({pawn: "TestPawn",translation:[-5,0,0]});
        this.test01 = TestActor.create({pawn: "TestPawn",translation:[5,0,0]});
        this.test10 = TestActor.create({pawn: "TestPawn",translation:[0,0,-5]});
        this.test11 = TestActor.create({pawn: "TestPawn",translation:[0,0,5]});

    }

}
MyModelRoot.register("MyModelRoot");
