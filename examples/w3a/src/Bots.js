import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor,
    v3_rotate, q_axisAngle, v3_normalize, v3_magnitude, v3_scale, toDeg, toRad, q_multiply, q_identity, v3_angle, TAU, m4_scaleRotationTranslation } from "@croquet/worldcore";

import { toWorld, packKey, Voxels, clamp} from "./Voxels";
import * as BEHAVIORS from "./SharedBehaviors";
import { VoxelActor } from "./VoxelActor";
import { AM_Avatar, PM_Avatar } from "./Avatar";

//------------------------------------------------------------------------------------------
//-- BotManager ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds all the moving bots under AI Control

export class BotManager extends ModelService {
    init() {
        super.init("BotManager");
        console.log("Bot Manager");
        this.bots = new Set();
        this.subscribe("edit", "spawnSheep", this.onSpawnSheep);
        this.subscribe("edit", "spawnPerson", this.onSpawnPerson);
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

    onSpawnSheep(data) {
        console.log("Spawn sheep!")
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        // const bot = PersonActor.create({voxel, fraction:[x,y,0]});
        const sheep = AvatarActor.create({voxel, fraction:[x,y,0], driverId: data.driverId});

    }

    onSpawnPerson(data) {
        console.log("Spawn person!")
        console.log(data.driverId);
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        const bot = PersonActor.create({voxel, fraction:[x,y,0], driverId: data.driverId});

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
//-- SheepActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SheepActor extends BotActor {

    get pawn() {return SheepPawn}

    init(options) {
        super.init(options);
        this.startBehavior("BotBehavior");
    }

    get conform() {return true}
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
        console.log("new person!");
        console.log(options);
        console.log(this._driverId);
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
        this.useInstance("person");
    }
}


//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarActor extends mix(SheepActor).with(AM_Avatar) {

    get pawn() {return AvatarPawn}

    init(options) {
        super.init(options);

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.velocity = [0,0,0];
        this.yaw = 0;

        this.subscribe("input", "lDown", this.destroy);

        this.listen("avatar", this.onAvatar)
        this.future(100).moveTick(100);
    }

    onAvatar(data) {
        this.yaw = data.yaw;
        this.velocity = data.velocity;
    }

    moveTick(delta) {
        const yawQ = q_axisAngle([0,0,1], this.yaw);

        let rotation = yawQ;
        if (this.conform) {
            const surfaces = this.service("Surfaces");
            const normal = surfaces.normal(...this.xyz);
            const front = v3_rotate([0,1,0], yawQ);
            const pitch = v3_angle(front,normal) + toRad(-90);
            const pitchQ = q_axisAngle([1,0,0], pitch);
            rotation = q_multiply(pitchQ, yawQ);
        }
        this.set({rotation});
        // const move = v3_scale(this.velocity, delta * 0.005);
        const move = v3_scale(this.velocity, delta * 0.002);
        this.go(...v3_rotate(move, yawQ));

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

        this.xyz = v3_add(this.xyz, [x,y,z])
        this.hop();
    }


}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- AvatarPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class AvatarPawn extends mix(SheepPawn).with(PM_Avatar) {
    constructor(actor) {
        super(actor);

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.yaw = 0;
        this.pitch = toRad(90);
        this.moveSpeed = 0.1;
        this.turnSpeed = 0.002;
    }

    drive() {
        if (!this.isMyAvatarPawn) return;
        this.subscribe("input", "ArrowUpDown", this.foreDown);
        this.subscribe("input", "ArrowUpUp", this.foreUp);
        this.subscribe("input", "ArrowDownDown", this.backDown);
        this.subscribe("input", "ArrowDownUp", this.backUp)

        this.subscribe("input", "ArrowRightDown", this.rightDown);
        this.subscribe("input", "ArrowRightUp", this.rightUp);
        this.subscribe("input", "ArrowLeftDown", this.leftDown);
        this.subscribe("input", "ArrowLeftUp", this.leftUp)



        // this.subscribe("input", "wDown", this.foreDown);
        // this.subscribe("input", "wUp", this.foreUp);
        // this.subscribe("input", "sDown", this.backDown);
        // this.subscribe("input", "sUp", this.backUp)

        // this.subscribe("input", "dDown", this.rightDown);
        // this.subscribe("input", "dUp", this.rightUp);
        // this.subscribe("input", "aDown", this.leftDown);
        // this.subscribe("input", "aUp", this.leftUp)

        // this.subscribe("ui", "pointerDown", this.doPointerDown);
        // this.subscribe("input", "pointerUp", this.doPointerUp);
        // this.subscribe("input", "pointerDelta", this.doPointerDelta);
        // this.subscribe("input", "pointerMove", this.doPointerMove);
    }

    park() {
        this.unsubscribe("input", "ArrowUpDown", this.foreDown);
        this.unsubscribe("input", "ArrowUpUp", this.foreUp);
        this.unsubscribe("input", "ArrowDownDown", this.backDown);
        this.unsubscribe("input", "ArrowDownUp", this.backUp)

        this.unsubscribe("input", "ArrowRightDown", this.rightDown);
        this.unsubscribe("input", "ArrowRightUp", this.rightUp);
        this.unsubscribe("input", "ArrowLeftDown", this.leftDown);
        this.unsubscribe("input", "ArrowLeftUp", this.leftUp)
    }

    foreDown() { this.fore = 1; }
    foreUp() {  this.fore = 0; }
    backDown() {this.back = -1; }
    backUp() { this.back = 0; }

    rightDown() { this.right = 1;}
    rightUp() {  this.right = 0; }
    leftDown() {this.left = -1; }
    leftUp() { this.left = 0; }

    doPointerDown(e) {
        if (e.button === 2) {
            this.service("InputManager").enterPointerLock();
        };
    }

    doPointerUp(e) {
        if (e.button === 2) {
            this.service("InputManager").exitPointerLock();
        };
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yaw += (-this.turnSpeed * e.xy[0]) % TAU;
            this.pitch += (-this.turnSpeed * e.xy[1]) % TAU;
            // this.pitch = Math.max(-Math.PI/2, this.pitch);
            // this.pitch = Math.min(Math.PI/2, this.pitch);

            this.pitch = Math.max(0, this.pitch);
            this.pitch = Math.min(Math.PI, this.pitch);
            this.updateCamera();
        };
    }

    doPointerMove(e) {
        // if (this.isPaused) return;
        // this.raycast(e.xy);
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.isMyAvatarPawn) {
            this.yaw += 0.001 * delta * (-this.left + -this.right);
            // const velocity = [(this.right + this.left), (this.fore + this.back),0];
            const velocity = [0, (this.fore + this.back),0];
            this.say("avatar", {velocity, yaw:this.yaw},50);
            // this.updateCamera()
        }
    }

    updateCamera() {
        const render = this.service("ThreeRenderManager");

        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,0,1], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);

        const ttt = v3_add(this.translation, [0,0,5]);

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], lookQ, ttt);
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;
    }




}