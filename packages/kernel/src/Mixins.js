import { Constants, Model } from "@croquet/croquet";
import { v3_zero, q_identity, m4_scaleRotationTranslation, m4_getScaleRotationTranslation, m4_multiply, v3_lerp, v3_equals,
    q_slerp, q_equals } from  "./Vector";

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

function IsModel(c) {
    while (c) {
        // console.log(c);
        if (c === Model) return true;
        c = Object.getPrototypeOf(c);
    }
    return false;
}

class MixinFactory  {
    constructor(superclass) {
        this.superclass = superclass;
    }

    with(...mixins) {
        if (IsModel(this.superclass))Constants.WC_MIXIN_USAGE.push(mixins);
        return mixins.reduce((c, mixin) => mixin(c), this.superclass);
    }
}

//------------------------------------------------------------------------------------------
//-- Spatial -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Spatial actors have a translation, rotation and scale in 3D space.
//
// They don't have any view-side smoothing, so the pawn will change its transform to exactly
// match the transform of the actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Spatial = superclass => class extends superclass {

    init(...args) {
        super.init(...args);
        this.listen("setScale", this.scaleTo);
        this.listen("setRotation", this.rotateTo);
        this.listen("setTranslation", this.translateTo);
        this.listen("setPosition", this.positionTo);
    }

    scaleTo(v) {
        this.set({scale:v});
    }

    rotateTo(q) {
        this.set({rotation:q});
    }

    translateTo(v) {
        this.set({translation:v});
    }

    positionTo(data) {
        this.set({translation:data[0], rotation: data[1]});
    }

    scaleSet(v) {
        this._scale = v;
        this.localChanged();
    }

    rotationSet(q) {
        this._rotation = q;
        this.localChanged();
    }

    translationSet(v) {
        this._translation = v;
        this.localChanged();
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
        if (!this.$local) this.$local = m4_scaleRotationTranslation(this.scale, this.rotation, this.translation);
        return [...this.$local];
    }
    set local(v) {
        const [scale, rotation, translation] = m4_getScaleRotationTranslation(v);
        this.set({scale, rotation, translation});
        this.$local = v;
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

    get translation() { return this._translation?[...this._translation] : v3_zero() }
    set translation(v) { this.set({translation: v}) }

    get rotation() { return this._rotation?[...this._rotation] : q_identity() }
    set rotation(q) { this.set({rotation: q}) }

    get scale() { return this._scale?[...this._scale] : [1,1,1] }
    set scale(v) { this.set({scale: v}) }

    get forward() {return this._forward || [0,0,1]}
    get up() { return this._up || [0,1,0]}

};
RegisterMixin(AM_Spatial);


//-- Pawn ----------------------------------------------------------------------------------

export const PM_Spatial = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listenOnce("globalChanged", this.refreshDrawTransform);
    }

    refreshDrawTransform() {}

    get scale() { return this.actor.scale }
    get translation() { return this.actor.translation }
    get rotation() { return this.actor.rotation }
    get local() { return this.actor.local }
    get global() { return this.actor.global }

    get forward() {return this.actor.forward}
    get up() { return this.actor.up}

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
        console.warn("AM_Smoothed deprecated -- use AM_Spatial instead");
    }

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
        this.ignore("globalChanged", this.refreshDrawTransform);
    }

    set tug(t) {this._tug = t}
    get tug() { return this._tug }

    get scale() { return this._scale }
    get rotation() { return this._rotation }
    get translation() { return this._translation }

    localChanged() {
        this._local = null;
        this.globalChanged();
    }

    globalChanged() {
        this._global = null;
    }

    scaleTo(v) {
        this._scale = v;
        this.localChanged();
        this.say("setScale", v, this.throttle);
        this.refreshDrawTransform();
    }

    rotateTo(q) {
        this._rotation = q;
        this.localChanged();
        this.say("setRotation", q, this.throttle);
        this.refreshDrawTransform();
    }

    translateTo(v) {
        this._translation = v;
        this.localChanged();
        this.say("setTranslation", v, this.throttle);
        this.refreshDrawTransform();
    }

    positionTo(v, q) {
        this._translation = v;
        this._rotation = q;
        this.localChanged();
        this.say("setPosition", [v,q], this.throttle);
        this.refreshDrawTransform();
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
        if (this._local) return this._local;
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

        if (!this.driving) {
            if (v3_equals(this._scale, this.actor.scale, .0001)) {
                this._scale = this.actor.scale;
            } else {
                this._scale = v3_lerp(this._scale, this.actor.scale, tug);
                this.localChanged();
            }

            if (q_equals(this._rotation, this.actor.rotation, 0.000001)) {
                this._rotation = this.actor.rotation;
            } else {
                this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);
                this.localChanged();
            }

            if (v3_equals(this._translation, this.actor.translation, .0001)) {
                this._translation = this.actor.translation;
            } else {
                this._translation = v3_lerp(this._translation, this.actor.translation, tug);
                this.localChanged();
            }

        }

        if (!this._global) {
            this.refreshDrawTransform();
            if (this.children) this.children.forEach(child => child.globalChanged()); // If our global changes, so do the globals of our children
        }

    }

};

