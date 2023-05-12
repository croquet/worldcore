import { Actor, mix, AM_Spatial, AM_Behavioral, AM_OnNavGrid  } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_OnNavGrid, AM_Behavioral) {

    get index() {return this._index || 0}

    init(options) {
        super.init(options);
        this.behavior.start({name: "SpreadBehavior", radius: 1});
        this.subscribe("hud", "go", this.go);
        // this.subscribe("input", "pDown", this.ping);
    }

    go(xyz) {
        if (this.ggg) {
            this.ggg.destroy();
            this.ggg = null;
        }

        const speed = 3* (16 + 4 * Math.random());

        this.ggg = this.behavior.start({name: "PathToBehavior", target: xyz, speed, noise: 2, radius: 1});
        // this.ggg = this.behavior.start({name: "GotoBehavior", target: xyz, speed: 20});
    }

    ping() {
        console.log("ping "+ this.name);
        const xxx = this.isBlocked([-1,0,0]);
        console.log(xxx);
    }

}
BotActor.register("BotActor");

