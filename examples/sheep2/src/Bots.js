import { Actor, mix, AM_Spatial, AM_Behavioral, AM_OnNavGrid, AM_Avatar  } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid, AM_Behavioral, AM_Avatar) {

    get index() {return this._index || 0}

    init(options) {
        super.init(options);
        // this.behavior.start({name: "SpreadBehavior", radius: 0.5});
        // this.subscribe("hud", "go", this.go);
        // this.subscribe("input", "pDown", this.ping);
    }

    go(xy) {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }

        const speed = (16 + 4 * Math.random());

        // this.ggg = this.behavior.start({name: "PathToBehavior", xy, speed, noise: 2, radius: 1});
        // this.ggg = this.behavior.start({name: "GotoBehavior", xy, speed: 4});
    }

    ping() {
        console.log("ping "+ this.name);
        const xxx = this.isBlocked([-1,0,0]);
        console.log(xxx);
    }

}
BotActor.register("BotActor");

