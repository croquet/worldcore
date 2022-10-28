import { ModelService, Constants, Actor, Pawn, v3_multiply, mix, AM_Smoothed, v3_add, v3_floor, v3_min, v3_max, v3_sub, PM_Smoothed,
    PM_ThreeVisible, THREE, Behavior, AM_Behavioral, q_multiply, q_axisAngle, v3_normalize, q_normalize, CompositeBehavior, sphericalRandom, RegisterMixin, AM_Spatial, toRad, ViewRoot, viewRoot, PM_Spatial, PM_ThreeVisibleX} from "@croquet/worldcore";

import { toWorld, packKey} from "./Voxels";
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

    onClear(data) {
        const voxel = data.xyz
        const key = packKey(...voxel);
        const prop = this.props.get(key);
        if (prop) prop.destroy();
    }

    onPlantTree(data) {
        const voxel = data.xyz
        const surfaces = this.service("Surfaces");
        const x = 0.1 + 0.8 * this.random();
        const y = 0.1+ 0.8 * this.random();
        const v =[...voxel];
        v[0] += x;
        v[1] += y;
        const z = surfaces.elevation(v) || 0;
        TreeActor.create({voxel, fraction:[x,y,z]});
    }
}
PropManager.register("PropManager");

//------------------------------------------------------------------------------------------
//-- VoxelActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Actors that store their voxel coordinates and automatically convert to world world translation.

export class VoxelActor extends mix(Actor).with(AM_Spatial) {


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

    voxelSet(v) { this._voxel = v; this.set({translation: toWorld(v3_add(v, this.fraction))})}
    fractionSet(v) { this._fraction = v; this.set({translation: toWorld(v3_add(v, this.voxel))})}

    get voxel() { return this._voxel || [0,0,0]}
    get key() { return packKey(...this.voxel)}
    get fraction() { return this._fraction || [0,0,0]}

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

}
PropActor.register("PropActor");

//------------------------------------------------------------------------------------------
//-- RubbleActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RubbleActor extends mix(VoxelActor).with(AM_Behavioral) {

    get pawn() {return RubblePawn}

    init(options) {
        super.init(options);
        this.startBehavior({name: "SequenceBehavior", options: {parallel: true, behaviors:[
            {name: "FallBehavior"},
            {name: "TumbleBehavior"}]
        }});
    }

    get type() {return this._type || Constants.voxel.dirt};

}
RubbleActor.register("RubbleActor");


//------------------------------------------------------------------------------------------
//-- RubblePawn-----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class RubblePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleX) {
    constructor(actor) {
        super(actor);

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...sideColor(this.actor.type))} );

        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.setRenderObject(this.mesh);

    }
}

//------------------------------------------------------------------------------------------
//-- TreeActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TreeActor extends mix(VoxelActor).with(AM_Behavioral) {

    get pawn() {return TreePawn}

    init(options) {
        super.init(options);
        this.startBehavior({name: "GrowBehavior"});
    }

}
TreeActor.register("TreeActor");


//------------------------------------------------------------------------------------------
//-- TreePawn-------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class TreePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleX) {
    constructor(actor) {
        super(actor);
        const im = this.service("InstanceManager");

        this.mesh = im.get("yellow");
        this.index = this.mesh.use(this);

        this.updateMatrix()

        this.listenOnce("viewGlobalChanged", this.updateMatrix);

    }

    updateMatrix() {
        this.mesh.updateMatrix(this.index, this.global)
    }

    destroy() {
        super.destroy();
        this.mesh.release(this.index);
    }
}



