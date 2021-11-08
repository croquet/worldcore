import { mix, Actor, Pawn, AM_Smoothed, PM_Smoothed, v3_add, CachedObject, ModelService } from "@croquet/worldcore-kernel";
import { Material, PM_InstancedVisible, InstancedDrawCall, Cube, Cylinder } from "@croquet/worldcore-webgl"
import { AM_Behavioral } from "@croquet/worldcore-behavior"

import { Voxels } from "./Voxels";
import { FallBehavior } from "./Behaviors"
import paper from "../assets/paper.jpg";
import { SideColor } from "./VoxelRender";

//------------------------------------------------------------------------------------------
//-- RubbleMananger ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Spawns rubble when a voxel is destroyed.

export class RubbleMananger extends ModelService {
    init() {
        super.init('Rubble');
        this.subscribe("voxels", "changed", this.onVoxelChange);
    }

    onVoxelChange(data) {
        const xyz = data.xyz;
        const type = data.type;
        const old = data.old;
        if (type > Voxels.solid || old < Voxels.solid) return; // only spawn rubble if a solid voxel becomes air.

        RubbleActor.create({type: old, translation: Voxels.toWorldXYZ(...v3_add(xyz, [0.25, 0.25, 0.5]))});
        RubbleActor.create({type: old, translation: Voxels.toWorldXYZ(...v3_add(xyz, [0.25, 0.75, 0.5]))});
        RubbleActor.create({type: old, translation: Voxels.toWorldXYZ(...v3_add(xyz, [0.75, 0.25, 0.5]))});
        RubbleActor.create({type: old, translation: Voxels.toWorldXYZ(...v3_add(xyz, [0.75, 0.75, 0.5]))});
    }
}
RubbleMananger.register('RubbleMananger');

//------------------------------------------------------------------------------------------
//-- Rubble --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The debris from a destroyed voxel.

class RubbleActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    get pawn() {return RubblePawn}
    init(options) {
        super.init(options);
        this.startBehavior(FallBehavior, {tickRate:50});
    }

    get type() {return this._type};

}
RubbleActor.register("RubbleActor");

export class RubblePawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("rubbleDrawCall"+this.actor.type, () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("rubbleMesh"+this.actor.type, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        this.service("RenderManager").scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const color = SideColor(this.actor.type);
        const block = Cube(2,2,2, color);
        block.load();
        block.clear();
        return block;
    }
}

//------------------------------------------------------------------------------------------
//-- Timber --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Similar to rubble but the debris from a destroyed tree.

export class TimberActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    get pawn() {return TimberPawn};
    init(options) {
        super.init(options);
        this.startBehavior(FallBehavior, {tickRate:50});
    }
}
TimberActor.register("TimberActor");

export class TimberPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("timberDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("timberMesh", this.buildMesh);
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        this.service("RenderManager").scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const log = Cylinder(0.5, 5, 7, [0.7, 0.5, 0.3, 1]);
        log.load();
        log.clear();
        return log;
    }
}