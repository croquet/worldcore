import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial } from "@croquet/worldcore";
import { BotActor, BotManager} from "./Bots";
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
        return [Paths, BotManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");

        this.base = BaseActor.create({});
        this.bot0 = BotActor.create({pawn: "TestPawn", name: "bot 0", translation:[1,0.5,1]});
        this.bot1 = BotActor.create({pawn: "TestPawn", name: "bot 1", translation:[2,0.5,2]});

        console.log (this.bot0.bin);
        console.log (this.bot1.bin);

        this.subscribe("input", "gDown", this.ggg);
        this.subscribe("hud", "go", this.go)
    }

    ggg() {
        console.log("ggg");
        this.bot0.behavior.start({name: "GotoBehavior", target: [50,0.5,50], speed: 5});
    }

    go(target) {
        console.log("go");
        console.log(target);
        target[1] = 0.5;
        this.bot1.behavior.start({name: "GotoBehavior", target, speed: 5});
    }

}
MyModelRoot.register("MyModelRoot");
