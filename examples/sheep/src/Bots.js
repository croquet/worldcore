import { Actor, mix, AM_Spatial, AM_Behavioral, AM_OnNavGridX  } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnNavGridX, AM_Behavioral) {

    init(options) {
        super.init(options);
        this.spread = this.behavior.start({name: "SpreadBehavior", radius: 0.5});
        this.subscribe("hud", "go", this.go);
        // this.subscribe("input", "pDown", this.ping);
    }

    go(xy) {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }

        const speed = (16 + 4 * Math.random());

        this.ggg = this.behavior.start({name: "PathToBehaviorX", xy, speed, noise: 2, radius: 1});
        // this.ggg = this.behavior.start({name: "GotoBehaviorX", xy, speed: 4});
    }

    ping() {
        console.log("ping "+ this.name);
        const xxx = this.isBlocked([-1,0,0]);
        console.log(xxx);
    }

}
BotActor.register("BotActor");

