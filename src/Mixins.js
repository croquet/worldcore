import { addClassHash } from "@croquet/util";
import { GetNamedView } from "./NamedView";
import { PM_Dynamic } from "./Pawn";
import { GetViewDelta } from "./ViewRoot";
import { v3_zero, q_identity, v3_unit, m4_scalingRotationTranslation, m4_multiply, v3_lerp, v3_equals,
    q_slerp, q_equals, v3_isZero, q_isZero, q_normalize, q_multiply, v3_add, v3_scale } from  "./Vector";


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

export const mix = superclass => new MixinFactory(superclass);
export const RegisterMixin = mixin => addClassHash(mixin);

class MixinFactory  {
    constructor(superclass) {
        this.superclass = superclass;
    }

    with(...mixins) {
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
        if (child.parent) child.parent.removeChild(child);
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

// Spatial actors have a location, rotation and scale in 3D space. They inherit from Tree
// so they also maintain a hierachy of transforms.
//
// They don't have any view-side smoothing, so the pawn will change its transform to exactly
// match the transform of the actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Spatial = superclass => class extends AM_Tree(superclass) {
    init(...args) {
        this.scale = v3_unit();
        this.rotation = q_identity();
        this.location = v3_zero();
        super.init(...args);
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

    setLocation(v) {
        this.location = v;
        this.say("spatial_setLocation", v);
        this.localChanged();
    }

    get local() {
        if (!this.$local) this.$local = m4_scalingRotationTranslation(this.scale, this.rotation, this.location);
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
get location() { return this.actor.location; }
get rotation() { return this.actor.rotation; }
get local() { return this.actor.local; }
get global() { return this.actor.global; }

};

//------------------------------------------------------------------------------------------
//-- Smoothed ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Smoothed actors generate interpolation information when they get movement commands. Their
// pawns use this to reposition themselves on every frame update.
//
// Setting location/rotation/scale will pop the pawn to the new value. If you want the transition
// to be interpolated, use moveTo, rotateTo, or scaleTo instead.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Smoothed = superclass => class extends AM_Spatial(superclass) {

    moveTo(v) {
        this.location = v;
        this.say("smoothed_moveTo", v);
    }

    rotateTo(q) {
        this.rotation = q;
        this.say("smoothed_rotateTo", q);
    }

    scaleTo(v) {
        this.scale = v;
        this.say("smoothed_scaleTo", v);
    }

};
RegisterMixin(AM_Smoothed);

//-- Pawn ----------------------------------------------------------------------------------

// Tug is a value between 0 and 1 that controls the weighting between the two
// transforms. The closer tug is to 1, the more closely the pawn will track the actor,
// but the more vulnerable the pawn is to latency/stutters in the simulation.

// When the difference between actor and pawn scale/rotation/location drops below an epsilon,
// interpolation is paused

const DynamicSpatial = superclass => PM_Dynamic(PM_Spatial(superclass)); // Merge dynamic and spatial base mixins

export const PM_Smoothed = superclass => class extends DynamicSpatial(superclass) {
    constructor(...args) {
        super(...args);

        this._scale = this.actor.scale;
        this._rotation = this.actor.rotation;
        this._location = this.actor.location;

        this.tug = 0.2;

        this.scaleEpsilon = 0.0001;
        this.rotationEpsilon = 0.000001;
        this.locationEpsilon = 0.0001;

        this.listenOnce("spatial_setScale", v => this._scale = v);
        this.listenOnce("spatial_setRotation", q => this._rotation = q);
        this.listenOnce("spatial_setLocation", v => this._location = v);

        this.listenOnce("smoothed_moveTo", () => this.isMoving = true);
        this.listenOnce("smoothed_rotateTo", () => this.isRotating = true);
        this.listenOnce("smoothed_scaleTo", () => this.isScaling = true);

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

    get scale() { return this._scale; }
    get location() { return this._location; }
    get rotation() { return this._rotation; }

    get local() {
        if (!this._local) this._local = m4_scalingRotationTranslation(this._scale, this._rotation, this._location);
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

    update(time) {
        super.update(time);
        let tug = this.tug;
        if (this.delta) tug = Math.min(1, tug * this.delta / 15);
        const changed = (this.isMoving || this.isRotating || this.isScaling);
        if (this.isScaling) {
            this._scale = v3_lerp(this._scale, this.actor.scale, tug);
            this.isScaling = !v3_equals(this._scale, this.actor.scale, this.scaleEpsilon);
        }
        if (this.isRotating) {
            this._rotation = q_slerp(this._rotation, this.actor.rotation, tug);
            this.isRotating = !q_equals(this._rotation, this.actor.rotation, this.rotationEpsilon);
        }
        if (this.isMoving) {
            this._location = v3_lerp(this._location, this.actor.location, tug);
            this.isMoving = !v3_equals(this._location, this.actor.location, this.locationEpsilon);
        }
        if (changed) this.localChanged();
        if (this.needRefresh) this.refresh();
        this.needRefresh = false;
    }
};

//------------------------------------------------------------------------------------------
//-- Avatar --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Avatar actors maintain a primary view-side scale/rotation/location that you can drive directly
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
        this.tickFrequency = 15;
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
        if (this.isMoving) this.moveTo(v3_add(this.location, v3_scale(this.velocity, delta)));
        this.future(this.tickFrequency).tick(this.tickFrequency);
    }

};
RegisterMixin(AM_Avatar);

//-- Pawn ----------------------------------------------------------------------------------

// Tug is set even lower so that heatbeat stutters on the actor side will not affect pawn
// motion. However this means the pawn will take longer to "settle" into its final position.
//
// It's possible to have different tug values depending on whether the avatar is controlled
// locally or not.

export const PM_Avatar = superclass => class extends PM_Smoothed(superclass) {
    constructor(...args) {
        super(...args);
        this.tug = 0.05;    // Bias the tug even more toward the pawn's immediate position.
        this.velocity = v3_zero();
        this.spin = q_identity();
    }

    moveTo(v) {
        this._location = v;
        this.say("avatar_moveTo", v);
    }

    rotateTo(q) {
        this._location = q;
        this.say("avatar_rotateTo", q);
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

    update(time) {
        if (this.isRotating) this._rotation = q_normalize(q_slerp(this._rotation, q_multiply(this._rotation, this.spin), GetViewDelta()));
        if (this.isMoving) this._location = v3_add(this._location, v3_scale(this.velocity, GetViewDelta()));
        super.update(time);
    }


};
