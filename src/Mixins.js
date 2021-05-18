import { Constants } from "@croquet/croquet";
import { PM_Dynamic, GetPawn } from "./Pawn";
import { v3_zero, q_identity, v3_unit, m4_scalingRotationTranslation, m4_translation, m4_rotationX, m4_multiply, v3_lerp, v3_equals,
    q_slerp, q_equals, v3_isZero, q_isZero, q_normalize, q_multiply, v3_add, v3_scale, m4_rotationQ, v3_transform, q_euler, TAU, clampRad, q2_axisAngle } from  "./Vector";

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

    init(...args) {
        this.listen("_parent", this.onChangeParent);
        super.init(...args);
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.set({parent: null});
        super.destroy();
    }

    get parent() { return this._parent; }

    onChangeParent(d) {
        if (d.o) d.o.removeChild(this);
        if (d.v) d.v.addChild(this);
    }

    addChild(c) { // This should never be called directly, use setParent instead
        if (!this.children) this.children = new Set();
        this.children.add(c);
    }

    removeChild(c) { // This should never be called directly, use setParent instead
        if (this.children) this.children.delete(c);
    }

};
RegisterMixin(AM_Tree);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Tree = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("_parent", this.onChangeParent);

        if (this.actor.parent) {
            const parent = GetPawn(this.actor.parent.id);
            parent.addChild(this.actor.id);
        }
    }

    link() {
        super.link();
        if (this.actor.children) this.actor.children.forEach(child => this.addChild(child.id));
    }

    onChangeParent(d) {
        if (d.o) {
            GetPawn(d.o.id).removeChild(this.actor.id);
        }
        if (d.v) {
            GetPawn(d.v.id).addChild(this.actor.id);
        }
    }

    addChild(id) {
        const child = GetPawn(id);
        if (!child) return;
        if (!this.children) this.children = new Set();
        this.children.add(child);
        child.parent = this;
    }

    removeChild(id) {
        const child = GetPawn(id);
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
        super.init(pawn, options);
        this.listen("_scale", this.localChanged);
        this.listen("_rotation", this.localChanged);
        this.listen("_translation", this.localChanged);
    }

    get translation() { return this._translation || v3_zero() };
    get rotation() { return this._rotation || q_identity() };
    get scale() { return this._scale || v3_unit() };

    addChild(child) {
        super.addChild(child);
        if (child) child.globalChanged();
    }

    removeChild(child) {
        super.removeChild(child);
        if (child) child.globalChanged();
    }

    localChanged() {
        this.$local = null;
        this.say("localChanged");
        this.globalChanged();
    }

    globalChanged() {
        this.$global = null;
        this.say("globalChanged");
        if (this.children) this.children.forEach(child => child.globalChanged());
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

};
RegisterMixin(AM_Spatial);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Spatial = superclass => class extends PM_Tree(superclass) {

constructor(...args) {
    super(...args);
    this.listen("localChanged", this.localChanged);
    this.listen("globalChanged", this.globalChanged);
}

localChanged() {}
globalChanged() { this.refresh(); }

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
        this._translation = v;
        this.say("moveTo", v);
        this.localChanged();
    }

    rotateTo(q) {
        this._rotation = q;
        this.say("rotateTo", q);
        this.localChanged();
    }

    scaleTo(v) {
        this._scale = v;
        this.say("scaleTo", v);
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
        this.needRefresh = true;

        this.setTug(0.2);

        this.scaleEpsilon = 0.0001;
        this.rotationEpsilon = 0.000001;
        this.translationEpsilon = 0.0001;

        this.listenOnce("_scale", d => {this._scale = d.v; this.localChanged();});
        this.listenOnce("_rotation", d => {this._rotation = d.v; this.localChanged();});
        this.listenOnce("_translation", d => {this._translation = d.v; this.localChanged();});

        this.listenOnce("moveTo", () => this.isMoving = true);
        this.listenOnce("rotateTo", () => this.isRotating = true);
        this.listenOnce("scaleTo", () => this.isScaling = true);
    }

    addChild(id) {
        super.addChild(id);
        const child = GetPawn(id);
        if (child) child.refreshTug();
    }

    removeChild(id) {
        super.removeChild(id);
        const child = GetPawn(id);
        if (child) child.refreshTug();
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
        if (this.parent && this.parent.global) {
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
        if (this.children) this.children.forEach(child => child.update(time, delta));
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
        // this.velocity = v3_zero();
        // this.spin = q_identity();
        this.listen("avatar_moveTo", this.onMoveTo);
        this.listen("avatar_rotateTo", this.onRotateTo);
        this.listen("avatar_setVelocity", this.onSetVelocity);
        this.listen("avatar_setSpin", this.onSetSpin);
        this.future(0).tick(0);
    }

    get spin() { return this._spin || q_identity() };
    get velocity() { return this._velocity || v3_unit() };

    onMoveTo(v) {
        this.moveTo(v);
    }

    onRotateTo(q) {
        this.rotateTo(q);
    }

    onSetVelocity(v) { // Faster version that doesn't use generic set syntax
        const o = this.velocity;
        this._velocity = v;
        this.say("_velocity", {o: o, v: v});
        this.isMoving = !v3_isZero(this.velocity);
    }

    // onSetVelocity(v) {
    //     this.set({velocity: v});
    //     // this.velocity = v;
    //     this.isMoving = !v3_isZero(this.velocity);
    // }

    onSetSpin(q) { // Faster version that doesn't use generic set syntax
        const o = this.spin;
        this._spin = q;
        this.say("_spin", {o: o, v: q});
        this.isRotating = !q_isZero(this.spin);
    }

    // onSetSpin(q) {
    //     this.set({spin: q});
    //     // this.spin = q;
    //     this.isRotating = !q_isZero(this.spin);
    // }

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
            this.localChanged();
        }
        if (this.isMoving)  {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this._translation = v3_add(this._translation, move);
            this.localChanged();
        }
        super.update(time, delta);

        // If a throttled move sequence ends, send the final cached value

        if (this.lastMoveCache && this.lastFrameTime > this.lastMoveTime + this.moveThrottle) this.moveTo(this.lastMoveCache);
        if (this.lastRotateCache && this.lastFrameTime > this.lastRotateTime + this.rotateThrottle) this.rotateTo(this.lastRotateCache);

    }

};

//------------------------------------------------------------------------------------------
//-- MouselookAvatar -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// MouselookAvatar is an extension of the normal avatar with a look direction that can be driven
// by mouse or other continous xy inputs. The avatar internally stores pitch and yaw information
// that can be used for animation if necessary. Both pitch and yaw are smoothed in the pawn.

//-- Actor ---------------------------------------------------------------------------------

export const AM_MouselookAvatar = superclass => class extends AM_Avatar(superclass) {

    init(pawn, options) {
        // options = options || {};
        // this.lookPitch = options.lookPitch || 0;
        // this.lookYaw = options.lookYaw || 0;
        super.init(pawn, options);

        this.listen("avatar_lookTo", this.onLookTo);
    }

    get lookPitch() { return this._lookPitch || 0 };
    get lookYaw() { return this._lookYaw || 0 };

    onLookTo(e) {
        this.set({lookPitch: e[0], lookYaw: e[1]});
        // this.lookPitch = e[0];
        // this.lookYaw = e[1];
        this.rotateTo(q_euler(0, this.lookYaw, 0));
    }

}
RegisterMixin(AM_MouselookAvatar);

//-- Pawn ---------------------------------------------------------------------------------

export const PM_MouselookAvatar = superclass => class extends PM_Avatar(superclass) {

    constructor(...args) {
        super(...args);

        this._lookPitch = this.actor.lookPitch;
        this._lookYaw = this.actor.lookYaw;

        this.lookThrottle = 15;  // MS between throttled lookTo events
        this.lastlookTime = this.lastFrameTime;

        this.lookOffset = [0,1,0]; // Vector displacing the camera from the avatar origin.
    }

    get lookPitch() { return this._lookPitch}
    get lookYaw() { return this._lookYaw}

    lookTo(pitch, yaw) {
        this.setLookAngles(pitch, yaw);
        this.lastLookTime = this.lastFrameTime;
        this.lastLookCache = null;
        this.say("avatar_lookTo", [pitch, yaw]);
    }

    throttledLookTo(pitch, yaw) {
        pitch = Math.min(Math.PI/2, Math.max(-Math.PI/2, pitch));
        yaw = clampRad(yaw);
        if (this.lastFrameTime < this.lastLookTime + this.lookThrottle) {
            this.setLookAngles(pitch, yaw);
            this.lastLookCache = {pitch, yaw};
        } else {
            this.lookTo(pitch,yaw);
        }
    }

    setLookAngles(pitch, yaw) {
        this._lookPitch = pitch;
        this._lookYaw = yaw;
        this._rotation = q_euler(0, yaw, 0);
    }

    get lookGlobal() {
        const pitchRotation = q2_axisAngle([1,0,0], this.lookPitch);
        const yawRotation = q2_axisAngle([0,1,0], this.lookYaw);

        const modelLocal =  m4_scalingRotationTranslation(this.scale, yawRotation, this.translation)
        let modelGlobal = modelLocal;
        if (this.parent) modelGlobal = m4_multiply(modelLocal, this.parent.global);


        const m0 = m4_translation(this.lookOffset);
        const m1 = m4_rotationQ(pitchRotation);
        const m2 = m4_multiply(m1, m0);
        return m4_multiply(m2, modelGlobal);
    }

    // get lookGlobal() {
    //     const m0 = m4_translation(this.lookOffset);
    //     const m1 = m4_rotationX(this.lookPitch);
    //     const m2 = m4_multiply(m1, m0);
    //     return m4_multiply(m2, this.global);
    // }

    // const yawMatrix = m4_rotationY(this.lookyaw);
    // const pitchRotation = m4_rotationX(this.lookPitch);
    // const m0 = m4_translation(this.lookOffset);

    // const m2 = m4_multiply(m1, m0);
    // return m4_multiply(m2, this.global);

    // interpolateRotation(tug) {
    //     super.interpolateRotation(tug);

    //     let dPitch = this.actor.lookPitch - this._lookPitch;
    //     if (dPitch < -Math.PI) dPitch += TAU;
    //     if (dPitch > Math.PI) dPitch -= TAU;

    //     let dYaw = this.actor.lookYaw - this._lookYaw;
    //     if (dYaw < -Math.PI) dYaw += TAU;
    //     if (dYaw > Math.PI) dYaw -= TAU;

    //     this._lookPitch = this._lookPitch + dPitch * tug;
    //     this._lookYaw = clampRad(this._lookYaw + dYaw * tug);
    // }

    update(time, delta) {
        super.update(time, delta);

        if (this.lastLookCache && this.lastFrameTime > this.lastLookTime + this.lookThrottle) {
            this.lookTo(this.lastLookCache.pitch, this.lastLookCache.yaw);
        }

    }

}


