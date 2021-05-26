import { Model } from "@croquet/croquet";
import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, AM_Smoothed, PM_Smoothed, Material, PM_InstancedVisible, GetNamedView, v3_add,
    Cylinder, Cone, m4_translation, CachedObject, q_axisAngle, TAU, InstancedDrawCall, m4_rotationX, toRad, v3_scale,
    AM_Behavioral, DestroyBehavior, SequenceBehavior, Behavior
 } from "@croquet/worldcore";
import { Voxels, AM_Voxel } from "./Voxels";
import { FallBehavior } from "./SharedBehaviors"
import paper from "../assets/paper.jpg";

export class Plants extends Model {
    init() {
        super.init();
        this.beWellKnownAs("Plants");
        this.plants = new Map();
        this.subscribe("surfaces", "newLevel", this.onNewLevel);
        this.subscribe("surfaces", "changed", this.onChanged);
        this.subscribe("editor", "spawnTree", this.onSpawnTree);
    }

    destroy() {
        super.destroy();
        this.destroyAll();
    }

    onNewLevel() {
        this.destroyAll();
    }

    onChanged(data) {
        const touched = data.remove;
        touched.forEach(key => {
            if (!this.has(key)) return;
            this.get(key).validate();
        });
    }

    has(key) {
        return this.plants.has(key);
    }

    get(key) {
        return this.plants.get(key);
    }

    set(key, plant) {
        this.destroyOne(key);
        this.plants.set(key, plant);
    }

    delete(key) {
        this.plants.delete(key);
    }

    destroyOne(key) {
        if (this.has(key)) this.get(key).destroy();
    }

    destroyAll() {
        const doomed = new Map(this.plants);
        doomed.forEach(plant => plant.destroy());
    }

    onSpawnTree(xyz) {
        TreeActor.create({translation: Voxels.toWorldXYZ(...xyz)});
    }

}
Plants.register("Plants");

//------------------------------------------------------------------------------------------
//-- Plant ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PlantActor extends mix(Actor).with(AM_Spatial, AM_Voxel, AM_Behavioral) {
    init(...args) {
        super.init(...args);
        const plants = this.wellKnownModel("Plants");
        if (this.voxelKey) plants.set(this.voxelKey, this);
    }

    destroy() {
        super.destroy();
        const plants = this.wellKnownModel("Plants");
        if (this.voxelKey) plants.delete(this.voxelKey);
    }
}

class PlantPawn extends mix(Pawn).with(PM_Spatial, PM_InstancedVisible) {
}
PlantPawn.register('PlantPawn');

//------------------------------------------------------------------------------------------
//-- Tree ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TreeBehavior extends Behavior {

    start() {
        this.maxSize = 1 - 0.3 * this.random();
        this.size = this.actor.scale[0];
        this.run();
    }

    do(delta) {
        const growth = 0.02;
        this.size = Math.min(this.maxSize, this.size + growth * delta / 1000);
        this.actor.set({scale: [this.size, this.size, this.size]});
        if (this.size < this.maxSize) {
            this.run();
        } else {
            this.succeed();
        }
    }
}
TreeBehavior.register('TreeBehavior');

export class TreeActor extends PlantActor {
    init(options) {
        super.init('TreePawn', options);
        this.set({tickRate: 500});
        this.randomizePosition();
        this.startBehavior(TreeBehavior);
    }

    randomizePosition() {
        const size = 0.2;
        const surface = this.wellKnownModel('Surfaces').get(this.voxelKey);
        let x = 0.2 + 0.6 * this.random();
        let y = 0.2 + 0.6 * this.random();
        let z = surface.rawElevation(x,y);
        if (z === undefined) { // Handle placing tree on half floor or shim
            x = 1-x;
            y = 1-y;
            z = surface.rawElevation(x,y);
            if (z === undefined) console.log("Illegal tree position! " + [x,y]);
        }
        this.roots = [x,y,z]; // Set the position the tree is planted in voxel coordinates
        this.set({
            rotation: q_axisAngle([0,0,1], TAU * this.random()),
            translation: Voxels.toWorldXYZ(...v3_add(this.voxelXYZ, this.roots)),
            scale: [size, size, size]
        });

    }

    validate() {
        const surface = this.wellKnownModel('Surfaces').get(this.voxelKey);
        if (!surface || surface.rawElevation(this.roots[0], this.roots[1]) !== this.roots[2]) this.harvest();
    }

    harvest() {
        const translation0 = this.translation;
        const translation1 = v3_add(this.translation, v3_scale([0,0,6], this.scale[0]));
        const translation2 = v3_add(this.translation, v3_scale([0,0,12], this.scale[0]));
        TimberActor.create({translation: translation0, scale: this.scale});
        TimberActor.create({translation: translation1, scale: this.scale});
        TimberActor.create({translation: translation2, scale: this.scale});
        this.destroy();
    }
}
TreeActor.register("TreeActor");

class TreePawn extends PlantPawn {
    constructor(...args) {
        super(...args);
        this.setDrawCall(CachedObject("pineTreeDrawCall", () => this.buildDraw()));
    }

    buildDraw() {
        const mesh = CachedObject("pineTreeMesh", this.buildMesh);
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);
        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const trunk = Cylinder(0.5, 15, 7, [0.7, 0.5, 0.3, 1]);
        const top = Cone(2, 0.1, 20, 7, [0.4, 0.8, 0.4, 1]);
        top.transform(m4_translation([0,15,0]));
        trunk.merge(top);
        top.destroy();
        trunk.transform(m4_rotationX(toRad(90)));
        trunk.transform(m4_translation([0,0,7.5]));
        trunk.load();
        trunk.clear();
        return trunk;
    }

}
TreePawn.register('TreePawn');

//------------------------------------------------------------------------------------------
//-- Timber --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class TimberBehavior extends SequenceBehavior {
    get children() { return [
        FallBehavior,
        DestroyBehavior
    ]}
}
TimberBehavior.register("TimberBehavior");

export class TimberActor extends mix(Actor).with(AM_Smoothed, AM_Behavioral) {
    init(options) {
        super.init('TimberPawn', options);
        this.startBehavior(TimberBehavior);
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
        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
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
TimberPawn.register("TimberPawn");
