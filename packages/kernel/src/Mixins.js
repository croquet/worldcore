import { Constants } from "@croquet/croquet";
import { m4_identity } from "..";
// import { Constants } from "@croquet/worldcore-kernel";
// import { GetPawn } from "./Pawn";
import { v3_zero, q_identity, v3_unit, m4_scaleRotationTranslation, m4_translation, m4_rotationX, m4_multiply, v3_lerp, v3_equals,
    q_slerp, q_equals, v3_isZero, q_isZero, q_normalize, q_multiply, v3_add, v3_scale, m4_rotationQ, v3_transform, q_euler, TAU, clampRad, q_axisAngle } from  "./Vector";

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
// of itself. The "mix" and "with" operators are semantic suger to make the construction
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
};

//------------------------------------------------------------------------------------------
//-- Spatial -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Spatial actors have a translation, rotation and scale in 3D space.
//
// They don't have any view-side smoothing, so the pawn will change its transform to exactly
// match the transform of the actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Spatial = superclass => class extends superclass {

    init(options) {
        super.init(options);
        this.listen("scaleSet", this.localChanged);
        this.listen("rotationSet", this.localChanged);
        this.listen("translationSet", this.localChanged);
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
        if (!this.$local) this.$local = m4_scaleRotationTranslation(this.scale, this.rotation, this.translation);
        return [...this.$local];
    }

    get global() {
        if (this.$global) return [...this.$global];
        if (this.parent) {
            this.$global = m4_multiply(this.local, this.parent.global);
        } else {
            this.$global = this.local;
        }
        return [...this.$global];
    }

    get translation() { return this._translation?[...this._translation] : v3_zero() };
    set translation(v) { this.set({translation: v}) };

    get rotation() { return this._rotation?[...this._rotation] : q_identity() };
    set rotation(q) { this.set({rotation: q}) };

    get scale() { return this._scale?[...this._scale] : [1,1,1] };
    set scale(v) { this.set({scale: v}) };
};
RegisterMixin(AM_Spatial);


//-- Pawn ----------------------------------------------------------------------------------

export const PM_Spatial = superclass => class extends superclass {

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

    init(...args) {
        super.init(...args);
        this.listen("scaleTo", this.scaleTo);
        this.listen("rotateTo", this.rotateTo);
        this.listen("translateTo", this.translateTo);
        this.listen("positionTo", this.positionTo);
    }

    scaleTo(v) {
        // this._scale = v;
        this.set({scale:v}, true);
        this.$local = null;
        this.$global = null;
        // this.say("scaleTo", v);
    }

    rotateTo(q) {
        // this._rotation = q;
        this.set({rotation:q}, true);
        this.$local = null;
        this.$global = null;
    }

    translateTo(v) {
        // this._translation = v;
        this.set({translation:v}, true);
        this.$local = null;
        this.$global = null;
    }

    positionTo(data) {
        // this._translation = data.v;
        // this._rotation = data.q;
        this.set({translation:data.v, rotation: data.q}, true)
        this.$local = null;
        this.$global = null;
    }

    moveTo(v) { this.translateTo(v)}

};
RegisterMixin(AM_Smoothed);

//-- Pawn ----------------------------------------------------------------------------------

// Tug is a value between 0 and 1 that controls the weighting between the two
// transforms. The closer tug is to 1, the more closely the pawn will track the actor,
// but the more vulnerable the pawn is to latency/stutters in the simulation.

// When the difference between actor and pawn scale/rotation/translation drops below an epsilon,
// interpolation is paused

export const PM_Smoothed = superclass => class extends PM_Spatial(superclass) {

    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        this.throttle = 100; //ms

        this._scale = this.actor.scale;
        this._rotation = this.actor.rotation;
        this._translation = this.actor.translation;
        this._global = this.actor.global;

        this.listenOnce("scaleSnap", this.onScaleSnap);
        this.listenOnce("rotationSnap", this.onRotationSnap);
        this.listenOnce("translationSnap", this.onTranslationSnap);

    }

    set tug(t) {this._tug = t}
    get tug() { return this._tug; }

    get scale() { return this._scale; }
    get rotation() { return this._rotation; }
    get translation() { return this._translation; }

    localChanged(){
        this._local = null;
        this.globalChanged();
    }

    globalChanged(){
        this._global = null;
    }

    scaleTo(v) {
        this.driving = true;
        this._scale = v;
        this.localChanged();
        this.say("scaleTo", v, this.throttle)
    }

    rotateTo(q) {
        this.driving = true;
        this._rotation = q;
        this.localChanged();
        this.say("rotateTo", q, this.throttle)
    }

    translateTo(v) {
        this.driving = true;
        this._translation = v;
        this.localChanged();
        this.say("translateTo", v, this.throttle)
    }

    positionTo(v, q) {
        this.driving = true;
        this._translation = v;
        this._rotation = q;
        this.localChanged();
        this.say("positionTo", {v,q}, this.throttle)
    }

    onScaleSnap() {
        this._scale = this.actor.scale;
        this.localChanged();
    }

    onRotationSnap() {
        this._rotation = this.actor.rotation;
        this.localChanged();
    }

    onTranslationSnap() {
        this._translation = this.actor.translation;
        this.localChanged();
    }

    get local() {
        if (this._local) return this. _local;
        this._local = m4_scaleRotationTranslation(this._scale, this._rotation, this._translation);
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

        if(!this.driving) {
            if (v3_equals(this._scale, this.actor.scale, .0001)) {
                this._scale = this.actor.scale;
            } else {
                this._scale = v3_lerp(this._scale, this.actor.scale, tug);
            };

            if (q_equals(this._rotation, this.actor.rotation, 0.000001)) {
                this._rotation = this.actor.rotation;
            } else {
                this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);
            };

            if (v3_equals(this._translation, this.actor.translation, .0001)) {
                this._translation = this.actor.translation;
            } else {
                this._translation = v3_lerp(this._translation, this.actor.translation, tug);
            };
            this.localChanged();
        }

        if(!this._global) {
            this.say("viewGlobalChanged");
            if (this.children) this.children.forEach(child => child.globalChanged()); // If our global changes, so do the globals of our children
        }

    }

};

