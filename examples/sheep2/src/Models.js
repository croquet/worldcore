import { ModelRoot,  Actor, mix, AM_Spatial, AM_NavGrid, AM_OnNavGrid, UserManager, User } from "@croquet/worldcore";
import { BotActor } from "./Bots";

function rgb(r, g, b) {
    return [r / 255, g / 255, b / 255];
}

//------------------------------------------------------------------------------------------
// TestActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid) {

    init(options) {
        super.init(options);

    }
}

TestActor.register('TestActor');

//------------------------------------------------------------------------------------------
// SimpleActor -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SimpleActor extends mix(Actor).with(AM_Spatial) {

    init(options) {
        super.init(options);

    }
}

SimpleActor.register('SimpleActor');


//------------------------------------------------------------------------------------------
//-- BaseActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial, AM_NavGrid) {
    get pawn() {return "BasePawn"}

    init(options) {
        super.init(options);
    }

    navClear() {
        super.navClear();

        // TestActor.create({pawn: "BlockPawn", parent: this, translation: [0,0,0], obstacle: true});
        // TestActor.create({pawn: "BlockPawn", parent: this, translation: [2,0,2], obstacle: true});
        // TestActor.create({pawn: "BlockPawn", parent: this, translation: [-2,0,-2], obstacle: true});

        for (let n = 0; n < 500; n++) {
            const x = -this.gridSize/2 + Math.floor(this.gridSize * Math.random()) + 0.5;
            const y = -this.gridSize/2 + Math.floor(this.gridSize * Math.random()) + 0.5;
            // this.addBlock(x,y);
            const translation = [3*x,0,3*y];
            TestActor.create({pawn: "BlockPawn", parent: this, translation, obstacle: true});
        }

        this.say("navGridChanged");
    }
}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- Users ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// class MyUserManager extends UserManager {
//     get defaultUser() {return MyUser}
// }
// MyUserManager.register('MyUserManager');

// class MyUser extends User {
//     init(options) {
//         super.init(options);
//         const base = this.wellKnownModel("ModelRoot").base;
//         this.swarm = [];
//         const index = Math.floor(20*Math.random());
//         const ss = base.gridSize;
//         for (let n = 0; n<100; n++) {
//             const x = -ss/2 + ss * Math.random();
//             const y = -ss/2 + ss * Math.random();
//             const xy = [x,y];
//             const bot = BotActor.create({parent: base, driver: this.userId, index, pawn: "AvatarPawn", xy, tags: ["bot"]});
//             this.swarm.push(bot);
//         }
//     }

//     destroy() {
//         super.destroy();
//         this.swarm.forEach(b => b.destroy());
//     }

// }
// MyUser.register('MyUser');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [];
    }

    init(...args) {
        super.init(...args);
        this.seedColors();
        console.log("Start root model!");
        this.bots = [];

        this.base = BaseActor.create({gridSize: 50, gridScale: 3, noise: 5});
        // this.simple = SimpleActor.create({pawn: "BlockPawn", translation:[0,0,0]});

        this.reset();

        this.subscribe("input", "xDown", this.reset);
        this.subscribe("input", "zDown", this.ping);
    }

    seedColors() {
        this.colors = [
            rgb(242, 215, 213),        // Red 0
            rgb(217, 136, 128),        // Red 1
            rgb(192, 57, 43),        // Red 2

            rgb(240, 178, 122),        // Orange 3
            rgb(230, 126, 34),        // Orange 4
            rgb(175, 96, 26),        // Orange 5

            rgb(247, 220, 111),        // Yellow 6
            rgb(241, 196, 15),        // Yellow 7
            rgb(183, 149, 11),        // Yellow 8

            rgb(125, 206, 160),        // Green 9
            rgb(39, 174, 96),        // Green 10
            rgb(30, 132, 73),        // Green 11

            rgb(133, 193, 233),         // Blue 12
            rgb(52, 152, 219),        // Blue 13
            rgb(40, 116, 166),        // Blue 14

            rgb(195, 155, 211),        // Purple 15
            rgb(155, 89, 182),         // Purple 16
            rgb(118, 68, 138),        // Purple 17

            [0.9, 0.9, 0.9],        // White 18
            [0.5, 0.5, 0.5],        // Gray 19
            [0.2, 0.2, 0.2]        // Black 20
        ];
    }

    reset() {

        // this.base.navClear();

        // this.bots.forEach(b => b.destroy());

        // const bot = BotActor.create({pawn: "TestPawn", parent: this.base, name: "bot 0", translation:[0.5,0,0.5], tags: ["bot"]});
        // this.bots.push(bot);

        const ss = this.base.gridSize;

        for (let n = 0; n<200; n++) {
            const x = -ss/2 + ss * Math.random();
            const y = -ss/2 + ss * Math.random();
            const translation = [x*3,0, y*3];
            const index = Math.floor(20*Math.random());
            const bot = BotActor.create({parent: this.base,  index, pawn: "AvatarPawn", translation, tags: ["bot"]});
            this.bots.push(bot);
        }

    }

    ping() {

    }

}
MyModelRoot.register("MyModelRoot");
