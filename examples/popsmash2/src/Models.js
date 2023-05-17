import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, q_axisAngle, RegisterMixin, v3_add} from "@croquet/worldcore";
// import { AM_Grid, AM_OnGrid } from "./Grid";

//------------------------------------------------------------------------------------------
// BaseActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {}
TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// VoteActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class VoteActor extends Actor {
    init(options) {
        super.init(options);
        this.votes = new Map();
        this.subscribe("hud", "vote", this.tally);
    }

    tally(data) {
        this.votes.set(data.user, data.pick);
        console.log(this.votes);
    }
}
VoteActor.register('VoteActor');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [UserManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.vote = VoteActor.create();

        this.base = BaseActor.create({pawn: "GroundPawn"});
        this.sun = TestActor.create({parent: this.base, name: "sun", pawn: "TestPawn", translation:[0,2,0]});
        this.planet = TestActor.create({name: "planet", pawn: "PlanetPawn", parent: this.sun, translation:[5,0,0]});

        this.sun.behavior.start({name: "SpinBehavior", axis:[0,1,0], tickRate: 1000, speed: 2});
        this.planet.behavior.start({name: "SpinBehavior", axis:[0,0,1], speed: -0.5});

        // this.subscribe("input", "pointerDown", this.click);
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
