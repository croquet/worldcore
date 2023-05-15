import { Actor, mix, AM_Spatial, AM_Behavioral, AM_OnGrid } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnGrid, AM_Behavioral) {

    get index() {return this._index || 0}

    init(options) {
        super.init(options);
        this.behavior.start({name: "SpreadBehavior", radius: 1.5});
        this.subscribe("hud", "go", this.go);
        this.subscribe("bots", "resetBots", this.reset);
    }

    go(target) {
        // console.log(target);
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }

        const speed = (16 + 4 * Math.random());

        // this.ggg = this.behavior.start({name: "PathToBehavior", xy, speed, noise: 2, radius: 1});
        this.ggg = this.behavior.start( {name: "GotoBehavior", target, speed, noise:2, radius:1} );
    }

    // this is to reset the bots for testing
    reset() {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }
        const ss = 200;
        const x = -ss/2 + ss * Math.random();
        const z = -ss/2 + ss * Math.random();
        const translation = [3*x, 0, 3*z];
        this.set({translation});
    }

    ping() {
        console.log("ping "+ this.name);
        const xxx = this.isBlocked([-1,0,0]);
        console.log(xxx);
    }

}
BotActor.register("BotActor");

