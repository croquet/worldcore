import { AM_Behavioral, ModelRoot,  Actor, mix, AM_Spatial, Constants, AM_Spec, AccountManager, LevelManager } from "@croquet/worldcore";
// import { level } from "./Level";

//------------------------------------------------------------------------------------------
// BaseActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_Spec) {}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// SunActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SunActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Spec) {

    init(options) {
        super.init(options);
        this.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.subscribe("input", "pointerDown", this.click);
    }

    get manifest() {
        return ["name", "translation", "rotation"];
    }

    click() {
        console.log("click");

        if (this.pawn === "TestPawn") {
            this.set({pawn: "BallPawn"});
        } else {
            this.set({pawn: "TestPawn"});
        }
    }
}
SunActor.register('SunActor');

//------------------------------------------------------------------------------------------
// PlanetActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PlanetActor extends mix(Actor).with(AM_Spatial, AM_Behavioral, AM_Spec) {

    init(options) {
        super.init(options);
        this.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5});
    }

    get manifest() {
        return ["name", "translation", "rotation"];
    }
}
PlanetActor.register('PlanetActor');


//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() { return [LevelManager, AccountManager] }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        const level = this.service("LevelManager").current;
        console.log(level);

        this.base = BaseActor.create({parent: level, pawn: "GroundPawn"});
        this.sun = SunActor.create({parent: this.base, name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = PlanetActor.create({name: "planet", pawn: "PlanetPawn", parent: this.sun, translation:[5,0,0]});

        // this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        // this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5});

        // this.subscribe("input", "pointerDown", this.click);
        this.subscribe("input", "xDown", this.test);
        this.subscribe("input", "zDown", this.test2);
        this.subscribe("input", "cDown", this.test3);
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
        const level = this.service("LevelManager").current;
        this.save  = level.save();
        console.log(this.save);
    }

    test2() {
        console.log("test2");
        const lm = this.service("LevelManager");
        lm.load("bing");
    }

    test3() {
        console.log("test2");
        const lm = this.service("LevelManager");
        lm.load("bong");
    }


}
MyModelRoot.register("MyModelRoot");
