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
        if (this.actor.parent) {
            const parent = GetPawn(this.actor.parent.id);
            parent.addChild(this.actor.id);
        }
        this.listen("_parent", this.onChangeParent);
    }

    get parent() {
        if (this.actor.parent && !this._parent) this._parent = GetPawn(this.actor.parent.id);
        return this._parent;
    }

    get children() {
        if (this.actor.children && !this._children) this.actor.children.forEach(child => { this.addChild(child.id); })
        return this._children;
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
        if (!this._children) this._children = new Set();
        this._children.add(child);
        child._parent = this;
    }

    removeChild(id) {
        const child = GetPawn(id);
        if (!child) return;
        if (this._children) this._children.delete(child);
        child._parent = null;
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
    init(...args) {
        this.listen("_scale", this.localChanged);
        this.listen("_rotation", this.localChanged);
        this.listen("_translation", this.localChanged);
        super.init(...args);
    }

    localChanged() {
        this.$local = null;
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

    get translation() { return this._translation || v3_zero() };
    get rotation() { return this._rotation || q_identity() };
    get scale() { return this._scale || v3_unit() };
}
RegisterMixin(AM_Spatial);


//-- Pawn ----------------------------------------------------------------------------------

export const PM_Spatial = superclass => class extends PM_Tree(superclass) {

constructor(...args) {
    super(...args);
    this.listenOnce("globalChanged", this.onGlobalChanged);
}

onGlobalChanged() { this.say("viewGlobalChanged"); }

get scale() { return this.actor.scale; }
get translation() { return this.actor.translation; }
get rotation() { return this.actor.rotation; }
get local() { return this.actor.local; }
get global() { return this.actor.global; }
// get lookGlobal() { return this.global; } // Allows objects to have an offset camera position

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
        this.localChanged();
    }

    rotateTo(q) {
        this._rotation = q;
        this.localChanged();
    }

    scaleTo(v) {
        this._scale = v;
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

const scaleEpsilon = 0.0001;
const rotationEpsilon = 0.000001;
const translationEpsilon = 0.0001;

const DynamicSpatial = superclass => PM_Dynamic(PM_Spatial(superclass)); // Merge dynamic and spatial base mixins

export const PM_Smoothed = superclass => class extends DynamicSpatial(superclass) {

    constructor(...args) {
        super(...args);

        this.tug = 0.2;
        this._scale = this.actor.scale;
        this._rotation = this.actor.rotation;
        this._translation = this.actor.translation;

        this.listenOnce("_scale", this.onSetScale);
        this.listenOnce("_rotation", this.onSetRotation);
        this.listenOnce("_translation", this.onSetTranslation);
    }

    onSetScale(d) { this._scale = d.v; this._local = null; this._global = null; }
    onSetRotation(d) { this._rotation = d.v;  this._local = null; this._global = null; }
    onSetTranslation(d) { this._translation = d.v;  this._local = null; this._global = null; }

    get scale() { return this._scale; }
    get translation() { return this._translation; }
    get rotation() { return this._rotation; }
    set tug(t) {this._tug = t}
    get tug() {
        if (this.parent) return this.parent.tug;
        return this._tug;
    }

    onGlobalChanged() {
        this._global = null;
    }

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
        if (delta) tug = Math.min(1, tug * delta / 15);

        if (!v3_equals(this._scale, this.actor.scale, scaleEpsilon)) {
            this._scale = v3_lerp(this._scale, this.actor.scale, tug);
            this._local = null;
            this._global = null;
        }

        if (!q_equals(this._rotation, this.actor.rotation, rotationEpsilon)) {
            this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);
            this._local = null;
            this._global = null;
        }

        if (!v3_equals(this._translation, this.actor.translation, translationEpsilon)) {
            this._translation = v3_lerp(this._translation, this.actor.translation, tug);
            this._local = null;
            this._global = null;
        }

        if (!this._global) {
            if (this.children) this.children.forEach(child => child._global = null); // If our global changes, so do the globals of our children
            this.say("viewGlobalChanged");
        }

    }

    postUpdate(time, delta) {
        super.postUpdate(time, delta);
        if (this.children) this.children.forEach(child => child.fullUpdate(time, delta));
    }

}



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

    get spin() { return this._spin || q_identity() };
    get velocity() { return this._velocity || v3_unit() };

    init(...args) {
        this.listen("avatarMoveTo", this.moveTo);
        this.listen("avatarRotateTo", this.rotateTo);
        this.listen("avatarSetVelocity", this.onSetVelocity);
        this.listen("avatarSetSpin", this.onSetSpin);
        super.init(...args);
        this.avatar_tickStep = 14;
        this.future(0).tick(0);
    }

    // onMoveTo(v) {
    //     this.moveTo(v);
    // }

    // onRotateTo(q) {
    //     this.rotateTo(q);
    // }

    // onSetVelocity(v) { // Faster version that doesn't use generic set syntax
    //     const o = this.velocity;
    //     this._velocity = v;
    //     this.say("_velocity", {o: o, v: v});
    //     this.isMoving = !v3_isZero(this.velocity);
    // }

    // onSetSpin(q) { // Faster version that doesn't use generic set syntax
    //     const o = this.spin;
    //     this._spin = q;
    //     this.say("_spin", {o: o, v: q});
    //     this.isRotating = !q_isZero(this.spin);
    // }

    onSetVelocity(v) {
        this.set({velocity: v});
        this.isMoving = !v3_isZero(v);
    }

    onSetSpin(q) {
        this.set({spin: q});
        this.isRotating = !q_isZero(q);
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

        this.moveThrottle = 15;    // MS between throttled moveTo events
        this.lastMoveTime = this.time;

        this.rotateThrottle = 50;  // MS between throttled rotateTo events
        this.lastRotateTime = this.time;

        this.velocity = v3_zero();
        this.spin = q_identity();
    }

    // Instantly sends a move event to the reflector. If you're calling it repeatly, maybe use throttledMoveTo instead.

    moveTo(v) {
        this._translation = v;
        this.lastMoveTime = this.time;
        this.lastMoveCache = null;
        this.say("avatarMoveTo", v);
    }

    // No matter how often throttledMoveTo is called, it will only send a message to the reflector once per throttle interval.

    throttledMoveTo(v) {
        if (this.time < this.lastMoveTime + this.moveThrottle) {
            this._translation = v;
            this.lastMoveCache = v;
        } else {
            this.lastMoveTime = this.time;
            this.lastMoveCache = null;
            this.say("avatarMoveTo", v);
        }
    }

    // Instantly sends a rotate event to the reflector. If you're calling it repeatly, maybe use throttledRotateTo instead.

    rotateTo(q) {
        this._rotation = q;
        this.lastRotateTime = this.time;
        this.lastRotateCache = null;
        this.say("avatarRotateTo", q);
    }

    // No matter how often throttleRotateTo is called, it will only send a message to the reflector once per throttle interval.

    throttledRotateTo(q) {
        if (this.time < this.lastRotateTime + this.rotateThrottle) {
            this._rotation = q;
            this.lastRotateCache = q;
        } else {
            this.rotateTo(q);
        }
    }

    setVelocity(v) {
        this.velocity = v;
        this.isMoving = this.isMoving || !v3_isZero(this.velocity);
        this.say("avatarSetVelocity", this.velocity);
    }

    setSpin(q) {
        this.spin = q;
        this.isRotating = this.isRotating || !q_isZero(this.spin);
        this.say("avatarSetSpin", this.spin);
    }

    update(time, delta) {

        if (this.isRotating) {
            this._rotation = q_normalize(q_slerp(this._rotation, q_multiply(this._rotation, this.spin), delta));
            this._local = null;
            this._global = null;
        }
        if (this.isMoving)  {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this._translation = v3_add(this._translation, move);
            this._local = null;
            this._global = null;
        }

        super.update(time, delta);

        // If a throttled move sequence ends, send the final cached value

        if (this.lastMoveCache && this.time > this.lastMoveTime + this.moveThrottle) this.moveTo(this.lastMoveCache);
        if (this.lastRotateCache && this.time > this.lastRotateTime + this.rotateThrottle) this.rotateTo(this.lastRotateCache);

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

    init(...args) {
        this.listen("avatar_lookTo", this.onLookTo);
        super.init(...args);
    }

    get lookPitch() { return this._lookPitch || 0 };
    get lookYaw() { return this._lookYaw || 0 };

    onLookTo(e) {
        this.set({lookPitch: e[0], lookYaw: e[1]});
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
        this.lastlookTime = this.time;

        this.lookOffset = [0,1,0]; // Vector displacing the camera from the avatar origin.
    }

    get lookPitch() { return this._lookPitch}
    get lookYaw() { return this._lookYaw}

    lookTo(pitch, yaw) {
        this.setLookAngles(pitch, yaw);
        this.lastLookTime = this.time;
        this.lastLookCache = null;
        this.say("avatar_lookTo", [pitch, yaw]);
    }

    throttledLookTo(pitch, yaw) {
        pitch = Math.min(Math.PI/2, Math.max(-Math.PI/2, pitch));
        yaw = clampRad(yaw);
        if (this.time < this.lastLookTime + this.lookThrottle) {
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

    update(time, delta) {
        super.update(time, delta);

        if (this.lastLookCache && this.time > this.lastLookTime + this.lookThrottle) {
            this.lookTo(this.lastLookCache.pitch, this.lastLookCache.yaw);
        }

    }

}


