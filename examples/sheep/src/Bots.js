import { ModelService, Actor, mix, AM_Spatial, AM_Behavioral } from "@croquet/worldcore";
import { packKey } from "./Paths";

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        this.bots = new Set();
        this.bins = new Map();
    }

    addToBin(bot) {
        const bin = this.bins.get(bot.key) || new Set();
        this.bins.set(bot.key, bin);
        bin.add(bot);
        bot.bin = bin;
    }

    remove(bot) {
        this.bots.delete(bot);
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
        bm.bots. add(this);
    }

    destroy() {
        super.destroy();
        const bm = this.service("BotManager");
        bm.bots.delete(this);
    }

    translationSet(t) {
        const x = t[0];
        const z = t[2];
        this.key = packKey(x,1,z);
    }


}
BotActor.register("BotActor");