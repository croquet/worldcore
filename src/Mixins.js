// import { addClassHash } from "@croquet/util";
import { Constants } from "@croquet/croquet";
import { GetNamedView } from "./NamedView";
import { PM_Dynamic } from "./Pawn";
// import { GetViewDelta } from "./ViewRoot";
import { v3_zero, q_identity, v3_unit, m4_scalingRotationTranslation, m4_multiply, v3_lerp, v3_equals,
    q_slerp, q_equals, v3_isZero, q_isZero, q_normalize, q_multiply, v3_add, v3_scale, m4_rotationQ, m4_fastGrounded, v3_transform, q_euler, TAU, toDeg, clampRad } from  "./Vector";

// Mixin
//
// This contains support for mixins that can be added to Views and Models. You need to
// define View and Model mixins slightly differently, but they otherwise use the same
// syntax.
//
// This approach is based on:
//
// https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
// https://github.com/justinfagnani/mixwith.js


// -- View Mixins --
//
// Mixins are defined as functions that transform a class into an extended version
// of itself. The "mix" and "with" operators are symantic suger to make the construction
// of the composite class look nice.
//
// Since you don't know what class a mixin will be added to, you should generally set them
// up so they don't require arguments to their constructors and merely pass any parameter
// they receive straight through.


// -- Example --
//
// class Alpha {
//     constructor() {
//        }
// }
//
// const Beta = superclass => class extends superclass {
//     constructor(...args) {
//         super(...args);
//        }
// };
//
// const Gamma = superclass => class extends superclass {
//     constructor(...args) {
//         super(...args);
//        }
// };
//
// class Delta extends mix(Alpha).with(Beta, Gamma) {
//     constructor() {
//         super();
//     }
// }


// -- Model Mixins --
//
// Model mixins work just like View Mixins, but you need to define an init function instead
// of a constructor. Also you need to call RegisterMixin after you define them so they get
// added to the hash of the model code.


// -- Example --
//
// const ModelBeta = superclass => class extends superclass {
//     init(...args) {
//         super.init(...args);
//     }
// };
// RegisterMixin(ModelBeta);


//-- Inheritance --
//
// Mixins can "inherit" from other mixins by including the parent function in the child's extension
// definition:
//
// const ChildMixin = superclass => class extends ParentMixin(superclass) {};

//------------------------------------------------------------------------------------------
//-- Mixin ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.WC_MIXIN_REGISTRY = [];
Constants.WC_MIXIN_USAGE = [];

export const mix = superclass => new MixinFactory(superclass);
export const RegisterMixin = mixin => Constants.WC_MIXIN_REGISTRY.push(mixin);

class MixinFactory  {
    constructor(superclass) {
        this.superclass = superclass;
    }

    with(...mixins) {
        Constants.WC_MIXIN_USAGE.push(mixins);
        return mixins.reduce((c, mixin) => mixin(c), this.superclass);
    }
}

//------------------------------------------------------------------------------------------
//-- Tree ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Tree actors can be put in a hierarchy with parents and children. The tree pawns maintain
// their own hierarchy that mirrors the actor hierarchy.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Tree = superclass => class extends superclass {

    destroy() {
        if (this.parent) this.parent.removeChild(this);
        if (this.children) this.children.forEach(child => child.destroy());
        super.destroy();
    }

    addChild(child) {
        if (child.parent) child.parent.removeChild(child);
        if (!this.children) this.children = new Set();
        this.children.add(child);
        child.parent = this;
        this.say("tree_addChild", child.id);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
        child.parent = null;
        this.say("tree_removeChild", child.id);
    }

    // Allow derived classes to perform addition operations when added or removed from a parent.

    onAddChild(child) {}
    onRemoveChild(child) {}
};
RegisterMixin(AM_Tree);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Tree = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("tree_addChild", this.onAddChild);
        this.listen("tree_removeChild", this.onRemoveChild);
    }

    link() {
        super.link();
        if (this.actor.children) this.actor.children.forEach(child => this.onAddChild(child.id));
    }

    onAddChild(id) {
        const child = GetNamedView("PawnManager").get(id);
        if (!child) return;
        if (!this.children) this.children = new Set();
        this.children.add(child);
        child.parent = this;
    }

    onRemoveChild(id) {
        const child = GetNamedView("PawnManager").get(id);
        if (!child) return;
        if (this.children) this.children.delete(child);
        child.parent = null;
    }
};

//------------------------------------------------------------------------------------------
//-- Spatial -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Spatial actors have a translation, rotation and scale in 3D space. They inherit from Tree
// so they also maintain a hierachy of transforms.
//
// They don't have any view-side smoothing, so the pawn will change its transform to exactly
// match the transform of the actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Spatial = superclass => class extends AM_Tree(superclass) {
    init(pawn, options) {
        options = options || {};
        this.translation = options.translation || v3_zero();
        this.rotation = options.rotation || q_identity();
        this.scale = options.scale || v3_unit();
        super.init(pawn, options);
    }

    onAddChild(child) {
        super.onAddChild(child);
        child.globalChanged();
    }

    onRemoveChild(child) {
        super.onRemoveChild(child);
        child.globalChanged();
    }

    localChanged() {
        this.$local = null;
        this.say("spatial_localChanged");
        this.globalChanged();
    }

    globalChanged() {
        this.$global = null;
        this.say("spatial_globalChanged");
        if (this.children) this.children.forEach(child => child.globalChanged());
    }

    setScale(v) {
        this.scale = v;
        this.say("spatial_setScale", v);
        this.localChanged();
    }

    setRotation(q) {
        this.rotation = q;
        this.say("spatial_setRotation", q);
        this.localChanged();
    }

    // setRotationEuler(e) { // x = pitch, y = yaw, z = roll
    //     this.setRotation(q_euler(...e));
    // };

    setTranslation(v) {
        this.translation = v;
        this.say("spatial_setTranslation", v);
        this.localChanged();
    }

    get local() {
        if (!this.$local) this.$local = m4_scalingRotationTranslation(this.scale, this.rotation, this.translation);
        return this.$local;
    }

    get global() {
        if (this.$global) return this.$global;
        if (this.parent) {
            this.$global = m4_multiply(this.local, this.parent.global);
        } else {
            this.$global = this.local;
        }
        return this.$global;
    }

    // Allows objects to have a look direction that's different from their facing.

    // get lookGlobal() { return this.global; }

};
RegisterMixin(AM_Spatial);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Spatial = superclass => class extends PM_Tree(superclass) {

constructor(...args) {
    super(...args);
    this.listenOnce("spatial_localChanged", () => this.localChanged());
    this.listenOnce("spatial_globalChanged", () => this.globalChanged());
}

// LocalChanged and globalChanged can be patched by children that inherit from PM_Spatial.
// They are called when the actor invalidates its cached local/global transform.

localChanged() {}

globalChanged() {
    this.refresh();
}

get scale() { return this.actor.scale; }
get translation() { return this.actor.translation; }
get rotation() { return this.actor.rotation; }
get local() { return this.actor.local; }
get global() { return this.actor.global; }
get lookGlobal() { return this.global; } // Allows objects to have an offset camera position

};

//------------------------------------------------------------------------------------------
//-- Smoothed ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Smoothed actors generate interpolation information when they get movement commands. Their
// pawns use this to reposition themselves on every frame update.
//
// Setting translation/rotation/scale will pop the pawn to the new value. If you want the transition
// to be interpolated, use moveTo, rotateTo, or scaleTo instead.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Smoothed = superclass => class extends AM_Spatial(superclass) {

    moveTo(v) {
        this.translation = v;
        this.say("smoothed_moveTo", v);
        this.localChanged();
    }

    rotateTo(q) {
        this.rotation = q;
        this.say("smoothed_rotateTo", q);
        this.localChanged();
    }

    scaleTo(v) {
        this.scale = v;
        this.say("smoothed_scaleTo", v);
        this.localChanged();
    }

};
RegisterMixin(AM_Smoothed);

//-- Pawn ----------------------------------------------------------------------------------

// Tug is a value between 0 and 1 that controls the weighting between the two
// transforms. The closer tug is to 1, the more closely the pawn will track the actor,
// but the more vulnerable the pawn is to latency/stutters in the simulation.

// When the difference between actor and pawn scale/rotation/translation drops below an epsilon,
// interpolation is paused

const DynamicSpatial = superclass => PM_Dynamic(PM_Spatial(superclass)); // Merge dynamic and spatial base mixins

export const PM_Smoothed = superclass => class extends DynamicSpatial(superclass) {
    constructor(...args) {
        super(...args);

        this._scale = this.actor.scale;
        this._rotation = this.actor.rotation;
        this._translation = this.actor.translation;

        this.setTug(0.2);

        this.scaleEpsilon = 0.0001;
        this.rotationEpsilon = 0.000001;
        this.translationEpsilon = 0.0001;

        this.listenOnce("spatial_setScale", v => this._scale = v);
        this.listenOnce("spatial_setRotation", q => this._rotation = q);
        this.listenOnce("spatial_setTranslation", v => this._translation = v);

        this.listenOnce("smoothed_moveTo", () => this.isMoving = true);
        this.listenOnce("smoothed_rotateTo", () => this.isRotating = true);
        this.listenOnce("smoothed_scaleTo", () => this.isScaling = true);
    }

    onAddChild(id) {
        super.onAddChild(id);
        const child = GetNamedView("PawnManager").get(id);
        child.refreshTug();
    }

    onRemoveChild(id) {
        super.onRemoveChild(id);
        const child = GetNamedView("PawnManager").get(id);
        child.refreshTug();
    }

    localChanged() {
        this._local = null;
        this.globalChanged();
    }

    globalChanged() {
        this._global = null;
        this.needRefresh = true;
        if (this.children) this.children.forEach(child => child.globalChanged());
    }

    setTug(t) {
        this.defaultTug = t;
        this.refreshTug();
    }

    refreshTug() {
        if (this.parent && this.parent.tug) {
            this._tug = this.parent.tug;
        } else {
            this._tug = this.defaultTug;
        }
    }

    get scale() { return this._scale; }
    get translation() { return this._translation; }
    get rotation() { return this._rotation; }
    get tug() { return this._tug; }

    get local() {
        if (!this._local) this._local = m4_scalingRotationTranslation(this._scale, this._rotation, this._translation);
        return this._local;
    }

    get global() {
        if (this._global) return this._global;
        if (this.parent) {
            this._global = m4_multiply(this.local, this.parent.global);
        } else {
            this._global = this.local;
        }
        return this._global;
    }

    update(time, delta) {
        super.update(time, delta);
        let tug = this.tug;
        if (this.delta) tug = Math.min(1, tug * this.delta / 15);
        const changed = (this.isMoving || this.isRotating || this.isScaling);
        if (this.isScaling) this.interpolateScale(tug);
        if (this.isRotating) this.interpolateRotation(tug);
        if (this.isMoving) this.interpolateTranslation(tug);
        if (changed) this.localChanged();
        if (this.needRefresh) this.refresh();
        this.needRefresh = false;
    }

    interpolateScale(tug) {
        this._scale = v3_lerp(this._scale, this.actor.scale, tug);
        this.isScaling = !v3_equals(this._scale, this.actor.scale, this.scaleEpsilon);
    }

    interpolateRotation(tug) {
        this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);
        this.isRotating = !q_equals(this._rotation, this.actor.rotation, this.rotationEpsilon);
    }

    interpolateTranslation(tug) {
        this._translation = v3_lerp(this._translation, this.actor.translation, tug);
        this.isMoving = !v3_equals(this._translation, this.actor.translation, this.translationEpsilon);
    }

};


//------------------------------------------------------------------------------------------
//-- Avatar --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Avatar actors maintain a primary view-side scale/rotation/translation that you can drive directly
// from player inputs so the avatar responds quickly to player input. On every frame this
// transform is averaged with the official model-side values.
//
// If you're using player-controlled avatars, you'll probably want to set:
//      * Session tps to >60 with no cheat beats
//      * AM_Avatar tick frequecy to <16
//
// This will create the smoothest/fastest response.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Avatar = superclass => class extends AM_Smoothed(superclass) {

    init(...args) {
        super.init(...args);
        this.avatar_tickStep = 15;
        this.velocity = v3_zero();
        this.spin = q_identity();
        this.listen("avatar_moveTo", this.onMoveTo);
        this.listen("avatar_rotateTo", this.onRotateTo);
        this.listen("avatar_setVelocity", this.onSetVelocity);
        this.listen("avatar_setSpin", this.onSetSpin);
        this.future(0).tick(0);
    }

    onMoveTo(v) {
        this.moveTo(v);
    }

    onRotateTo(q) {
        this.rotateTo(q);
    }

    onSetVelocity(v) {
        this.velocity = v;
        this.isMoving = !v3_isZero(this.velocity);
    }

    onSetSpin(q) {
        this.spin = q;
        this.isRotating = !q_isZero(this.spin);
    }

    tick(delta) {
        if (this.isRotating) this.rotateTo(q_normalize(q_slerp(this.rotation, q_multiply(this.rotation, this.spin), delta)));
        if (this.isMoving) {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this.moveTo(v3_add(this.translation, move));
        }
        if (!this.doomed) this.future(this.avatar_tickStep).tick(this.avatar_tickStep);
    }

};
RegisterMixin(AM_Avatar);

//-- Pawn ----------------------------------------------------------------------------------

// Tug is set even lower so that heartbeat stutters on the actor side will not affect pawn
// motion. However this means the pawn will take longer to "settle" into its final position.
//
// It's possible to have different tug values depending on whether the avatar is controlled
// locally or not.

export const PM_Avatar = superclass => class extends PM_Smoothed(superclass) {
    constructor(...args) {
        super(...args);
        this.setTug(0.05);    // Bias the tug even more toward the pawn's immediate position.

        this.moveThrottle = 15;    // MS between throttled moveTo events
        this.lastMoveTime = this.lastFrameTime;

        this.rotateThrottle = 50;  // MS between throttled rotateTo events
        this.lastRotateTime = this.lastFrameTime;

        this.velocity = v3_zero();
        this.spin = q_identity();
    }

    // Instantly sends a move event to the reflector. If you're calling it repeatly, maybe use throttledMoveTo instead.

    moveTo(v) {
        this._translation = v;
        this.lastMoveTime = this.lastFrameTime;
        this.lastMoveCache = null;
        this.say("avatar_moveTo", v);
    }

    // No matter how often throttledMoveTo is called, it will only send a message to the reflector once per throttle interval.

    throttledMoveTo(v) {
        if (this.lastFrameTime < this.lastMoveTime + this.moveThrottle) {
            this._translation = v;
            this.lastMoveCache = v;
        } else {
            this.lastMoveTime = this.lastFrameTime;
            this.lastMoveCache = null;
            this.say("avatar_moveTo", v);
        }
    }

    // Instantly sends a rotate event to the reflector. If you're calling it repeatly, maybe use throttledRotateTo instead.

    rotateTo(q) {
        this._rotation = q;
        this.lastRotateTime = this.lastFrameTime;
        this.lastRotateCache = null;
        this.say("avatar_rotateTo", q);
    }

    // No matter how often throttleRotateTo is called, it will only send a message to the reflector once per throttle interval.

    throttledRotateTo(q) {
        if (this.lastFrameTime < this.lastRotateTime + this.rotateThrottle) {
            this._rotation = q;
            this.lastRotateCache = q;
        } else {
            this.rotateTo(q);
        }
    }

    setVelocity(v) {
        this.velocity = v;
        this.isMoving = this.isMoving || !v3_isZero(this.velocity);
        this.say("avatar_setVelocity", this.velocity);
    }

    setSpin(q) {
        this.spin = q;
        this.isRotating = this.isRotating || !q_isZero(this.spin);
        this.say("avatar_setSpin", this.spin);
    }

    update(time, delta) {

        if (this.isRotating) {
            this._rotation = q_normalize(q_slerp(this._rotation, q_multiply(this._rotation, this.spin), delta));
        }
        if (this.isMoving)  {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this._translation = v3_add(this._translation, move);
        }
        super.update(time, delta);

        // If a throttled move sequence ends, send the final cached value

        if (this.lastMoveCache && this.lastFrameTime > this.lastMoveTime + this.moveThrottle) this.moveTo(this.lastMoveCache);
        if (this.lastRotateCache && this.lastFrameTime > this.lastRotateTime + this.rotateThrottle) this.rotateTo(this.lastRotateCache);

    }

};


//------------------------------------------------------------------------------------------
//-- SpatialEuler --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const AM_SpatialEulerExtension = superclass => class extends superclass {

    init(pawn, options) {
        options = options || {};
        this.setEulerAngles(options);
        this.rotation = q_euler(this.pitch, this.yaw, this.roll);
        super.init(pawn, options);
    }

    setEulerRotation(e) {
        this.setAngles(e);
        this.rotation = q_euler(this.pitch, this.yaw, this.roll);
        this.say("spatialEuler_setRotation", e);
        this.localChanged();
    };

    setEulerAngles(e) {
        this.pitch = e.pitch || 0;
        this.yaw = e.yaw || 0;
        this.roll = e.roll || 0;
        this.clampEulerAngles();
    }

    clampEulerAngles() {
        this.pitch = clampRad(this.pitch);
        this.yaw = clampRad(this.yaw);
        this.roll = clampRad(this.roll);
    }

}

export const AM_SpatialEuler = superclass => AM_SpatialEulerExtension(AM_Spatial(superclass));
RegisterMixin(AM_SpatialEuler);


//-- Pawn ----------------------------------------------------------------------------------

const PM_SpatialEulerExtension = superclass => class extends superclass {

    get pitch() { return this.actor.pitch};
    get yaw() { return this.actor.yaw};
    get roll() { return this.actor.roll};

}

export const PM_SpatialEuler = superclass => PM_SpatialEulerExtension(PM_Spatial(superclass));

//------------------------------------------------------------------------------------------
//-- SmoothedEuler -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const AM_SmoothedEulerExtension = superclass => class extends AM_SpatialEulerExtension(superclass) {

    rotateToEuler(e) {
        this.setEulerAngles(e);
        this.rotation = q_euler(this.pitch, this.yaw, this.roll);
        this.say("smoothedEuler_rotateTo", e);
        this.localChanged();
    }

}

export const AM_SmoothedEuler = superclass => AM_SmoothedEulerExtension(AM_Smoothed(superclass));
RegisterMixin(AM_SmoothedEuler);

//-- Pawn ----------------------------------------------------------------------------------

const PM_SmoothedEulerExtension = superclass => class extends PM_SpatialEulerExtension(superclass) {

    constructor(...args) {
        super(...args);
        this._pitch = this.actor.pitch;
        this._yaw = this.actor.yaw;
        this._roll = this.actor.roll;
        this.clampEulerAngles();
        this._rotation = q_euler(this._pitch, this._yaw, this._roll);
        this.listenOnce("spatialEuler_setRotation", this.setEulerRotation);
        this.listenOnce("smoothedEuler_rotateTo", () => this.isRotating = true);
    }

    setEulerRotation(e) {
        this._pitch = e.pitch || 0;
        this._yaw = e.yaw || 0;
        this._roll = e.roll || 0;
        this.clampEulerAngles();
        this._rotation = q_euler(this._pitch, this._yaw, this._roll);
    }

    interpolateRotation(tug) {

        let dPitch = this.actor.pitch - this._pitch;
        if (dPitch < -Math.PI) dPitch += TAU;
        if (dPitch > Math.PI) dPitch -= TAU;

        let dYaw = this.actor.yaw - this._yaw;
        if (dYaw < -Math.PI) dYaw += TAU;
        if (dYaw > Math.PI) dYaw -= TAU;

        let dRoll = this.actor.roll - this._roll;
        if (dRoll < -Math.PI) dRoll += TAU;
        if (dRoll > Math.PI) dRoll -= TAU;

        this._pitch = this._pitch + dPitch * tug;
        this._yaw = this._yaw + dYaw * tug;
        this._roll = this._roll + dRoll * tug;

        this.clampEulerAngles();

        this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);

        this.isRotating = !q_equals(this._rotation, this.actor.rotation, this.rotationEpsilon) ||
            (Math.abs(dPitch) > this.rotationEpsilon) ||
            (Math.abs(dYaw) > this.rotationEpsilon) ||
            (Math.abs(dRoll) > this.rotationEpsilon);

    }

    clampEulerAngles() {
        this._pitch = clampRad(this._pitch);
        this._yaw = clampRad(this._yaw);
        this._roll = clampRad(this._roll);
    }
}

export const PM_SmoothedEuler = superclass => PM_SmoothedEulerExtension(PM_Smoothed(superclass));


//------------------------------------------------------------------------------------------
//-- MouselookAvatar -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//-- Actor ---------------------------------------------------------------------------------

export const AM_MouselookAvatar = superclass => class extends AM_SmoothedEuler(superclass) {

    init(...args) {
        super.init(...args);
        this.avatar_tickStep = 15;
        this.velocity = v3_zero();
        this.listen("avatar_rotateTo", this.onRotateTo);
        this.listen("avatar_setVelocity", this.onSetVelocity);
        this.future(0).tick(0);
    }

    onRotateTo(e) {
        this.rotateToEuler({yaw: e[1]});
    }

    onSetVelocity(v) {
        this.velocity = v;
        this.isMoving = !v3_isZero(this.velocity);
    }

    tick(delta) {
        if (this.isMoving) {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this.moveTo(v3_add(this.translation, move));
        }
        if (!this.doomed) this.future(this.avatar_tickStep).tick(this.avatar_tickStep);
    }
}
RegisterMixin(AM_MouselookAvatar);

//-- Pawn ---------------------------------------------------------------------------------

const PM_MouselookAvatar = superclass => class extends PM_SmoothedEuler(superclass) {

    constructor(...args) {
        super(...args);
        this.setTug(0.05);    // Bias the tug even more toward the pawn's immediate position.

        this.rotateThrottle = 50;  // MS between throttled rotateTo events
        this.lastRotateTime = this.lastFrameTime;

        this.velocity = v3_zero();
    }

    rotateTo(e) {
        this.setEulerRotation(e);
        this.lastRotateTime = this.lastFrameTime;
        this.lastRotateCache = null;
        this.say("avatar_rotateTo", [e.yaw, e.pitch]);
    }

    throttledRotateTo(e) {
        if (this.lastFrameTime < this.lastRotateTime + this.rotateThrottle) {
            this.setEulerRotation(e);
            this.lastRotateCache = e;
        } else {
            this.rotateTo(e);
        }
    }

    setVelocity(v) {
        this.velocity = v;
        this.isMoving = this.isMoving || !v3_isZero(this.velocity);
        this.say("avatar_setVelocity", this.velocity);
    }

    update(time, delta) {

        if (this.isMoving)  {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this._translation = v3_add(this._translation, move);
        }
        super.update(time, delta);

        // If a throttled move sequence ends, send the final cached value

        if (this.lastRotateCache && this.lastFrameTime > this.lastRotateTime + this.rotateThrottle) this.rotateTo(this.lastRotateCache);

    }

}




















// MouseLook actors maintain a primary view-side scale/rotation/translation that you can drive directly
// from player inputs so the mouselook avatar responds quickly to player input. On every frame this
// transform is averaged with the official model-side values.
//
// If you're using player-controlled avatars, you'll probably want to set:
//      * Session tps to >60 with no cheat beats
//      * AM_MouseLook tick frequecy to <16
//
// This will create the smoothest/fastest response.
//

//-- Actor ---------------------------------------------------------------------------------

// export const AM_MouseLook = superclass => class extends AM_Smoothed(superclass) {

//     init(...args) {
//         super.init(...args);
//         this.mouseLook_tickStep = 15;
//         this.speed = 0;
//         this.strafeSpeed = 0;
//         this.multiplySpeed = 1;
//         this.spin = q_identity();
//         this.grounded = true; // this forces user onto x/z plane for motion
//         this.listen("mouseLook_moveTo", this.onMoveTo);
//         this.listen("mouseLook_rotateTo", this.onRotateTo);
//         this.listen("mouseLook_setSpeed", this.onSetSpeed);
//         this.listen("mouseLook_setStrafeSpeed", this.onSetStrafeSpeed);
//         this.listen("mouseLook_setMultiplySpeed", this.onSetMultiplySpeed);
//         this.listen("mouseLook_setSpin", this.onSetSpin);
//         this.listen("mouseLook_showState", this.onShowState);

//         this.tickCounter = 0;
//         this.movingCounter = 0;
//         this.checkSum = 0;
//         this.future(0).tick(0);
//     }

//     onMoveTo(v) {
//         this.moveTo(v);
//     }

//     onRotateTo(q) {
//         this.rotateTo(q);
//     }

//     onSetSpeed(s) {
//         this.speed = s;
//         this.isMoving = s !== 0 || this.strafeSpeed !==0;
//     }

//     onSetStrafeSpeed(ss) {
//         this.strafeSpeed = ss;
//         this.isMoving = ss !== 0 || this.speed !== 0;
//     }

//     onSetMultiplySpeed(ms) {
//         this.multiplySpeed = ms;
//     }

//     onSetSpin(q) {
//         this.spin = q;
//         this.isRotating = !q_isZero(this.spin);
//     }

//     //replicated show state message to ensure teatime is working properly
//     onShowState(){
//         console.log("--AM_MouseLook State--");
//         console.log("AM_MouseLook: ", this);
//         console.log("translation: ", this.translation);
//         console.log("rotation: ", this.rotation);
//         console.log("checkSum: ", this.checkSum);
//     }

//     setGrounded(bool){ this.grounded = bool; }

//     tick(delta) {
//         if (this.isRotating) this.rotateTo(q_normalize(q_slerp(this.rotation, q_multiply(this.rotation, this.spin), delta)));
//         if (this.isMoving) {
//             let m4 = m4_rotationQ(this.rotation);
//             if(this.grounded) m4 = m4_fastGrounded(m4);
//             let lastLoc = this.translation;
//             let loc = this.translation;

//             if(this.speed)loc = v3_add(loc, v3_scale( [ m4[8], m4[9], m4[10]], delta*this.speed*this.multiplySpeed) );
//             if(this.strafeSpeed)loc = v3_add(loc, v3_scale( [ m4[0], m4[1], m4[2]], delta*this.strafeSpeed*this.multiplySpeed) );
//             // this.moveTo(this.verify(loc, lastLoc));
//         }
//         if(!this.doomed)this.future(this.mouseLook_tickStep).tick(this.mouseLook_tickStep);
//     }

//     // Enables the subclass to ensure that this change is valid
//     // Example - collision with a wall will change the result
//     // verify(loc, lastLoc){
//     //     return loc;
//     // }

// };

// RegisterMixin(AM_MouseLook);

// //-- Pawn ----------------------------------------------------------------------------------

// // Tug is set even lower so that heatbeat stutters on the actor side will not affect pawn
// // motion. However this means the pawn will take longer to "settle" into its final position.
// //
// // It's possible to have different tug values depending on whether the avatar is controlled
// // locally or not.

// export const PM_MouseLook = superclass => class extends PM_Smoothed(superclass) {
//     constructor(...args) {
//         super(...args);
//         this.tug = 0.05;    // Bias the tug even more toward the pawn's immediate position.
//         this.speed = 0;
//         this.strafeSpeed = 0;
//         this.multiplySpeed = 1;
//         this.spin = q_identity();
//         this.grounded = true;
//     }

//     moveTo(v) {
//         this._translation = v;
//         this.say("mouseLook_moveTo", v);
//     }

//     rotateTo(q) {
//         this._rotation = q;
//         this.say("mouseLook_rotateTo", q);
//     }

//     setSpeed(s) {
//         this.speed = s;
//         this.isMoving = this.isMoving || s!=0;
//         this.say("mouseLook_setSpeed", s);
//     }

//     setStrafeSpeed(ss) {
//         this.strafeSpeed = ss;
//         this.isMoving = this.isMoving || ss!=0;
//         this.say("mouseLook_setStrafeSpeed", ss);
//     }

//     setMultiplySpeed(ms) {
//         this.multiplySpeed = ms;
//         this.say("mouseLook_setMultiplySpeed", ms);
//     }

//     setSpin(q) {
//         this.spin = q;
//         this.isRotating = this.isRotating || !q_isZero(this.spin);
//         this.say("mouseLook_setSpin", this.spin);
//     }

//     showState() {
//         console.log("--PM_MouseLook State--");
//         console.log("PM_MouseLook: ", this);
//         console.log("translation: ", this._translation);
//         console.log("rotation: ", this._rotation);
//         this.say("mouseLook_showState");
//     }

//     update(time) {
//         if (this.isRotating) {
//             this._rotation = q_normalize(q_slerp(this._rotation, q_multiply(this._rotation, this.spin), GetViewDelta()));
//         }
//         if (this.isMoving) {
//             // let lastLoc = this._translation;
//             let m4 = m4_rotationQ(this._rotation);
//             if (this.grounded) m4 = m4_fastGrounded(m4);
//             if (this.speed) this._translation = v3_add(this._translation, v3_scale( [ m4[8], m4[9], m4[10]], GetViewDelta()*this.speed*this.multiplySpeed) );
//             if (this.strafeSpeed) this._translation = v3_add(this._translation, v3_scale( [ m4[0], m4[1], m4[2]], GetViewDelta()*this.strafeSpeed*this.multiplySpeed) );
//             // this._translation = this.verify(this._translation, lastLoc);
//         }
//         super.update(time);
//     }

//     // Enables the subclass to ensure that this change is valid
//     // Example - collision with a wall will change the result
//     // verify(loc, lastLoc) {
//     //     return loc;
//     // }

// };
