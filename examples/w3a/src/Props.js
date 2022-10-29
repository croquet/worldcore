import { ModelService, Constants, Actor, Pawn, v3_multiply, mix, AM_Smoothed, v3_add, v3_floor, v3_min, v3_max, v3_sub, PM_Smoothed,
    PM_ThreeVisible, THREE, Behavior, AM_Behavioral, q_multiply, q_axisAngle, v3_normalize, q_normalize, CompositeBehavior, sphericalRandom, RegisterMixin, AM_Spatial, toRad, ViewRoot, viewRoot, PM_Spatial, PM_ThreeVisibleX, PM_InstancedMesh} from "@croquet/worldcore";

import { toWorld, packKey, Voxels} from "./Voxels";
import * as BEHAVIORS from "./SharedBehaviors";
import { sideColor } from "./MapView";

//------------------------------------------------------------------------------------------
//-- PropManager ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds all the large static objects in the world. Only one prop can exist per voxel.

export class PropManager extends ModelService {
    init() {
        super.init("PropManager");
        this.props = new Map();
        this.subscribe("edit", "plantTree", this.onPlantTree);
        this.subscribe("edit", "clear", this.onClear);
        this.subscribe("voxels", "set", this.validate);
    }

    add(prop) {
        const key = prop.key;
        const old = this.props.get(key);
        if (old) old.destroy();
        this.props.set(key, prop);
    }

    remove(prop) {
        this.props.delete(prop.key);
    }

    destroyAll() {
        const doomed = new Map(this.props);
        doomed.forEach(prop => prop.destroy());
    }

    validate(data) { // A voxel has changed, check nearby
        const box = Voxels.boxSet(...data.xyz);
        box.forEach(key => {
            const prop = this.props.get(key);
            if (prop) prop.validate();
        });
    }

    onClear(data) {
        const voxel = data.xyz
        const key = packKey(...voxel);
        const prop = this.props.get(key);
        if (prop) prop.destroy();
    }

    onPlantTree(data) {
        const voxel = data.xyz
        // const surfaces = this.service("Surfaces");
        const x = 0.1 + 0.8 * this.random();
        const y = 0.1 + 0.8 * this.random();
        const tree = TreeActor.create({voxel, fraction:[x,y,0]});
        tree.validate();
    }
}
PropManager.register("PropManager");

//------------------------------------------------------------------------------------------
//-- VoxelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Actors that store their voxel coordinates and automatically convert to world world translation.

export class VoxelActor extends mix(Actor).with(AM_Spatial) {


    // init(options) {
    //     super.init(options);
    // }

    destroy() {
        super.destroy();
        const pm = this.service("PropManager");
        pm.remove(this.key);
    }

    voxelSet(v) { this._voxel = v; this.set({translation: toWorld(v3_add(v, this.fraction))})}
    fractionSet(v) { this._fraction = v; this.set({translation: toWorld(v3_add(v, this.voxel))})}

    get voxel() { return this._voxel || [0,0,0]}
    get key() { return packKey(...this.voxel)}
    get fraction() { return this._fraction || [0,0,0]}
    get xyz() { return v3_add(this.voxel, this.fraction)}

    clamp() {
        const floor = v3_floor(this.fraction);
        const fraction = v3_sub(this.fraction, floor);
        const voxel = v3_add(this.voxel, floor);
        this.set({voxel,fraction});
    }

}
VoxelActor.register("VoxelActor");

//------------------------------------------------------------------------------------------
//-- PropActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Large static objects. Only one prop can exist in each voxel.

export class PropActor extends VoxelActor {


    init(options) {
        super.init(options);
        const pm = this.service("PropManager");
        pm.add(this);
    }

    destroy() {
        super.destroy();
        const pm = this.service("PropManager");
        pm.remove(this.key);
    }

    validate() {} // Check to see if the prop is affected by changing terrain

}
PropActor.register("PropActor");

//------------------------------------------------------------------------------------------
//-- RubbleActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RubbleActor extends mix(VoxelActor).with(AM_Behavioral) {

    get pawn() {return RubblePawn}

    init(options) {
        super.init(options);
        const FallAndDestroy = {name: "SequenceBehavior", options: {behaviors:["FallBehavior", "DestroyBehavior"]}}
        this.startBehavior({name: "CompositeBehavior", options: {parallel: true, behaviors:["TumbleBehavior", FallAndDestroy]}});
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
//-- TreeActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

/// xxx Bug with trees on shims atop cap & double ramps

export class TreeActor extends mix(PropActor).with(AM_Behavioral) {

    get pawn() {return TreePawn}

    init(options) {
        super.init(options);
        this.startBehavior("GrowBehavior");
    }

    validate() { // Check to see if the prop is affected by changing terrain
        const voxels = this.service("Voxels");
        const surfaces = this.service("Surfaces");
        const type = voxels.get(...this.voxel);
        if (type >=2 ) this.destroy();
        const belowXYZ = Voxels.adjacent(...this.voxel,[0,0,-1]);
        const belowType = voxels.get(...belowXYZ);
        if (belowType <2 ) this.destroy();

        const e = surfaces.elevation(...this.xyz) || 0;
        if (e === undefined) this.destroy();
        const fraction = [...this.fraction];
        fraction[2] = e;
        this.set({fraction});
    }

}
TreeActor.register("TreeActor");


//------------------------------------------------------------------------------------------
//-- TreePawn-------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class TreePawn extends mix(Pawn).with(PM_Spatial, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("pineTree");
    }


}



