import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle, RegisterMixin, AM_OnNavGrid, AM_NavGrid } from "@croquet/worldcore";

import { TestPawn } from "./Views";


//------------------------------------------------------------------------------------------
// BaseActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.base = BaseActor.create({pawn: "GroundPawn"});
        this.sun = TestActor.create({name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = TestActor.create({name: "planet", pawn: "PlanetPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5})

        this.subscribe("input", "pointerDown", this.click);
        // this.subscribe("input", "xDown", this.test);
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
    }



}
MyModelRoot.register("MyModelRoot");
