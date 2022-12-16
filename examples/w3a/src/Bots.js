import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor,
    v3_rotate, q_axisAngle, v3_normalize, v3_magnitude, v3_scale, toDeg, toRad, q_multiply, q_identity, v3_angle, TAU, m4_scaleRotationTranslation, v3_sub, v2_sub, Behavior, v2_magnitude, v2_distance, slerp, v2_rotate } from "@croquet/worldcore";

import { toWorld, packKey, Voxels, clamp} from "./Voxels";
import * as BEHAVIORS from "./SharedBehaviors";
import { VoxelActor } from "./VoxelActor";
import { AM_Avatar, PM_Avatar } from "./Avatar";
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
        this.subscribe("edit", "spawnAvatar", this.onSpawnAvatar);
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

    onSpawnAvatar(data) {
        console.log("Spawn avatar!!")
        console.log(data.driverId);
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        const bot = AvatarActor.create({voxel, fraction:[x,y,0], driverId: data.driverId});

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

        // this.behavior.start({
        //     name:"LoopBehavior",
        //     behavior: {name: "BranchBehavior", condition: "GroundTestBehavior", else: "FallBehavior"}
        // })

        this.set({tags: ["sheep", "obstacle"]});
        this.subscribe("edit", "goto", this.onGoto);
        this.subscribe("input", "lDown", this.destroy);
        // this.subscribe("input", "fDown", this.doFollow);
        // this.subscribe("input", "gDown", this.doFlee);
        this.subscribe("input", "hDown", this.doFlock);
        // this.subscribe("input", "jDown", this.doJostle);
    }

    get conform() {return true}

    onGoto(voxel) {
        const x = this.random();
        const y = this.random();
        const destination = v3_add(voxel, [0.5,0.5,0]);

        this.behavior.kill("WalkToBehavior");
        this.behavior.start({name: "WalkToBehavior", destination})
    }

    doFollow() {
        console.log("follow");
        const bm = this.service("BotManager");
        const target = bm.testAvatar;
        if (!target) return;
        this.behavior.start({name: "FollowBehavior", target})
    }

    doFlee() {
        console.log("avoid");
        this.behavior.start("AvoidBehavior");
    }

    doFlock() {
        console.log("flock");
        // this.behavior.start({name:"InterruptBehavior", behavior:"Behavior", interrupt: "AvoidBehavior"});
        this.behavior.start({name:"InterruptBehavior", behavior:"CohereBehavior", interrupt: "AvoidBehavior"});
        // this.behavior.start("CohereBehavior");
    }

    // doJostle() {
    //     console.log("jostle");
    //     this.behavior.start("JostleBehavior");
    // }

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


class PersonPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("person");
    }
}


//------------------------------------------------------------------------------------------
//-- AvatarActor ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarActor extends mix(PersonActor).with(AM_Avatar) {

    get pawn() {return AvatarPawn}

    init(options) {
        super.init(options);
        const bm = this.service("BotManager");
        bm.testAvatar = this;

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.velocity = [0,0,0];

        this.subscribe("input", "kDown", this.destroy);
        this.subscribe("input", "/Down", this.pingTest);
        this.listen("avatar", this.onAvatar)
        this.future(100).moveTick(100);
    }

    destroy() {
        super.destroy();
        const bm = this.service("BotManager");
        bm.testAvatar = null;
    }

    pingTest() {
        console.log("ping test");
        this.behavior.start("KeyBehavior");
    }

    onAvatar(data) {
        this.yaw = data.yaw;
        this.velocity = data.velocity;
    }

    moveTick(delta) {
        const yawQ = q_axisAngle([0,0,1], this.yaw);
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
        this.ground();
    }


}
AvatarActor.register('AvatarActor');

//------------------------------------------------------------------------------------------
//-- AvatarPawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class AvatarPawn extends mix(PersonPawn).with(PM_Avatar) {
    constructor(actor) {
        super(actor);

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.yaw = 0;
        // this.pitch = toRad(90);
        this.moveSpeed = 1;
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
            // this.pitch += (-this.turnSpeed * e.xy[1]) % TAU;
            // this.pitch = Math.max(-Math.PI/2, this.pitch);
            // this.pitch = Math.min(Math.PI/2, this.pitch);

            // this.pitch = Math.max(0, this.pitch);
            // this.pitch = Math.min(Math.PI, this.pitch);
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
            this.say("avatar", {velocity, yaw:this.yaw},100);
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

