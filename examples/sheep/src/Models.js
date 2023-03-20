import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, Constants } from "@croquet/worldcore";
import { BotActor, BotManager, FlockActor} from "./Bots";
import { Paths, PackKey, packKey } from "./Paths";

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);

    }
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
        console.log("Start root model!");

        this.base = BaseActor.create({});
        // this.flock = FlockActor.create();

        // this.bot0 = BotActor.create({pawn: "TestPawn", name: "bot 0", translation:[3,0,3], tags: ["bot"]});
        // this.bot1 = BotActor.create({pawn: "TestPawn", name: "bot 1", translation:[6,0,3], tags: ["bot"]});

        // this.bot2 = BotActor.create({pawn: "TestPawn", name: "bot 2", translation:[3,0,3], tags: ["bot"]});
        // this.bot3 = BotActor.create({pawn: "TestPawn", name: "bot 3", translation:[4,0,4], tags: ["bot"]});

        // console.log (this.bot0.bin);
        // console.log (this.bot1.bin);

        // this.subscribe("input", "gDown", this.ggg);
        // this.subscribe("hud", "go", this.go)

        this.reset();

        this.subscribe("input", "xDown", this.reset);
        this.subscribe("input", "zDown", this.ping);
    }

    reset() {
        const paths = this.service("Paths");
        const bm = this.service("BotManager");

        paths.clear();
        bm.destroyAll();


        for(let n = 0; n<200;n++) {
            const translation = [ Constants.xSize * Constants.scale * Math.random(), 0, Constants.zSize * Constants.scale * Math.random()];
            const bot = BotActor.create({pawn: "TestPawn", translation, tags: ["bot"]});
        }

    }

    ping() {
        const found = this.bot0.neighbors(10, "other");
        console.log(found);
    }

}
MyModelRoot.register("MyModelRoot");
