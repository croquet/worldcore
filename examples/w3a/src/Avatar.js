// import { ModelService, RegisterMixin, mix  } from "@croquet/worldcore";

import { ModelService, Constants, Actor, Pawn, mix, PM_Smoothed, AM_Behavioral, PM_InstancedMesh, SequenceBehavior, v3_add, v2_multiply, v3_floor,
    v3_rotate, q_axisAngle, v3_normalize, v3_magnitude, v3_scale, toDeg, toRad, q_multiply, q_identity, v3_angle, TAU, m4_scaleRotationTranslation, v3_sub, v2_sub, Behavior, v2_magnitude, v2_distance, slerp, v2_rotate, RegisterMixin } from "@croquet/worldcore";

import { toWorld, packKey, Voxels, clamp} from "./Voxels";
import { PersonActor, PersonPawn } from "./Bots";

//------------------------------------------------------------------------------------------
//-- AvatarManager ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Manages user avatars

export class AvatarManager extends ModelService {
    init() {
        super.init("AvatarManager");
        console.log("AvatarManager!")
        this.subscribe("edit", "spawnAvatar", this.onSpawnAvatar);;
    }

    onSpawnAvatar(data) {
        console.log("Spawn avatar!!")
        console.log(data.driverId);
        const voxel = data.xyz
        const x = 0.5
        const y = 0.5
        const avatar = ThirdPersonActor.create({voxel, fraction:[x,y,0], driverId: data.driverId});
        // const avatar = FirstPersonActor.create({voxel, fraction:[x,y,0], driverId: data.driverId});
    }
}
AvatarManager.register("AvatarManager");


//------------------------------------------------------------------------------------------
//-- AM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Avatar = superclass => class extends superclass {

    get driverId() { return this._driverId} // The userId of the user controlling this avatar

};
RegisterMixin(AM_Avatar);


//------------------------------------------------------------------------------------------
//-- PM_Avatar -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Avatar = superclass => class extends superclass {

    constructor(actor) {
        super(actor);
        console.log("PM_Avatar");
        this.listenOnce("driverIdSet", this.onDriverIdSet);
        this.drive();
    }

    get isMyAvatarPawn() {
        return this.actor.driverId === this.viewId;
    }

    onDriverIdSet(e) {
        this.park();
        this.drive();
    }

    drive() {}
    park() {}
};

//------------------------------------------------------------------------------------------
//-- ThirdPersonActor ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ThirdPersonActor extends mix(PersonActor).with(AM_Avatar) {

    get pawn() {return ThirdPersonPawn}

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
ThirdPersonActor.register('ThirdPersonActor');

//------------------------------------------------------------------------------------------
//-- ThirdPersonPawn------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ThirdPersonPawn extends mix(PersonPawn).with(PM_Avatar) {
    constructor(actor) {
        super(actor);

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.yaw = 0;
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

    update(time, delta) {
        super.update(time,delta);
        if (this.isMyAvatarPawn) {
            this.yaw += 0.001 * delta * (-this.left + -this.right);
            const velocity = [0, (this.fore + this.back),0];
            this.say("avatar", {velocity, yaw:this.yaw},100);
        }
    }
}

//------------------------------------------------------------------------------------------
//-- FirstPersonActor ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FirstPersonActor extends mix(PersonActor).with(AM_Avatar) {

    get pawn() {return FirstPersonPawn}

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
FirstPersonActor.register('FirstPersonActor');

//------------------------------------------------------------------------------------------
//-- FirstPersonPawn------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class FirstPersonPawn extends mix(PersonPawn).with(PM_Avatar) {
    constructor(actor) {
        super(actor);

        this.left = this.right = 0;
        this.fore = this.back = 0;
        this.yaw = 0;
        this.pitch = toRad(90);
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

        this.subscribe("input", "wDown", this.foreDown);
        this.subscribe("input", "wUp", this.foreUp);
        this.subscribe("input", "sDown", this.backDown);
        this.subscribe("input", "sUp", this.backUp)

        this.subscribe("input", "dDown", this.rightDown);
        this.subscribe("input", "dUp", this.rightUp);
        this.subscribe("input", "aDown", this.leftDown);
        this.subscribe("input", "aUp", this.leftUp)

        this.subscribe("ui", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
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
            const velocity = [(this.right + this.left), (this.fore + this.back),0];
            // const velocity = [0, (this.fore + this.back),0];
            this.say("avatar", {velocity, yaw:this.yaw},100);
            this.updateCamera()
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
