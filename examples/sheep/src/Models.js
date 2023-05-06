import { AM_Behavioral,  UserManager, User, AM_Avatar, ModelRoot,  Actor, mix, AM_Spatial, Constants, AM_NavGrid } from "@croquet/worldcore";
import { BotActor } from "./Bots";
import { AM_NavGridX, AM_OnNavGridX} from "./NavGrid";

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_OnNavGridX) {

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

        for (let n = 0; n < 100; n++) {
            const x = Math.floor(this.gridSize * Math.random()) + 0.5;
            const y = Math.floor(this.gridSize * Math.random()) + 0.5;
            // this.addBlock(x,y);
            const xy = [x,y];
            TestActor.create({pawn: "BlockPawn", parent: this, xy, obstacle: true});
        }

        // for (let n = 0; n < 3; n++) {
        //     const x = Math.floor(this.gridSize * Math.random());
        //     const y = Math.floor(this.gridSize * Math.random());
        //     const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

        //     this.addHorizontalFence(x,y,length);
        // }

        // for (let n = 0; n < 3; n++) {
        //     const x = Math.floor(this.gridSize * Math.random());
        //     const y = Math.floor(this.gridSize * Math.random());
        //     const length = Math.floor(this.gridSize/2 * Math.random()) + 1;

        //     this.addVerticalFence(x,y,length);
        // }

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

        this.base = BaseActor.create({gridSize: 50, gridScale: 3, noise: 5});

        // const bot0 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 0", xy:[0.5,0.5], tags: ["bot"]});
        // this.bots.push(bot0);
        // const bot1 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 1", xy:[0.5,0.5], tags: ["bot"]});
        // this.bots.push(bot1);
        // const bot2 = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 2", xy:[0.5,0,0.5], tags: ["bot"]});
        // this.bots.push(bot2);

        TestActor.create({pawn: "BlockPawn", parent: this.base, name: "block 0", xy:[5.5,5.5], obstacle: true, tags: ["block"]});


        this.reset();

        this.subscribe("input", "xDown", this.reset);
        this.subscribe("input", "zDown", this.ping);
    }

    reset() {

        // this.base.navClear();

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
