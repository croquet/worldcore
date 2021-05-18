import { Model } from "@croquet/croquet";
import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, AM_Smoothed, PM_Smoothed, Material, PM_InstancedVisible, GetNamedView, v3_add,
    Cylinder, Cone, m4_translation, CachedObject, q_axisAngle, TAU, InstancedDrawCall, m4_rotationX, toRad } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import paper from "../assets/paper.jpg";
import { AM_Voxel } from "./Components";

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
        TreeActor.create({key: Voxels.packKey(...xyz)});
    }

}
Plants.register("Plants");

//------------------------------------------------------------------------------------------
//-- Plant ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PlantActor extends mix(Actor).with(AM_Spatial, AM_Voxel) {
    init(...args) {
        super.init(...args);
        const plants = this.wellKnownModel("Plants");
        if (this.key) plants.set(this.key, this);
    }

    destroy() {
        super.destroy();
        const plants = this.wellKnownModel("Plants");
        if (this.key) plants.delete(this.key);
    }
}

class PlantPawn extends mix(Pawn).with(PM_Spatial, PM_InstancedVisible) {
}

//------------------------------------------------------------------------------------------
//-- Tree ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TreeActor extends PlantActor {
    init(options) {
        super.init('TreePawn', options);
        this.randomizePosition();
        const first = this.random() * 500;
        this.future(first).tick(first);
    }

    // harvest() {
    //     this.destroy();
    //     TimberActor.create({xyz: this.location, size: this.size});
    //     const location1 = v3_add(this.location, v3_scale([0,0,6], this.size));
    //     TimberActor.create({xyz: location1, size: this.size});
    //     const location2 = v3_add(this.location, v3_scale([0,0,12], this.size));
    //     TimberActor.create({xyz: location2, size: this.size});
    // }

    randomizePosition() {
        this.size = 0.1;
        this.size = 1;
        this.maxSize = 1 - 0.3 * this.random();
        this.maxSize = 1;
        const surface = this.wellKnownModel('Surfaces').get(this.key);
        let x = 0.2 + 0.6 * this.random();
        let y = 0.2 + 0.6 * this.random();
        x = 0.5, y = 0.5;
        let z = surface.rawElevation(x,y);

        if (z === undefined) { // Handle placing tree on half floor or shim
            x = 1-x;
            y = 1-y;
            z = surface.rawElevation(x,y);
            if (z === undefined) console.log("Illegal tree position! " + [x,y]);
        }
        this.roots = [x,y,z]; // Set the position the tree is planted in voxel coordinates
        console.log(this.roots);
        this.set({
            rotation: q_axisAngle([0,0,1], TAU * this.random()),
            translation: Voxels.toWorldXYZ(...v3_add(this.xyz, this.roots)),
            scale: [this.size, this.size, this.size]
        });

    }

    validate() {
        const surface = this.wellKnownModel('Surfaces').get(this.key);
        if (!surface || surface.rawElevation(this.roots[0], this.roots[1]) !== this.roots[2]) this.destroy();
    }

    tick(delta) {
        const growth = 0.00002;
        this.size = Math.min(this.maxSize, this.size + growth * delta);
        this.set({scale: [this.size, this.size, this.size]});
        if (this.size < this.maxSize) this.future(500).tick(500);
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

// //------------------------------------------------------------------------------------------
// //-- Timber --------------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// // Fall behaviors need to be merged into a general fall class.

// export class TimberActor extends mix(Actor).with(AM_Smoothed) {
//     init(data) {
//         super.init('TimberPawn');
//         this.startHeight = data.xyz[2];
//         this.setLocation(data.xyz);
//         this.setScale([data.size, data.size, data.size]);
//         this.velocity = -0.003 + this.random()*(-0.001);
//         this.axis = sphericalRandom();
//         this.spin = 0.0001 + this.random() * 0.0009;
//         const delay = 100 * this.random();
//         this.future(delay).tick(delay);
//     }

//     tick(delta) {
//         this.velocity = Math.min(this.velocity + delta * 0.00002, 1);
//         const xyz0 = this.location;
//         const xyz1 = v3_sub(xyz0, [0, 0, this.velocity * delta]);
//         const collision = this.solidCollision(xyz0, xyz1);
//         if (collision || xyz1[2] < 0) { // Collide with a solid voxel or hit the kill plane.
//             // spawn debris pile here
//             this.destroy();
//             return;
//         }
//         this.moveTo(xyz1);
//         this.rotateTo(q_multiply(this.rotation, q_axisAngle(this.axis, this.spin * delta)));
//         this.future(100).tick(100);
//     }

//     // Checks to see if the timber hits a solid voxel while travelling from xyz0 to xyz1
//     // If the timber collides with a solid voxel, returns the voxel's xyz coordinates.

//     solidCollision(xyz0, xyz1) {
//         if (xyz1[2] > this.startHeight) return undefined; // Dan't collide if above start height.
//         const voxel0 = v3_floor(Voxels.toVoxelXYZ(...xyz0));
//         const x = voxel0[0];
//         const y = voxel0[1];
//         let z = voxel0[2];
//         const bottom = Math.floor(xyz1[2] / Voxels.scaleZ);
//         if (z < bottom) return undefined; // Don't collide if moving up.
//         const voxels = this.wellKnownModel('Voxels');
//         do {
//             if (voxels.get(x,y,z)) return [x,y,z];
//         } while (--z > bottom);
//         return undefined;
//     }

// }
// TimberActor.register("TimberActor");

// export class TimberPawn extends mix(Pawn).with(PM_Smoothed, PM_InstancedVisible) {
//     constructor(...args) {
//         super(...args);
//         this.setDrawCall(CachedObject("timberDrawCall", () => this.buildDraw()));
//     }

//     buildDraw() {
//         const mesh = CachedObject("timberMesh", this.buildMesh);
//         const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
//         const draw = new InstancedDrawCall(mesh, material);
//         GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
//         return draw;
//     }

//     buildMaterial() {
//         const material = new Material();
//         material.pass = 'instanced';
//         material.texture.loadFromURL(paper);
//         return material;
//     }

//     buildMesh() {
//         const log = Cylinder(0.5, 5, 7, [0.7, 0.5, 0.3, 1]);
//         log.load();
//         log.clear();
//         return log;
//     }
// }
// TimberPawn.register("TimberPawn");
