import { ModelService, Constants, Pawn, mix, AM_Behavioral, PM_Spatial, PM_InstancedMesh} from "@croquet/worldcore";

import { toWorld, packKey, Voxels} from "./Voxels";
import { VoxelActor } from "./VoxelActor";
import * as BEHAVIORS from "./SharedBehaviors";
// import { sideColor } from "./MapView";
import { LogActor } from "./Bots";

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
        this.subscribe("edit", "buildBase", this.onBuildBase);
        this.subscribe("voxels", "set", this.validate);
        this.subscribe("voxels", "load", this.destroyAll);
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
        const voxels = this.service("Voxels");
        voxels.set(...data.xyz, Constants.voxel.aur);
        const voxel = data.xyz
        const key = packKey(...voxel);
        const prop = this.props.get(key);
        if (prop) prop.destroy();
    }

    onPlantTree(data) {
        const voxel = data.xyz
        // xxx if elevation < 0 pick a new spot.
        const x = 0.1 + 0.8 * this.random();
        const y = 0.1 + 0.8 * this.random();
        const tree = TreeActor.create({voxel, fraction:[x,y,0]});
        tree.validate();
    }

    onBuildBase(data) {
        const voxels = this.service("Voxels");
        voxels.set(...data.xyz, Constants.voxel.base);
        const voxel = data.xyz
        const x = 0.5;
        const y = 0.5;
        const base = BaseActor.create({voxel, fraction:[x,y,0]});
        base.validate();
    }
}
PropManager.register("PropManager");

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
//-- TreeActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export class TreeActor extends mix(PropActor).with(AM_Behavioral) {

    get pawn() {return TreePawn}

    init(options) {
        super.init(options);
        this.maxSize = 0.6 + 0.4*this.random();
        this.startBehavior("GrowBehavior");
    }

    get size() { return this._size }
    set size(s) { this._size = s}

    validate() { // Check to see if the prop is affected by changing terrain Better use of ground
        const voxels = this.service("Voxels");
        const surfaces = this.service("Surfaces");
        const type = voxels.get(...this.voxel);
        if (type >=2 ) this.destroy(); // Buried
        const belowXYZ = Voxels.adjacent(...this.voxel,[0,0,-1]);
        const belowType = voxels.get(...belowXYZ);

        const e = Math.max(0,surfaces.elevation(...this.xyz));
        // const e = surfaces.elevation(...this.xyz);
        if (e<0 ) {
            this.fell();
            this.destroy()
        };

        // const e = surfaces.elevation(...this.xyz);
        // if (e<0) this.destroy();
        const fraction = [...this.fraction];
        fraction[2] = e;
        this.set({fraction});
    }

    fell() { // Breaks the tree into falling logs
        const voxel  = this.voxel;
        const fraction0 = [...this.fraction];
        const fraction1 = [...this.fraction];
        const fraction2 = [...this.fraction];

        fraction0[2] = 1.5 / Constants.scaleZ
        fraction1[2] = 3.0 / Constants.scaleZ
        fraction2[2] = 4.5 / Constants.scaleZ

        const log0 = LogActor.create({voxel: voxel, fraction: fraction0});
        const log1 = LogActor.create({voxel: voxel, fraction: fraction1});
        const log2 = LogActor.create({voxel: voxel, fraction: fraction2});

        log0.clamp();
        log1.clamp();
        log2.clamp();
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

//------------------------------------------------------------------------------------------
//-- BaseActor-------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BaseActor extends PropActor {

    get pawn() {return BasePawn}

    validate() {
        const voxels = this.service("Voxels");
        const type = voxels.get(...this.voxel);
        if (type >=2 ) this.destroy();

        const belowXYZ = Voxels.adjacent(...this.voxel,[0,0,-1]);
        const belowType = voxels.get(...belowXYZ);
        if (belowType <2 ) this.destroy();
    }

}
BaseActor.register("BaseActor");


//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


class BasePawn extends mix(Pawn).with(PM_Spatial, PM_InstancedMesh) {
    constructor(actor) {
        super(actor);
        this.useInstance("base");
    }
}



