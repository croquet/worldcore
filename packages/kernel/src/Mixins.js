import { Constants } from "@croquet/croquet";
import { m4_identity } from "..";
// import { Constants } from "@croquet/worldcore-kernel";
import { PM_Dynamic, GetPawn } from "./Pawn";
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

    onChangeParent(d) {
        if (d.o) d.o.removeChild(this);
        if (d.v) d.v.addChild(this);
    }

    get parent() { return this._parent; }

    addChild(c) { // This should never be called directly, use set instead
        if (!this.children) this.children = new Set();
        this.children.add(c);
    }

    removeChild(c) { // This should never be called directly, use set instead
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
// so they also maintain a hierarchy of transforms.
//
// They don't have any view-side smoothing, so the pawn will change its transform to exactly
// match the transform of the actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Spatial = superclass => class extends AM_Tree(superclass) {

    init(options) {
        super.init(options);
        this.listen("_scale", this.localChanged);
        this.listen("_rotation", this.localChanged);
        this.listen("_translation", this.localChanged);
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
    set translation(v) { this.set({translation: v}) };
    get rotation() { return this._rotation || q_identity() };
    get scale() { return this._scale || [1,1,1] };
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

    init(options) {
        super.init(options);
        this.listen("s_set", this.smoothSet);
        this.listen("s_scale", this.localChanged);
        this.listen("s_rotation",  this.localChanged);
        this.listen("s_translation", this.localChanged);
    }

    smoothSet(options) {
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const n = "_" + option[0];
            const v = option[1];
            const o = this[n];
            this[n] = v;
            this.say('s'+n, {v, o}); // Publish a local message whenever a property changes with its old and new value.
        }
    }

    moveTo(v) {
        this.smoothSet({translation: v});
    }

    rotateTo(q) {
        this.smoothSet({rotation: q});
    }

    scaleTo(v) {
        this.smoothSet({scale: v})
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
        this.tug = 0.2;
        this.defineSmoothedPawnProperty( "scale", () => this.onLocalChanged() );
        this.defineSmoothedPawnProperty( "translation",  () => this.onLocalChanged() );
        this.defineSmoothedPawnProperty( "rotation",  () => this.onLocalChanged(), (a,b) => q_equals(a,b,0.000001), q_slerp );
    }

    set tug(t) {this._tug = t}
    get tug() {  return this._tug; }

    set localOffset(m4) {
        this._localOffset = m4;
        this.onLocalChanged();
    }

    // Creates a property in the pawn that will access a matching property in the actor.
    // The property will interpolate every frame to track the actor value
    // Interpolation stops when the pawn equals the actor (within an epsilon)
    // If you set the property in the actor, it will immediately change in the pawn
    // When the property changes (ether from set or update) it calls the onSet method
    // Handles both scalars and vectors automatically
    // If you need custom equals or lerp functions, you can supply them.

    defineSmoothedPawnProperty(name, onSet, equals, lerp) {
        equals = equals || defaultEquals(this.actor[name]); // Test to determine if value has changed
        lerp = lerp || defaultLerp(this.actor[name]);       // Interpolation between old and new

        const ul = '_' + name;                              // The private name of the property in the pawn
        this[ul] = this.actor[name]                         // Set the initial value

        Object.defineProperty(this, name, { get: function() {return this[ul]} });   // Create a public getter

        if (!this.smoothedProperties) this.smoothedProperties = {};     // Store the callbacks
        this.smoothedProperties[name] = {ul, onSet, equals, lerp};

        this.listenOnce(ul, () => { const o = this[ul]; const v = this.actor[name]; this[ul] = v; if (onSet) onSet(v,o); });    // listen for a set
        this.listenOnce('s' + ul, () => { this.smoothedProperties[name].changed = true});                                       // listen for a smoothSet
    }

    onLocalChanged() {
        this._local = null;
        this._global = null;
    }

    onGlobalChanged() {
        this._global = null;
    }

    get local() {
        if (this._local) return this. _local;
        if (this._localOffset) {
            this._local = m4_multiply(this._localOffset, m4_scaleRotationTranslation(this._scale, this._rotation, this._translation));
            return this._local;
        }
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
        this.say("viewGlobalChanged");
        return this._global;
    }

    update(time, delta) {
        super.update(time, delta);

        let tug = this.tug;
        if (delta) tug = Math.min(1, tug * delta / 15);

        for (const s of Object.entries(this.smoothedProperties)) {
            const name = s[0];
            if (s[1].changed) {
                const ul = s[1].ul;
                const equals = s[1].equals;
                if (equals(this[ul], this.actor[name])) {
                    this.smoothedProperties[name].changed = false;
                } else {
                    const lerp = s[1].lerp;
                    const o = this[ul];
                    const v = lerp(o, this.actor[name], tug);
                    const onSet = s[1].onSet;
                    this[ul] = v;
                    if (onSet) onSet(v,o);
                };
            }
        }

        if (!this._global) {
            this.global;
            if (this.children) this.children.forEach(child => child._global = null); // If our global changes, so do the globals of our children
            // this.say("viewGlobalChanged");
        }

    }

    postUpdate(time, delta) {
        super.postUpdate(time, delta);
        if (this.children) this.children.forEach(child => child.fullUpdate(time, delta));
    }

}

//-- Functions ----------------------------------------------------------------------------

function defaultEquals(v) {
    if (v.constructor === Array) return defaultVectorEquals;
    return defaultScalarEquals;
}

function defaultScalarEquals (a,b) {
    return 0.0001 > (Math.abs(a-b))
}

function defaultVectorEquals (a,b) {
    let i = a.length;
    while (i--) {
        if (0.0001 < Math.abs(a[i] - b[i])) return false;
    }
    return true
}

function defaultLerp(v) {
    if (v.constructor === Array) return defaultVectorLerp;
    return defaultScalarLerp;
}

function defaultScalarLerp (a,b,t) {
    return a + (b - a) * t;
}

function defaultVectorLerp (a,b,t) {
    return a.map( (v, i) => {return v + (b[i]-v) * t} )
}

//------------------------------------------------------------------------------------------
//-- Predictive ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Avatar actors maintain a primary view-side scale/rotation/translation that you can drive directly
// from player inputs so the avatar responds quickly to player input. On every frame this
// transform is averaged with the official model-side values.
//
// If you're using player-controlled avatars, you'll probably want to set:
//      * Session tps to 60 with no cheat beats
//      * AM_Avatar tick frequency to <16
//
// This will create the smoothest/fastest response.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Predictive = superclass => class extends AM_Smoothed(superclass) {

    get spin() { return this._spin || q_identity() }
    get velocity() { return this._velocity || v3_zero() }
    get tickStep() {return this._tickStep || 15}

    init(...args) {
        super.init(...args);
        this.future(0).tick(0);
    }

    tick(delta) {
        if (!q_isZero(this.spin)) {
            this.rotateTo(q_normalize(q_slerp(this.rotation, q_multiply(this.rotation, this.spin), delta)));
        };
        if (!v3_isZero(this.velocity)) {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this.moveTo(v3_add(this.translation, move));
        }
        if (!this.doomed) this.future(this.tickStep).tick(this.tickStep);
    }

};
RegisterMixin(AM_Predictive);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Predictive = superclass => class extends PM_Smoothed(superclass) {
    constructor(...args) {
        super(...args);

        this.spin = q_identity();
        this.velocity = v3_zero();
    }

    predictiveSet(options = {}, throttle = 0) {
        for (const option in options) {
            const ul = '_' + option;
            this[ul] = options[option];
        }
        this.say("s_set", options, throttle);
    }

    moveTo(v, throttle) {
        this.predictiveSet({translation: v}, throttle);
        this.onLocalChanged();
    }

    rotateTo(q, throttle) {
        this.predictiveSet({rotation: q}, throttle);
        this.onLocalChanged();
    }

    setVelocity(v, throttle) {
        this.predictiveSet({velocity: v}, throttle);
    }

    setSpin(q, throttle) {
        this.predictiveSet({spin: q}, throttle);
    }

    update(time, delta) {

        if (!q_isZero(this.spin)) {
            this._rotation = q_normalize(q_slerp(this._rotation, q_multiply(this._rotation, this.spin), delta));
            this._local = null;
            this._global = null;
        }

        if (!v3_isZero(this.velocity))  {
            const relative = v3_scale(this.velocity, delta);
            const move = v3_transform(relative, m4_rotationQ(this.rotation));
            this._translation = v3_add(this._translation, move);
            this._local = null;
            this._global = null;
        }
        super.update(time, delta);

    }

};

// Old name for Predictive objects

export const AM_Avatar = AM_Predictive;
export const PM_Avatar = PM_Predictive;



//------------------------------------------------------------------------------------------
//-- MouselookAvatar -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// MouselookAvatar is an extension of the normal avatar with a look direction that can be driven
// by mouse or other continous xy inputs. The avatar internally stores pitch and yaw information
// that can be used for animation if necessary. Both pitch and yaw are smoothed in the pawn.

//-- Actor ---------------------------------------------------------------------------------

export const AM_MouselookAvatar = superclass => class extends AM_Avatar(superclass) {

    init(...args) {
        this.listen("avatarLookTo", this.onLookTo);
        super.init(...args);
        this.set({rotation: q_euler(0, this.lookYaw, 0)});
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

        this.lookThrottle = 50;  // MS between throttled lookTo events
        this.lastlookTime = this.time;

        this.lookOffset = [0,0,0]; // Vector displacing the camera from the avatar origin.
    }

    get lookPitch() { return this._lookPitch}
    get lookYaw() { return this._lookYaw}

    lookTo(pitch, yaw) {
        this.setLookAngles(pitch, yaw);
        this.lastLookTime = this.time;
        this.lastLookCache = null;
        this.say("avatarLookTo", [pitch, yaw]);
        this.say("lookGlobalChanged");
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
        const pitchRotation = q_axisAngle([1,0,0], this.lookPitch);
        const yawRotation = q_axisAngle([0,1,0], this.lookYaw);

        const modelLocal =  m4_scaleRotationTranslation(this.scale, yawRotation, this.translation)
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


