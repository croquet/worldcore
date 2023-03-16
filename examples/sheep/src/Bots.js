import { ModelService } from "@croquet/worldcore";

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        this.bots = new Set();
        this.bins = new Map();
    }

    add(bot) {
        this.bots.add(bot);
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

    onSpawnSheep(data) {
        console.log("Spawn sheep!")
        if (!this.flock) this.flock = FlockActor.create();
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        for (let i = 0; i<1; i++) {
            const sheep = SheepActor.create({voxel, fraction:[0.5,0.5,0], flock:this.flock});
        }
    }

}
BotManager.register("BotManager");