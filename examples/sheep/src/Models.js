import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, Constants, AM_NavGrid } from "@croquet/worldcore";
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

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {
    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
    }

    navClear() {
        super.navClear();

        for(let n = 0; n < 50; n++) {
            const x = Math.floor(this.gridSize * Math.random());
            const y = Math.floor(this.gridSize * Math.random());
            this.drawBlock(x,y);
        }

        for(let n = 0; n < 3; n++) {
            const x = Math.floor(this.gridSize * Math.random())
            const y = Math.floor(this.gridSize * Math.random());
            const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

            this.drawHorizontalFence(x,y,length);
        }

        for(let n = 0; n < 3; n++) {
            const x = Math.floor(this.gridSize * Math.random())
            const y = Math.floor(this.gridSize * Math.random());
            const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

            this.drawVerticalFence(x,y,length);
        }

    }
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
        console.log("Start root model!");
        this.bots = [];

        this.base = BaseActor.create({gridSize: 50, gridScale:3, subdivisions: 4, noise: 1});

        // const bot = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 0", translation:[0,0.5,0], tags: ["bot"]});
        // this.bots.push(bot);

        this.reset();

        this.subscribe("input", "xDown", this.reset);
        // this.subscribe("input", "zDown", this.ping);
    }

    reset() {

        this.base.navClear();

        this.bots.forEach(b => b.destroy());

        const ss = this.base.gridScale * this.base.gridSize;

        for (let n = 0; n<200; n++) {
            const translation = [ ss * Math.random(), 0, ss * Math.random()];
            const bot = BotActor.create({parent: this.base, pawn: "TestPawn", translation, tags: ["bot"]});
            this.bots.push(bot);
        }

    }

    ping() {
        const found = this.bot0.neighbors(10, "other");
        console.log(found);
    }

}
MyModelRoot.register("MyModelRoot");
