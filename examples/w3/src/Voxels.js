import { v3_add, v3_sub, v3_min, v3_max, v3_floor, ModelService } from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- VoxelColumn ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Each column of voxels is stored as a run-length-encoded array. We keep them compressed
// all the time so they don't take up a huge block of memory.

export class VoxelColumn {
    constructor() {
        this.c = new Uint8Array([Voxels.sizeZ]);
        this.t = new Uint8Array([0]);
    }

    set(z, type) {
        const expand = this.expand();
        if (expand[z] === type) return false;
        expand[z] = type;
        this.compress(expand);
        return true;
    }

    get(z) {
        return this.t[this.c.findIndex(count => { z -= count; return z<0; })];
    }

    expand() {
        let start = 0, end = 0, n = 0;
        const out = new Array(Voxels.sizeZ);
        this.c.forEach(c => {
            end = start + c;
            out.fill(this.t[n++], start, end);
            start = end;
        });
        return out;
    }

    compress(source) {
        let n = 1;
        let previous = source[0];
        source.forEach(entry => {
            if (entry !== previous) n++;
            previous = entry;
        });
        this.c = new Uint8Array(n);
        this.t = new Uint8Array(n);
        n = 0;
        previous = source[0];
        let count = 0;
        source.forEach(entry => {
            if (entry !== previous) {
                this.c[n] = count;
                this.t[n] = previous;
                count = 0;
                n++;
                previous = entry;
            }
            count++;
        });
        this.c[n] = count;
        this.t[n] = previous;
    }

    store() {
        return [[...this.c], [...this.t]];
    }

    restore([c, t]) {
        this.c = new Uint8Array(c);
        this.t = new Uint8Array(t);
    }
}

//------------------------------------------------------------------------------------------
//-- Voxels --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The voxels themselves are stored as a 2d array of compressed columns.

export class Voxels extends ModelService {

    //-- Snapshot Types --

    static types() {
        return { "W3:VoxelColumn": VoxelColumn };
    }

    //-- Constants --

    static get sizeX() { return 64; }
    static get sizeY() { return 64; }
    static get sizeZ() { return 32; }
    static get size() { return [Voxels.sizeX, Voxels.sizeY, Voxels.sizeZ]; }

    static get scaleX() { return 5; }
    static get scaleY() { return 5; }
    static get scaleZ() { return 3; }
    static get scale() { return [Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ]; }

    //-- Directions --

    static get north() { return 0; }
    static get east() { return 1; }
    static get south() { return 2; }
    static get west() { return 3; }
    static get above() { return 4; }
    static get below() { return 5; }
    static get northEast() { return 6; }
    static get southEast() { return 7; }
    static get southWest() { return 8; }
    static get northWest() { return 9; }

    //-- Voxel Types --

    static get air()    { return 0; }
    static get base()   { return 1; } // Acts like air, but doesn't smooth terrain
    static get solid()  { return 2; } // Unused -- dividing line between air and ground.
    static get lava()   { return 3; }
    static get rock()   { return 4; }
    static get dirt()   { return 5; }
    static get sand()   { return 6; }
    static get clay()   { return 7; }

    //-- Helper Methods --

    // True if coordinates are inside the voxel volume.
    static isValid(x, y, z) {
        if (x < 0) return false;
        if (x >= Voxels.sizeX) return false;
        if (y < 0) return false;
        if (y >= Voxels.sizeY) return false;
        if (z < 0) return false;
        if (z >= Voxels.sizeZ) return false;
        return true;
    }

    // The top and bottom layer of voxels can't be changed to keep edge conditions simple.
    static canEdit(x, y, z) {
        if (x < 0) return false;
        if (x >= Voxels.sizeX) return false;
        if (y < 0) return false;
        if (y >= Voxels.sizeY) return false;
        if (z < 1) return false;
        if (z >= Voxels.sizeZ-1) return false;
        return true;
    }

    // Converts xyz coordinations to/from a 30-bit key value.
    static packKey(x,y,z) {
        return (((x << 10) | y) << 10) | z;
    }

    static unpackKey(key) {
        const y = key >>> 10;
        const x = y >>> 10;
        return [x & 0x3FF, y & 0x3FF, key & 0x3FF];
    }

    // Finds xyz coordinates of adjacent voxels
    static adjacent(x,y,z, direction) {
        const out = [x,y,z];
        switch (direction) {
            case 0: // North
                out[1]++;
                break;
            case 1: // East
                out[0]++;
                break;
            case 2: // South
                out[1]--;
                break;
            case 3: // West
                out[0]--;
                break;
            case 4: // Above
                out[2]++;
                break;
            case 5: // Below
                out[2]--;
                break;
            case 6: // NorthEast
                out[0]++;
                out[1]++;
                break;
            case 7: // SouthEast
                out[0]++;
                out[1]--;
                break;
            case 8: // SouthWest
                out[0]--;
                out[1]--;
                break;
            case 9: // NorthWest
                out[0]--;
                out[1]++;
                break;
                default:
        }
        return out;
    }

    // Executes a callback for every valid adjacent xyz. Callback arguments are (x, y, z, direction)
    // (Does not look up the contents of the voxel.)

    // static forValidAdjacent(x, y, z, callback) {
    //     const x0 = x-1, x1 = x+1;
    //     const y0 = y-1, y1 = y+1;
    //     const z0 = z-1, z1 = z+1;
    //     if (x0 >= 0) callback(x0, y, z, 3);             // West
    //     if (x1 < Voxels.sizeX) callback(x1, y, z, 1);   // East
    //     if (y0 >= 0) callback(x, y0, z, 2);             // South
    //     if (y1 < Voxels.sizeY) callback(x, y1, z, 0);   // North
    //     if (z0 >= 0) callback(x, y, z0, 5);             // Below
    //     if (z1 < Voxels.sizeZ) callback(x, y, z1, 4);   // Above
    // }

    // static baseTriangles(x,y,z) {
    //     return [[[x,y,z], [x+1,y,z], [x+1,y+1,z]], [[x,y,z], [x+1,y+1,z], [x,y+1,z]]];
    // }

    // static intersectBase(x, y, z, start, aim) {
    //     const triangles = Voxels.baseTriangles(x,y,z);
    //     if (!triangles) return null;
    //     for (let i = 0; i < triangles.length; i++) {
    //         const intersect = rayTriangleIntersect(start, aim, triangles[i]);
    //         if (intersect) return intersect;
    //     }
    //     return null;
    // }

    // Converst from voxel space to world space
    static toWorldXYZ(x,y,z) {
        return [x * Voxels.scaleX, y * Voxels.scaleY, z * Voxels.scaleZ];
    }

    // Coverts from world space to voxel space
    static toVoxelXYZ(x,y,z) {
        return [x / Voxels.scaleX, y / Voxels.scaleY, z / Voxels.scaleZ];
    }

    // Returns the voxel containing an arbitrary point in world space
    static toClippedVoxelXYZ(x,y,z) {
        return v3_floor(this.toVoxelXYZ(x,y,z));
    }

    // Given a set of voxel keys, expands it by one in every direction including diagonally.
    static expandKeySet(set) {
        const out = new Set();
        set.forEach(key => Voxels.expandKey(key).forEach(subKey => out.add(subKey)));
        return out;
    }

    // Given a voxel key, returns a set expanded by one in every direction including diagonally.
    static expandKey(key) {
        const out = new Set();
        const xyz = Voxels.unpackKey(key);
        const x0 = Math.max(xyz[0]-1, 0);
        const x1 = Math.min(xyz[0]+1, 64);
        const y0 = Math.max(xyz[1]-1, 0);
        const y1 = Math.min(xyz[1]+1, Voxels.sizeY-1);
        const z0 = Math.max(xyz[2]-1, 0);
        const z1 = Math.min(xyz[2]+1, Voxels.sizeZ-1);
        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                for (let z = z0; z <= z1; z++) {
                    out.add(Voxels.packKey(x,y,z));
                }
            }
        }
        return out;
    }

    //-- Class Methods --

    init() {
        super.init('Voxels');
        this.voxels = Array.from(Array(Voxels.sizeX), ()=>Array.from(Array(Voxels.sizeY), ()=>new VoxelColumn()));
        this.subscribe("editor", "setVoxel", data => this.set(...data.xyz, data.type));
    }

    get(x, y, z) {
        return this.voxels[x][y].get(z);
    }

    set(x, y, z, type) {
        const column = this.voxels[x][y];
        const old = column.get(z);
        if (type === old || !column.set(z, type)) return false;
        this.publish("voxels", "changed", {xyz:[x, y, z], type, old});
        return true;
    }

    load(matrix) {
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                this.voxels[x][y].compress(matrix[x][y]);
            }
        }
        this.publish("voxels", "newLevel");
    }

    store() {
        return this.voxels.map(x => x.map(y => y.store()));
    }

    restore(data) {
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                this.voxels[x][y].restore(data[x][y]);
            }
        }
        this.publish("voxels", "newLevel");
    }

    // Execultes a callback for every voxel. Callback arguments are (type, x, y, z)

    forEach(callback) {
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                const expanded = this.voxels[x][y].expand();
                expanded.forEach((type, z) => callback(type, x, y, z));
            }
        }
    }

    // // Executes a callback for every adjacent voxel. Callback arguments are (type, x, y, z, direction)

    forAdjacent(x, y, z, callback) {
        const x0 = x-1, x1 = x+1;
        const y0 = y-1, y1 = y+1;
        const z0 = z-1, z1 = z+1;
        if (x0 >= 0) callback(this.get(x0, y, z), x0, y, z, 3);             // West
        if (x1 < Voxels.sizeX) callback(this.get(x1, y, z), x1, y, z, 1);   // East
        if (y0 >= 0) callback(this.get(x, y0, z), x, y0, z, 2);             // South
        if (y1 < Voxels.sizeY) callback(this.get(x, y1, z), x, y1, z, 0);   // North
        if (z0 >= 0) callback(this.get(x, y, z0), x, y, z0, 5);             // Below
        if (z1 < Voxels.sizeZ) callback(this.get(x, y, z1), x, y, z1, 4);   // Above
    }

    // // Executes a callback for every horizontally adjacent voxel. Callback arguments are (type, x, y, z, direction)

    // forHorizontallyAdjacent(x, y, z, callback) {
    //     const x0 = x-1, x1 = x+1;
    //     const y0 = y-1, y1 = y+1;
    //     if (x0 >= 0) callback(this.get(x0, y, z), x0, y, z, 3);             // West
    //     if (x1 < Voxels.sizeX) callback(this.get(x1, y, z), x1, y, z, 1);   // East
    //     if (y0 >= 0) callback(this.get(x, y0, z), x, y0, z, 2);             // South
    //     if (y1 < Voxels.sizeY) callback(this.get(x, y1, z), x, y1, z, 0);   // North
    // }

    // Executes a callback for every voxel in a box around xyz.
    // Offset is subtracted from xyz to find start, and size is dimensions of box
    // Callback arguments are (type, x, y, z)

    forBox(xyz, offset, size, callback) {
        const start = v3_sub(xyz, offset);
        const xyz0 = v3_max([0,0,0], start);
        const xyz1 = v3_min([Voxels.sizeX, Voxels.sizeY, Voxels.sizeZ], v3_add(start, size));
        for (let x = xyz0[0]; x < xyz1[0]; x++) {
            for (let y = xyz0[1]; y < xyz1[1]; y++) {
                const expanded = this.voxels[x][y].expand();
                for (let z = xyz0[2]; z < xyz1[2]; z++) {
                    callback(expanded[z], x, y, z);
                }
            }
        }
    }

}
Voxels.register("Voxels");


