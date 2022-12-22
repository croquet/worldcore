import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor,
    v3_rotate, q_axisAngle, v3_normalize, v3_magnitude, v3_scale, toDeg, toRad, q_multiply, q_identity, v3_angle, TAU, m4_scaleRotationTranslation, v3_sub, v2_sub, Behavior, v2_magnitude, v2_distance, slerp, v2_rotate } from "@croquet/worldcore";

import { toWorld, packKey, Voxels, clamp} from "./Voxels";

import * as SHARED from "./SharedBehaviors";
import * as SHEEP from "./SheepBehaviors";

import { VoxelActor } from "./VoxelActor";
import { AM_Flockable, FlockActor } from "./Flock";

//------------------------------------------------------------------------------------------
//-- BotManager ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds all the moving bots under AI Control

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        console.log("Bot Manager!");
        this.bots = new Set();
        this.bins = new Map();
        this.subscribe("edit", "spawnSheep", this.onSpawnSheep);
        // this.subscribe("edit", "spawnAvatar", this.onSpawnAvatar);
        this.subscribe("voxels", "load", this.destroyAll);
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

//------------------------------------------------------------------------------------------
//-- BotActor ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotActor extends mix(VoxelActor).with(AM_Behavioral) {

    init(options) {
        super.init(options);
        const bm = this.service("BotManager");
        bm.add(this);
    }

    get conform() { return this._conform} // Align pitch with terrain

    destroy() {
        super.destroy();
        const bm = this.service("BotManager");
        this.bin.delete(this);
        bm.remove(this);
    }

    voxelSet(voxel) {
        super.voxelSet(voxel);
        const bm = this.service("BotManager");
        if (this.bin) this.bin.delete(this);
        bm.addToBin(this);
    }

    neighbors(radius, tag) {
        radius = Math.floor(radius);
        const bm = this.service("BotManager");
        const paths = this.service("Paths");
        const out = [];
        paths.ping(this.key, (node, range) => {
            if (range>radius) return true;
            const nodeKey = node.key;
            const bin = bm.bins.get(nodeKey);
            if (!bin || bin.size == 0) return false;
            for (const bot of bin) {
                if (bot == this) continue;
                if (bot.tags.has(tag)) out.push(bot)
            }
        });
        return out;
    }

    close(radius,tag) {
        const neighbors = this.neighbors(radius, tag);
        return neighbors.sort((a,b) => {
            const aDistance = v2_distance(this.xyz, a.xyz);
            const bDistance = v2_distance(this.xyz, b.xyz);
            return aDistance-bDistance;
        });
    }

    closest(radius,tag) {
        const a = this.close(radius, tag);
        if (a.length>0) return a[0];
        return null;
    }

    see(far, tag) {
        far = Math.floor(far);
        const forward = v2_rotate([0,1], this.yaw);
        const pm = this.service("PropManager");
        const bm = this.service("BotManager");
        const paths = this.service("Paths");
        const out = [];
        paths.look(this.key, forward, (key, range) => {
            if (range>far) return true;
            // console.log(range);
            const prop = pm.get(key);
            if (prop && prop.tags.has(tag)) out.push(prop);
            const bin = bm.bins.get(key);
            if (!bin || bin.size == 0) return false;
            for (const bot of bin) {
                if (bot == this) continue;
                if (bot.tags.has(tag)) out.push(bot)
            }
        });
        return out;
    }


}
BotActor.register("BotActor");

//------------------------------------------------------------------------------------------
//-- RubbleActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RubbleActor extends BotActor {

    get pawn() {return RubblePawn}

    init(options) {
        super.init(options);

        this.behavior.start("TumbleBehavior");
        this.behavior.start({name: "SequenceBehavior", behaviors:["FallBehavior", "DestroyBehavior"]});
    }

    get type() {return this._type || Constants.voxel.dirt};

}
RubbleActor.register("RubbleActor");

//------------------------------------------------------------------------------------------
//-- RubblePawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class RubblePawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        switch (this.actor.type) {
            case Constants.voxel.dirt: this.useInstance("dirtRubble"); break;
            case Constants.voxel.rock: this.useInstance("rockRubble"); break;
            default: this.useInstance("dirtRubble");
        }
    }
}

//------------------------------------------------------------------------------------------
//-- LogActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class LogActor extends BotActor {

    get pawn() {return LogPawn}

    init(options) {
        super.init(options);

        this.behavior.start("TumbleBehavior");
        this.behavior.start({name: "SequenceBehavior", behaviors:["FallBehavior", "DestroyBehavior"]});
    }

    get type() {return this._type || Constants.voxel.dirt};

}
LogActor.register("LogActor");

//------------------------------------------------------------------------------------------
//-- LogPawn--------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class LogPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("log");
    }
}

//------------------------------------------------------------------------------------------
//-- SheepActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SheepActor extends mix(BotActor).with(AM_Flockable) {

    get pawn() {return SheepPawn}

    init(options) {
        super.init(options);

        this.set({tags: ["sheep", "obstacle"]});
        this.subscribe("edit", "goto", this.onGoto);
        this.subscribe("input", "lDown", this.destroy);
        this.subscribe("input", "hDown", this.doFlock);
    }

    get conform() {return true}

    onGoto(voxel) {
        const x = this.random();
        const y = this.random();
        const destination = v3_add(voxel, [0.5,0.5,0]);

        this.behavior.kill("WalkToBehavior");
        this.behavior.start({name: "WalkToBehavior", destination})
    }

    doFlock() {
        console.log("flock");
        this.behavior.start({name:"InterruptBehavior", behavior:"CohereBehavior", interrupt: "AvoidBehavior"});
    }

}
SheepActor.register("SheepActor");

//------------------------------------------------------------------------------------------
//-- SheepPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class SheepPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("sheep");
    }

}

//------------------------------------------------------------------------------------------
//-- PersonActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PersonActor extends BotActor {

    get pawn() {return PersonPawn}

    init(options) {
        super.init(options);
        this.set({tags: ["threat"]})
        console.log(this.tags);
    }
}
PersonActor.register("PersonActor");

//------------------------------------------------------------------------------------------
//-- PersonPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class PersonPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("person");
    }
}


