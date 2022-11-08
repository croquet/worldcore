import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor,
    v3_rotate, q_axisAngle, v3_normalize, v3_magnitude, v3_scale, toDeg, toRad, q_multiply, q_identity, v3_angle } from "@croquet/worldcore";

import { toWorld, packKey, Voxels, clamp} from "./Voxels";
import * as BEHAVIORS from "./SharedBehaviors";
import { VoxelActor } from "./VoxelActor";

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
        // const bot = PersonActor.create({voxel, fraction:[x,y,0]});
        const bot = AvatarActor.create({voxel, fraction:[x,y,0]});

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

        const FallThenDestroy = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "DestroyBehavior"]}};
        this.startBehavior({name: "CompositeBehavior", options: {parallel: true, behaviors:["TumbleBehavior", FallThenDestroy]}});
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

        const FallThenDestroy = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "DestroyBehavior"]}};
        this.startBehavior({name: "CompositeBehavior", options: {parallel: true, behaviors:["TumbleBehavior", FallThenDestroy]}});
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
//-- PersonActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PersonActor extends BotActor {

    get pawn() {return PersonPawn}

    init(options) {
        super.init(options);
        this.startBehavior("BotBehavior");
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


//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarActor extends PersonActor {

    // get pawn() {return AvatarPawn}

    init(options) {
        super.init(options);
        console.log("new avatar");

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.yaw = 0;

        this.subscribe("input", "ArrowUpDown", this.foreDown);
        this.subscribe("input", "ArrowUpUp", this.foreUp);
        this.subscribe("input", "ArrowDownDown", this.backDown);
        this.subscribe("input", "ArrowDownUp", this.backUp)

        this.subscribe("input", "ArrowRightDown", this.rightDown);
        this.subscribe("input", "ArrowRightUp", this.rightUp);
        this.subscribe("input", "ArrowLeftDown", this.leftDown);
        this.subscribe("input", "ArrowLeftUp", this.leftUp)

        this.future(100).moveTick(100);
    }

    foreDown() { this.fore = 1; }
    foreUp() {  this.fore = 0; }
    backDown() {this.back = -1; }
    backUp() { this.back = 0; }

    rightDown() { this.right = -1;}
    rightUp() {  this.right = 0; }
    leftDown() {this.left = 1; }
    leftUp() { this.left = 0; }

    moveTick(delta) {
        const surfaces = this.service("Surfaces");
        const normal = surfaces.normal(...this.xyz);


        this.yaw += 0.002 * delta * (this.left + this.right);

        const yawQ = q_axisAngle([0,0,1], this.yaw);


        const front = v3_rotate([0,1,0], yawQ);
        const pitch = v3_angle(front,normal) + toRad(-90);
        const pitchQ = q_axisAngle([1,0,0], pitch);

        const rot = q_multiply(pitchQ, yawQ);

        this.set({rotation: rot});

        const mmm = [0, (this.fore + this.back) * delta * 0.002,0];
        const vvv = v3_rotate(mmm, yawQ);
        this.go(vvv[0], vvv[1]);

        this.future(100).moveTick(100);
    }

    go(x,y) {
        const voxels = this.service("Voxels");

        const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        const above = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,1])));
        const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

        if (!Voxels.canEdit(...level)) {
            console.log("Edge Blocked!");
            return;
        }

        const levelIsEmpty = voxels.get(...level) < 2;
        const aboveIsEmpty = voxels.get(...above) < 2;
        const belowIsEmpty = voxels.get(...below) < 2;

        let z = 0;
        if (levelIsEmpty) {
            if (belowIsEmpty) z = -1;
        } else {
            if (aboveIsEmpty) {
                z = 1;
            } else {
                console.log("Blocked!");
                return;
            }
        }

        this.fraction = v3_add(this.fraction, [x,y,z]);

        this.clamp();
        this.ground();
        this.hop();

    }


}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- AvatarPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


// class AvatarPawn extends PersonPawn {
//     constructor(actor) {
//         super(actor);

//     }

//     update(time, delta) {
//         super.update(time,delta);
//         // console.log("pawn update2");
//     }

//     foreDown() {
//         console.log("fore down");
//     }

//     foreUp() {
//         console.log("fore up");
//     }
// }