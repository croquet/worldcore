import { v3_add, rayTriangleIntersect, Model } from "@croquet/worldcore";
import { Voxels } from "./Voxels";


//------------------------------------------------------------------------------------------
//-- Surfaces ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Surfaces extends Model {

    //-- Snapshot Types --

    static types() {
        return { "W3:Surface": Surface };
    }

    init() {
        super.init();
        this.beWellKnownAs("Surfaces");
        this.buildAll();
        this.subscribe("voxels", "newLevel", this.rebuildAll);
        this.subscribe("voxels", "changed", this.rebuildLocal);
    }

    set(id, surface) { // Only save the surface if it holds surface data.
        if (surface.shape) {
            this.surfaces.set(id, surface);
        } else {
            this.surfaces.delete(id);
        }
    }

    has(id) {
        return this.surfaces.has(id);
    }

    get(id) {
        return this.surfaces.get(id);
    }

    rebuildAll() {
        this.buildAll();
        this.publish("surfaces", "newLevel");
    }

    buildAll() {
        console.log("Building surfaces ....");
        const voxels = this.wellKnownModel("Voxels");
        this.surfaces = new Map();
        // const surfaces = this.surfaces;

        // Find air voxels adjacent to solid voxels
        const primary = new Set();
        voxels.forEach((type, x, y, z)=> {
            if (type) return;
            voxels.forAdjacent(x, y, z, t => {
                if (t) primary.add(Voxels.packID(x, y, z));
            });
        });

        // Find air voxels adjacent to primary air voxels
        const secondary = new Set(primary);
        primary.forEach(id => {
            voxels.forAdjacent(...Voxels.unpackID(id), (t, x, y, z) => {
                if (!t) secondary.add(Voxels.packID(x, y, z));
            });
        });

        primary.forEach(id => {
            const surface = new Surface(id);
            surface.findFaces(voxels);
            this.set(id, surface);
        });

    }

    rebuildLocal(data) {
        this.buildLocal(data.xyz);
    }

    buildLocal(xyz) {
        const voxels = this.wellKnownModel("modelRoot").voxels;
        const surfaces = this.surfaces;

        const remove = new Set();
        const check = new Set();
        voxels.forBox(xyz, [2,2,1], [5,5,5], (type, x, y, z) => {
            const id = Voxels.packID(x, y, z);
            this.surfaces.delete(id);
            remove.add(id);
            if (!type) check.add(id);
        });

        check.forEach(id => {
            const surface = new Surface(id);
            surface.findFaces(voxels);
            this.set(id, surface);
        });

        const add = new Set();
        check.forEach(id => {
            if (this.surfaces.has(id)) add.add(id);
        });

        this.publish("surfaces", "changed", {add, remove});

    }
}
Surfaces.register("Surfaces");


//------------------------------------------------------------------------------------------
//-- Surface -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A surface is an air voxel adjacent to a solid voxel. It holds information
// about the shape of its bounding surfaces. This can be used to create a render
// model, or to calculate pathing.

// -- Shapes --
//
// 0 = null
// 1 = sides/ceiling only
// 2 = flat
// 3 = ramp
// 4 = half flat
// 5 = shim
// 6 = double ramp (ramp + ramp)
// 7 = wedge (half flat + shim)
// 8 = butterfly (shim + shim)
// 9 = cuban (shim + shim)
// 10 = left skew (ramp + left shim)
// 11 = right skew (ramp + right shim)

export class Surface  {

    constructor(vid) {
        this.xyz = Voxels.unpackID(vid);
        this.shape = 0; // can be eliminated
        this.faces = [0,0,0,0,0,0]; // voxel type
    }

    // Extracts the face information from the adjacent voxels

    findFaces(voxels) {
        this.shape = 0;
        voxels.forAdjacent(...this.xyz, (type, x, y, z, d) => this.faces[d] = type );
        if (this.faces[0] || this.faces[1] || this.faces[2] || this.faces[3] || this.faces[4]) this.shape = 1;
        if (this.faces[5]) this.shape = 2;
    }

    // Converts a list of triangles in local surface space to voxel space by adding the
    // surface's xyz coorindates.

    toVoxelSpace(triangles) {
        if (!triangles) return null;
        return triangles.map(triangle => {
            return triangle.map(vertex => {
                return v3_add(this.xyz, vertex);
            });
        });
    }

    intersect(start, aim, direction) {
        if (direction === Voxels.above) return null;
        const triangles = this.toVoxelSpace(this.triangles(direction));
        if (!triangles) return null;
        for (let i = 0; i < triangles.length; i++) {
            const intersect = rayTriangleIntersect(start, aim, triangles[i]);
            if (intersect) return intersect;
        }
        return null;
    }

    intersectBase(start, aim) {
        const triangles = this.toVoxelSpace(this.baseTriangles());
        if (!triangles) return null;
        for (let i = 0; i < triangles.length; i++) {
            const intersect = rayTriangleIntersect(start, aim, triangles[i]);
            if (intersect) return intersect;
        }
        return null;
    }

    triangles(direction) {
        switch (direction) {
            case Voxels.below: return this.floorTriangles();
            case Voxels.north: return this.northTriangles();
            case Voxels.south: return this.southTriangles();
            case Voxels.east: return this.eastTriangles();
            case Voxels.west: return this.westTriangles();
            default:
        }
        return null;
    }

    floorTriangles() {
        return [[[0,0,0], [1,0,0], [1,1,0]], [[0,0,0], [1,1,0], [0,1,0]]];
    }

    baseTriangles() {
        return [[[0,0,0], [1,0,0], [1,1,0]], [[0,0,0], [1,1,0], [0,1,0]]];
    }

    northTriangles() {
        if (!this.faces[Voxels.north]) return null;
        return [[[0,1,0], [1,1,0], [1,1,1]], [[0,1,0], [1,1,1], [0,1,1]]];
    }

    eastTriangles() {
        if (!this.faces[Voxels.east]) return null;
        return [[[1,1,0], [1,0,0], [1,0,1]], [[1,1,0], [1,0,1], [1,1,1]]];
    }

    southTriangles() {
        if (!this.faces[Voxels.south]) return null;
        return [[[1,0,0], [0,0,0], [0,0,1]], [[1,0,0],[0,0,1],[1,0,1]]];
    }

    westTriangles() {
        if (!this.faces[Voxels.west]) return null;
        return [[[0,0,0], [0,1,0], [0,1,1]], [[0,0,0],[0,1,1],[0,0,1]]];
    }

}
