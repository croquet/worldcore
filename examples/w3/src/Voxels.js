import { Model } from "@croquet/croquet";
import { PerlinNoise, v3_add, v3_sub, v3_min, v3_max, v3_scale, v3_floor, rayTriangleIntersect, GetNamedModel } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- VoxelColumn ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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
}

//------------------------------------------------------------------------------------------
//-- Voxels --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Voxels extends Model {

    //-- Snapshot Types --

    static types() {
        return { "W3:VoxelColumn": VoxelColumn };
    }

    //-- Constants --

    static get sizeX() { return 8; }
    static get sizeY() { return 8; }
    static get sizeZ() { return 8; }
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
    static get lava()   { return 1; }
    static get rock()   { return 2; }
    static get dirt()   { return 3; }
    static get sand()   { return 4; }
    static get clay()   { return 5; }

    //-- Helper Methods --

    static isValid(x, y, z) {
        if (x < 0) return false;
        if (x >= Voxels.sizeX) return false;
        if (y < 0) return false;
        if (y >= Voxels.sizeY) return false;
        if (z < 0) return false;
        if (z >= Voxels.sizeZ) return false;
        return true;
    }

    static canEdit(x, y, z) {
        if (x < 0) return false;
        if (x >= Voxels.sizeX) return false;
        if (y < 0) return false;
        if (y >= Voxels.sizeY) return false;
        if (z < 1) return false;
        if (z >= Voxels.sizeZ-1) return false;
        return true;
    }

    static packKey(x,y,z) {
        return (((x << 10) | y) << 10) | z;
    }

    static unpackKey(key) {
        const y = key >>> 10;
        const x = y >>> 10;
        return [x & 0x3FF, y & 0x3FF, key & 0x3FF];
    }

    // static adjacent(x,y,z, direction) {
    //     const out = [x,y,z];
    //     switch (direction) {
    //         case 0: // North
    //             out[1]++;
    //             break;
    //         case 1: // East
    //             out[0]++;
    //             break;
    //         case 2: // South
    //             out[1]--;
    //             break;
    //         case 3: // West
    //             out[0]--;
    //             break;
    //         case 4: // Above
    //             out[2]++;
    //             break;
    //         case 5: // Below
    //             out[2]--;
    //             break;
    //         case 6: // NorthEast
    //             out[0]++;
    //             out[1]++;
    //             break;
    //         case 7: // SouthEast
    //             out[0]++;
    //             out[1]--;
    //             break;
    //         case 8: // SouthWest
    //             out[0]--;
    //             out[1]--;
    //             break;
    //         case 9: // NorthWest
    //             out[0]--;
    //             out[1]++;
    //             break;
    //             default:
    //     }
    //     return out;
    // }

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

    // static toWorldXYZ(x,y,z) {
    //     return [x * Voxels.scaleX, y * Voxels.scaleY, z * Voxels.scaleZ];
    // }

    // static toVoxelXYZ(x,y,z) {
    //     return [x / Voxels.scaleX, y / Voxels.scaleY, z / Voxels.scaleZ];
    // }

    // // Given a set of voxel ids, expands it by one in every direction including diagonally.
    // static expandIDSet(set) {
    //     const out = new Set();
    //     set.forEach(id => Voxels.expandID(id).forEach(idd => out.add(idd)));
    //     return out;
    // }

    // Given a voxel id, returns a set expanded by one in every direction including diagonally.
    // static expandID(id) {
    //     const out = new Set();
    //     const xyz = Voxels.unpackID(id);
    //     const x0 = Math.max(xyz[0]-1, 0);
    //     const x1 = Math.min(xyz[0]+1, 64);
    //     const y0 = Math.max(xyz[1]-1, 0);
    //     const y1 = Math.min(xyz[1]+1, Voxels.sizeY-1);
    //     const z0 = Math.max(xyz[2]-1, 0);
    //     const z1 = Math.min(xyz[2]+1, Voxels.sizeZ-1);
    //     for (let x = x0; x <= x1; x++) {
    //         for (let y = y0; y <= y1; y++) {
    //             for (let z = z0; z <= z1; z++) {
    //                 out.add(Voxels.packID(x,y,z));
    //             }
    //         }
    //     }
    //     return out;
    // }

    //-- Class Methods --

    init() {
        super.init();
        this.beWellKnownAs('Voxels');
        this.voxels = Array.from(Array(Voxels.sizeX), ()=>Array.from(Array(Voxels.sizeY), ()=>new VoxelColumn()));
        // this.subscribe("hud", "newLevel", () => this.generate());
        this.subscribe("editor", "setVoxel", data => this.set(...data.xyz, data.type));
    }

    get(x, y, z) {
        return this.voxels[x][y].get(z);
    }

    set(x, y, z, type) {
        const column = this.voxels[x][y];
        const old = column.get(z);
        if (type === old || !column.set(z, type)) return false;
        this.publish("voxels", "changed", {x, y, z, type, old});
        return true;
    }

    generate() {
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                this.voxels[x][y].compress([1,2,2,3,0,0,0,0]);
            }
        }
        this.set(0,0,3,Voxels.air);
        this.set(3,3,4,Voxels.dirt);
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

    // // Executes a callback for every voxel in a box around xyz.
    // // Offset is subtracted from xyz to find start, and size is dimensions of box
    // // Callback arguments are (type, x, y, z)

    // forBox(xyz, offset, size, callback) {
    //     const start = v3_sub(xyz, offset);
    //     const xyz0 = v3_max([0,0,0], start);
    //     const xyz1 = v3_min([Voxels.sizeX, Voxels.sizeY, Voxels.sizeZ], v3_add(start, size));
    //     for (let x = xyz0[0]; x < xyz1[0]; x++) {
    //         for (let y = xyz0[1]; y < xyz1[1]; y++) {
    //             const expanded = this.voxels[x][y].expand();
    //             for (let z = xyz0[2]; z < xyz1[2]; z++) {
    //                 callback(expanded[z], x, y, z);
    //             }
    //         }
    //     }
    // }




}
Voxels.register("Voxels");

//------------------------------------------------------------------------------------------
//-- FilteredVoxelRaycast ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns a list of voxel XYZ's along a ray.  It is clipped so it only includes voxels
// that are actually in the world tile.

export function FilteredVoxelRaycast(start, aim) {
    return VoxelRaycast(start, aim).filter(xyz => {
        return Voxels.isValid(...xyz);
    });
}

//------------------------------------------------------------------------------------------
//-- VoxelRaycast --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns a list voxel XYZ's along the ray. The list starts with the voxel containing the
// start point, and ends with the last voxel on the far side of the world tile.  Depending on
// the start and aim vectors, it may return invalid voxels that lie outside the world tile.
//
// start = [x, y, z] in voxel coordinates.
// aim = [x, y, z] a vector pointing away from the start point.
//
// Fractional coordinates in the start point are handled correctly.  0.5 is the voxel midpoint.
// The aim vector does not need to be normalized.
//
// Algorithm is modified Bresenham. It iterates along the long axis and steps to the side as
// needed as differential sums accumulate.

export function VoxelRaycast(start, aim) {

    // Find the starting voxel

    let x = Math.floor(start[0]);
    let y = Math.floor(start[1]);
    let z = Math.floor(start[2]);

    // Find the major axis

    const absAim = aim.map(a => Math.abs(a));
    const maxAim = Math.max(...absAim);
    const axis = absAim.indexOf(maxAim);

    const result = [[x, y, z]];

    if (maxAim === 0) return result; // Special case of zero-length aim vector

    let xStep = -1;
    let yStep = -1;
    let zStep = -1;

    switch (axis) {

        // ---------- X Axis --------------------------------------------------

        case 0: {
                let stepCount = x+1;
                let offset = (x + 1) - start[0];
                if (aim[0] > 0) {
                    xStep = 1;
                    stepCount = (Voxels.sizeX) - x;
                    offset = start[0] - x;
                }

                const dy = xStep * aim[1] / aim[0];
                if (dy > 0) yStep = 1;

                const dz = xStep * aim[2] / aim[0];
                if (dz > 0) zStep = 1;

                let y0 = (start[1] - y) - dy * offset;
                let z0 = (start[2] - z) - dz * offset;

                for (let i = 0; i < stepCount; i++) { // Run along x axis

                    // Increment y differential
                    let yt = 0;
                    let y1 = y0 + dy;
                    if (y1 < 0) { // Underflow
                        y1++;
                        yt = (y1 - 1) / dy;
                    } else if (y1 > 1) {  // Overflow
                        y1--;
                        yt = y1 / dy;
                    }

                    // Increment z differential
                    let zt = 0;
                    let z1 = z0 + dz;
                    if (z1 < 0) { // Underflow
                        z1++;
                        zt = (z1 - 1) / dz;
                    } else if (z1 > 1) { // Overflow
                        z1--;
                        zt = z1 / dz;
                    }

                    // Step to side if an underflow or overflow occured

                    if (yt > 0 && zt > 0) { // Step both y & z
                        if (zt > yt) { // z first, then y
                            z += zStep;
                            result.push([x, y, z]);
                            y += yStep;
                            result.push([x, y, z]);
                        } else { // y first, the z
                            y += yStep;
                            result.push([x, y, z]);
                            z += zStep;
                            result.push([x, y, z]);
                        }
                    } else if (yt > 0) {
                        y += yStep;
                        result.push([x, y, z]);
                    } else if (zt > 0) {
                        z += zStep;
                        result.push([x, y, z]);
                    }
                    y0 = y1;
                    z0 = z1;

                    // Step forward
                    x += xStep;
                    result.push([x, y, z]);
                }
            break;
        }

        // ---------- Y Axis --------------------------------------------------

        case 1: {
            let stepCount = y+1;
            let offset = (y + 1) - start[1];
            if (aim[1] > 0) {
                yStep = 1;
                stepCount = (Voxels.sizeY) - y;
                offset = start[1] - y;
            }

            const dx = yStep * aim[0] / aim[1];
            if (dx > 0) xStep = 1;

            const dz = yStep * aim[2] / aim[1];
            if (dz > 0) zStep = 1;

            let x0 = (start[0] - x) - dx * offset;
            let z0 = (start[2] - z) - dz * offset;

            for (let i = 0; i < stepCount; i++) { // Run along y axis

                // Increment x differential
                let xt = 0;
                let x1 = x0 + dx;
                if (x1 < 0) { // Underflow
                    x1++;
                    xt = (x1 - 1) / dx;
                } else if (x1 > 1) {  // Overflow
                    x1--;
                    xt = x1 / dx;
                }

                // Increment z differential
                let zt = 0;
                let z1 = z0 + dz;
                if (z1 < 0) { // Underflow
                    z1++;
                    zt = (z1 - 1) / dz;
                } else if (z1 > 1) { // Overflow
                    z1--;
                    zt = z1 / dz;
                }

                // Step to side if an underflow or overflow occured

                if (xt > 0 && zt > 0) { // Step both x & z
                    if (zt > xt) { // z first, then x
                        z += zStep;
                        result.push([x, y, z]);
                        x += xStep;
                        result.push([x, y, z]);
                    } else { // x first, the z
                        x += xStep;
                        result.push([x, y, z]);
                        z += zStep;
                        result.push([x, y, z]);
                    }
                } else if (xt > 0) {
                    x += xStep;
                    result.push([x, y, z]);
                } else if (zt > 0) {
                    z += zStep;
                    result.push([x, y, z]);
                }
                x0 = x1;
                z0 = z1;

                // Step forward
                y += yStep;
                result.push([x, y, z]);
            }
            break;
        }

        // ---------- Z Axis --------------------------------------------------

        case 2: {
            let stepCount = z+1;
            let offset = (z + 1) - start[2];
            if (aim[2] > 0) {
                zStep = 1;
                stepCount = (Voxels.sizeZ) - z;
                offset = start[2] - z;
            }

            const dx = zStep * aim[0] / aim[2];
            if (dx > 0) xStep = 1;

            const dy = zStep * aim[1] / aim[2];
            if (dy > 0) yStep = 1;

            let x0 = (start[0] - x) - dx * offset;
            let y0 = (start[1] - y) - dy * offset;

            for (let i = 0; i < stepCount; i++) { // Run along z axis

                // Increment x differential
                let xt = 0;
                let x1 = x0 + dx;
                if (x1 < 0) { // Underflow
                    x1++;
                    xt = (x1 - 1) / dx;
                } else if (x1 > 1) {  // Overflow
                    x1--;
                    xt = x1 / dx;
                }

                // Increment y differential
                let yt = 0;
                let y1 = y0 + dy;
                if (y1 < 0) { // Underflow
                    y1++;
                    yt = (y1 - 1) / dy;
                } else if (y1 > 1) { // Overflow
                    y1--;
                    yt = y1 / dy;
                }

                // Step to side if an underflow or overflow occured

                if (xt > 0 && yt > 0) { // Step both x & y
                    if (yt > xt) { // y first, then x
                        y += yStep;
                        result.push([x, y, z]);
                        x += xStep;
                        result.push([x, y, z]);
                    } else { // x first, then y
                        x += xStep;
                        result.push([x, y, z]);
                        y += yStep;
                        result.push([x, y, z]);
                    }
                } else if (xt > 0) {
                    x += xStep;
                    result.push([x, y, z]);
                } else if (yt > 0) {
                    y += yStep;
                    result.push([x, y, z]);
                }
                x0 = x1;
                y0 = y1;

                // Step forward
                z += zStep;
                result.push([x, y, z]);
            }
            break;
        }
        // no default
    }
    return result;
}