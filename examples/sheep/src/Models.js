import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, Constants, AM_NavGrid } from "@croquet/worldcore";
import { BotActor, BotManager, FlockActor} from "./Bots";
// import { Paths, PackKey } from "./Paths";
import { AM_NavGridX, packKey, unpackKey} from "./Grid";

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

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGridX) {
    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
    }

    navClear() {
        super.navClear();

        for (let n = 0; n < 50; n++) {
            const x = Math.floor(this.gridSize * Math.random());
            const y = Math.floor(this.gridSize * Math.random());
            this.addBlock(x,y);
        }

        for (let n = 0; n < 3; n++) {
            const x = Math.floor(this.gridSize * Math.random());
            const y = Math.floor(this.gridSize * Math.random());
            const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

            this.addHorizontalFence(x,y,length);
        }

        for (let n = 0; n < 3; n++) {
            const x = Math.floor(this.gridSize * Math.random());
            const y = Math.floor(this.gridSize * Math.random());
            const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

            this.addVerticalFence(x,y,length);
        }

        this.say("navGridChanged");
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
        console.log("Start root model!!!!");
        this.bots = [];

        this.base = BaseActor.create({gridSize: 50, gridScale: 3, noise: 3});

        // const bot0 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 0", xy:[0.5,0.5], tags: ["bot"]});
        // this.bots.push(bot0);
        // const bot1 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 1", xy:[0.5,0.5], tags: ["bot"]});
        // this.bots.push(bot1);
        // const bot2 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 2", xy:[0.5,0,0.5], tags: ["bot"]});
        // this.bots.push(bot2);


        this.reset();

        this.subscribe("input", "xDown", this.reset);
        this.subscribe("input", "zDown", this.ping);
    }

    reset() {

        this.base.navClear();

        this.bots.forEach(b => b.destroy());

        // const bot = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 0", translation:[0.5,0,0.5], tags: ["bot"]});
        // this.bots.push(bot);

        const ss = this.base.gridSize;

        for (let n = 0; n<100; n++) {
            const xy = [ ss * Math.random(), ss * Math.random()];
            const bot = BotActor.create({parent: this.base, pawn: "TestPawn", xy, tags: ["bot"]});
            this.bots.push(bot);
        }

    }

    ping() {

    }

}
MyModelRoot.register("MyModelRoot");
