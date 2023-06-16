import { AM_Behavioral, ModelRoot,  Actor, mix, AM_Spatial, Constants, AM_Spec, AccountManager } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// BaseActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_Spec) {}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Spec) {

    get manifest() {
        return ["name", "translation", "rotation"];
    }
}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() { return [AccountManager] }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.base = BaseActor.create({pawn: "GroundPawn"});
        this.sun = TestActor.create({parent: this.base, name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = TestActor.create({name: "planet", pawn: "PlanetPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5});

        this.subscribe("input", "pointerDown", this.click);
        // this.subscribe("input", "xDown", this.test);
        // this.subscribe("input", "zDown", this.test2);
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
        this.spec = this.sun.toSpec();
        console.log(this.spec );
    }

    test2() {
        console.log("test2");
        this.sun.destroy();
        this.sun = this.base.createFromSpec(this.spec);
        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], speed: 2});
    }


}
MyModelRoot.register("MyModelRoot");
