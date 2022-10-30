import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh } from "@croquet/worldcore";

import { toWorld, packKey, Voxels} from "./Voxels";
import * as BEHAVIORS from "./SharedBehaviors";
import { VoxelActor } from "./Props";

//------------------------------------------------------------------------------------------
//-- BotManager ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds all the moving bots under AI Control

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        console.log("Bot Manager");
        this.bots = new Set();
        this.subscribe("edit", "spawn", this.onSpawnBot);
        this.subscribe("voxels", "load", this.destroyAll);
    }

    add(bot) {
        this.bots.add(bot);
    }

    remove(bot) {
        this.bots.delete(bot);
    }

    destroyAll() {
        const doomed = new Set(this.bots);
        doomed.forEach(bot => bot.destroy());
    }

    onSpawnBot(data) {
        console.log("Spawn bot!")
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        const bot = PersonActor.create({voxel, fraction:[x,y,1]});

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

    destroy() {
        super.destroy();
        const bm = this.service("BotManager");
        bm.remove(this);
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
        const FallAndDestroy = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "DestroyBehavior"]}}
        this.startBehavior({name: "CompositeBehavior", options: {parallel: true, behaviors:["TumbleBehavior", FallAndDestroy]}});
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
//-- PersonActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PersonActor extends BotActor {

    get pawn() {return PersonPawn}

    init(options) {
        super.init(options);
        // const FallAndDestroy = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "DestroyBehavior"]}}
        // this.startBehavior({name: "CompositeBehavior", options: {parallel: true, behaviors:["TumbleBehavior", FallAndDestroy]}});
        this.startBehavior("GroundTestBehavior");
    }

}
PersonActor.register("PersonActor");

//------------------------------------------------------------------------------------------
//-- PersonPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class PersonPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("bot");
    }
}