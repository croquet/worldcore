import { ModelService, Actor, mix, AM_Spatial, AM_Behavioral, Constants } from "@croquet/worldcore";
import { packKey } from "./Paths";

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        this.bots = new Set();
        this.bins = new Map();
    }

    addToBin(bot) {
        let bin = this.bins.get(bot.key);
        if (!bin) {
            bin = new Set();
            this.bins.set(bot.key, bin);
        }
        bin.add(bot);
        bot.bin = bin;
    }
    removeFromBin(bot) {
        const bin = this.bins.get(bot.key);
        if (bin) this.bins.delete(bot);
        bot.bin = null;
    }

    destroyAll() {
        const doomed = new Set(this.bots);
        doomed.forEach(bot => bot.destroy());
    }


}
BotManager.register("BotManager");

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(Actor).with(AM_Spatial, AM_Behavioral) {

    init(options) {
        super.init(options);
        const bm = this.service("BotManager");
        bm.bots.add(this);
    }

    destroy() {
        super.destroy();
        const bm = this.service("BotManager");
        bm.removeFromBin(this);
        bm.bots.delete(this);
    }

    translationSet(t) {
        const bm = this.service("BotManager");
        bm.removeFromBin(this);
        const x = Math.floor(t[0]/Constants.scale);
        const z = Math.floor(t[2]/Constants.scale);
        this.xz = [x,z];
        this.key = packKey(x,1,z);
        bm.addToBin(this);
    }


}
BotActor.register("BotActor");