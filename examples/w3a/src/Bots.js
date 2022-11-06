import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor } from "@croquet/worldcore";

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
        this.subscribe("input", "ArrowUpDown", this.fore);
        this.subscribe("input", "ArrowDownDown", this.back);
        this.subscribe("input", "ArrowLeftDown", this.left);
        this.subscribe("input", "ArrowRightDown", this.right);
    }

    fore() {
        console.log("fore!");
        const voxels = this.service("Voxels");

        const x = 0;
        const y = 0.1;

        const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        const above = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,1])));
        const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

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
        this.ground(); // xxx Ground needs to handle shims above doubles

    }


    back() {
        console.log("back");
        const voxels = this.service("Voxels");

        const x = 0;
        const y = -0.1;

        const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        const above = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,1])));
        const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

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
    }

    left() {
        console.log("left");
        const voxels = this.service("Voxels");

        const x = -0.1;
        const y = 0;

        const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        const above = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,1])));
        const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

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
    }

    right() {
        console.log("right");

        const voxels = this.service("Voxels");

        const x = 0.1;
        const y = 0;

        const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        const above = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,1])));
        const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

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


        // const voxels = this.service("Voxels");
        // const surfaces = this.service("Surfaces");
        // const tangent = surfaces.tangent(...this.xyz);

        // const x = 0.1;
        // const y = 0;
        // const rise = v2_multiply(tangent, [x,y]);
        // const z = rise[0] + rise[1];

        // const level = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,0])));
        // const below = v3_add(this.voxel, v3_floor(v3_add(this.fraction,[x,y,-1])));

        // const levelIsEmpty = voxels.get(...level) < 2;
        // const belowIsEmpty = voxels.get(...below) < 2;


        // if (z>0) {
        //     this.fraction = v3_add(this.fraction, [x,y,z]);
        // } else if (z<0 && belowIsEmpty) {
        //     this.fraction = v3_add(this.fraction, [x,y,z]);
        // } else { // z = 0
        //     if (belowIsEmpty) {
        //         console.log("descend");
        //         this.fraction = v3_add(this.fraction, [x,y,-1]);
        //     } else if (levelIsEmpty) {
        //         this.fraction = v3_add(this.fraction, [x,y,0]);
        //     } else if (aboveIsEmpty) {
        //         console.log("ascend");
        //         this.fraction = v3_add(this.fraction, [x,y,1]);
        //     } else {
        //         console.log("Blocked!");
        //         return;
        //     }
        // }

        this.clamp();
        this.ground();
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