import { v3_add, rayTriangleIntersect, ModelService } from "@croquet/worldcore-kernel";
import { Voxels } from "./Voxels";


//------------------------------------------------------------------------------------------
//-- Surfaces ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Stores information about the exposed surfaces of the voxels. This is used both for rendering,
// pathing, and collision detection.

export class Surfaces extends ModelService {

    static types() {
        return { "W3:Surface": Surface };
    }

    init() {
        super.init('Surfaces');
        this.subscribe("voxels", "newLevel", this.rebuildAll);
        this.subscribe("voxels", "changed", this.rebuildLocal);
    }

    set(key, surface) { // Only save the surface if it holds surface data.
        if (surface.shape) {
            this.surfaces.set(key, surface);
        } else {
            this.surfaces.delete(key);
        }
    }

    has(key) {
        return this.surfaces.has(key);
    }

    get(key) {
        return this.surfaces.get(key);
    }

    randomFloor() {
        const keys = [];
        this.surfaces.forEach((surface,key) => { if (surface.hasFloor()) keys.push(key); });
        const n = Math.floor(this.random() * keys.length);
        return keys[n];
    }

    elevation(xyz) {
        const x = Math.floor(xyz[0]);
        const y = Math.floor(xyz[1]);
        const z = Math.floor(xyz[2]);
        const key = Voxels.packKey(x,y,z);
        const s = this.surfaces.get(key);
        // if (!s) return undefined;
        if (!s) return 0;
        return s.elevation(xyz[0] - x, xyz[1] - y);
    }

    rebuildAll() {
        this.buildAll();
        this.publish("surfaces", "newLevel");
    }

    buildAll() {
        const voxels = this.service("Voxels");

        this.surfaces = new Map();
        const surfaces = this.surfaces;

        // Find air voxels adjacent to solid voxels
        const primary = new Set();
        voxels.forEach((type, x, y, z)=> {
            if (type>Voxels.solid) return;
            voxels.forAdjacent(x, y, z, t => {
                if (t>Voxels.solid) primary.add(Voxels.packKey(x, y, z));
            });
        });

        // Find air voxels adjacent to primary air voxels
        const secondary = new Set(primary);
        primary.forEach(key => {
            voxels.forAdjacent(...Voxels.unpackKey(key), (t, x, y, z) => {
                if (t<Voxels.solid) secondary.add(Voxels.packKey(x, y, z));
            });
        });

        primary.forEach(key => {
            const surface = new Surface(key);
            surface.findFaces(voxels);
            surface.findRamps(voxels);
            this.set(key, surface);
        });

        secondary.forEach(key => {
            let surface = this.get(key);
            if (!surface) surface = new Surface(key);
            surface.findFloors(surfaces);
            surface.findTriangles(surfaces);
            this.set(key, surface);
        });

        secondary.forEach(key => {
            let surface = this.get(key);
            if (!surface) surface = new Surface(key);
            surface.findShims(voxels);
            surface.liftFloors();
            this.set(key, surface);
        });
    }

    rebuildLocal(data) {
        this.buildLocal(data.xyz);
    }

    buildLocal(xyz) {
        const voxels = this.service("Voxels");
        const surfaces = this.surfaces;

        const remove = new Set();
        const check = new Set();
        voxels.forBox(xyz, [2,2,1], [5,5,5], (type, x, y, z) => {
            const key = Voxels.packKey(x, y, z);
            this.surfaces.delete(key);
            remove.add(key);
            if (type<Voxels.solid) check.add(key);
        });

        check.forEach(key => {
            const surface = new Surface(key);
            surface.findFaces(voxels);
            surface.findRamps(voxels);
            this.set(key, surface);
        });

        check.forEach(key => {
            let surface = this.get(key);
            if (!surface) surface = new Surface(key);
            surface.findFloors(surfaces);
            surface.findTriangles(surfaces);
            this.set(key, surface);
        });

        check.forEach(key => {
            let surface = this.get(key);
            if (!surface) surface = new Surface(key);
            surface.findShims(voxels);
            surface.liftFloors();
            this.set(key, surface);
        });

        const add = new Set();
        check.forEach(key => {
            if (this.surfaces.has(key)) add.add(key);
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
// model, or to calculate pathing/collision.

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

    constructor(key) {
        this.xyz = Voxels.unpackKey(key);
        this.shape = 0;
        this.facing = 0;
        this.faces = [0,0,0,0,0,0]; // voxel type
        this.sides = [0,0,0,0];     // 0 = solid, 1 = left triangle, 2 = right triangle
    }

    // A double ramp will always have a half flat or shim above it, and vice versa. Together the
    // double ramp + half flat/shim combo forms a dual voxel that has a continuous xy surface.
    // Some calculations depend on knowing if a voxel is part of a dual or not.
    // (For example, the halves of a dual can't both have trees.)

    isDualTop() {
        return (this.shape === 4 || this.shape === 5 );
    }

    isDualBottom() {
        return this.shape === 6;
    }

    hasFloor() {
        return this.shape > 1;
    }

    hidesBelow() {
        return (this.shape === 3 || this.shape === 5 || this.shape === 6 || this.shape === 7 || this.shape === 8 || this.shape === 9 || this.shape === 10 || this.shape === 11);
    }

    // Returns the elevation in voxel coordiates (0 to 1).
    // Returns undefined if there is no surface at this position.
    // (Note that this may cause issues with objects on diagonal seam of shapes 4,5,6)

    // rawElevation(x,y) {

    //     // rotate to facing 0
    //     let xx = x;
    //     let yy = y;
    //     switch (this.facing) {
    //         case 1:
    //             xx = 1-y;
    //             yy = x;
    //             break;
    //         case 2:
    //             xx = 1-x;
    //             yy = 1-y;
    //             break;
    //         case 3:
    //             xx = y;
    //             yy = 1-x;
    //             break;
    //         default:
    //     }

    //     // find elevation based on shape
    //     switch (this.shape) {
    //         case 0:
    //         case 1:
    //             return undefined;
    //         case 2:
    //             return 0;
    //         case 3:
    //             return yy;
    //         case 4:
    //             if (xx + yy < 1) return undefined;
    //             return 0;
    //         case 5:
    //             if (xx + yy < 1) return undefined;
    //             return (xx + yy) - 1;
    //         case 6:
    //             if (xx + yy <= 1) return xx + yy;
    //             return undefined;
    //         case 7:
    //             if (xx + yy < 1) return 0;
    //             return (xx + yy) - 1;
    //         case 8:
    //             if (xx + yy < 1) return 1 - (xx + yy);
    //             return (xx + yy) - 1;
    //         case 9:
    //             return Math.max(0, 1 - (xx + yy), xx - yy);
    //         case 10:
    //             return Math.max(yy, 1 - (xx + yy));
    //         case 11:
    //             return Math.max(yy, xx - yy);
    //         default:
    //     }
    //     return undefined;
    // }

    // Returns the elevation in voxel coordiates (0 to 1).
    // Returns undefined if there is no floor.
    // (Shapes 4,5,6 are half voxels, but they report full voxel elevations to prevent issues with points on the diagonal border.)

    elevation(x,y) {

        // rotate to facing 0
        let xx = x;
        let yy = y;
        switch (this.facing) {
            case 1:
                xx = 1-y;
                yy = x;
                break;
            case 2:
                xx = 1-x;
                yy = 1-y;
                break;
            case 3:
                xx = y;
                yy = 1-x;
                break;
            default:
        }

        // find elevation based on shape
        switch (this.shape) {
            case 0:
            case 1:
                //return 0;
                //return undefined;
                return 0; // remove xxx
            case 2:
                return 0;
            case 3:
                return yy;
            case 4:
                if (xx + yy < 1) return (xx + yy) - 1; // Adding for road stamping
                return 0;
            case 5:
                // if (xx + yy < 1) return 0; // Removed for road stamping
                return (xx + yy) - 1;
            case 6:
                if (xx + yy <= 1) return xx + yy;
                return 1;
            case 7:
                if (xx + yy < 1) return 0;
                return (xx + yy) - 1;
            case 8:
                if (xx + yy < 1) return 1 - (xx + yy);
                return (xx + yy) - 1;
            case 9:
                return Math.max(0, 1 - (xx + yy), xx - yy);
            case 10:
                return Math.max(yy, 1 - (xx + yy));
            case 11:
                return Math.max(yy, xx - yy);
            default:
        }
        return 0;
        // return undefined;
    }

    // Returns true if the voxel is sloping up in the designated direction

    hasNorthRamp() {
        if (this.facing === Voxels.north && (this.shape === 3 || this.shape === 6 || this.shape === 10 || this.shape === 11)) return true;
        if (this.facing === Voxels.west && this.shape === 6) return true;
        return false;
    }

    hasEastRamp() {
        if (this.facing === Voxels.east && (this.shape === 3 || this.shape === 6 || this.shape === 10 || this.shape === 11)) return true;
        if (this.facing === Voxels.north && this.shape === 6) return true;
        return false;
    }

    hasSouthRamp() {
        if (this.facing === Voxels.south && (this.shape === 3 || this.shape === 6 || this.shape === 10 || this.shape === 11)) return true;
        if (this.facing === Voxels.east && this.shape === 6) return true;
        return false;
    }

    hasWestRamp() {
        if (this.facing === Voxels.west && (this.shape === 3 || this.shape === 6 || this.shape === 10 || this.shape === 11)) return true;
        if (this.facing === Voxels.south && this.shape === 6) return true;
        return false;
    }

    // Extracts the face information from the adjacent voxels

    findFaces(voxels) {
        this.shape = 0;
        voxels.forAdjacent(...this.xyz, (type, x, y, z, d) => this.faces[d] = type );
        if (this.faces[0] > Voxels.solid ||
            this.faces[1] > Voxels.solid||
            this.faces[2] > Voxels.solid||
            this.faces[3] > Voxels.solid||
            this.faces[4] > Voxels.solid) this.shape = 1;
        if (this.faces[5] > Voxels.solid) this.shape = 2;
    }

    // Finds the default ramps from the base face information

    findRamps(voxels) {

        // No ramps in base voxels

        if(voxels.get(...this.xyz) === Voxels.base) return;

        const faces = this.faces;

        // No floor or low ceiling = no ramps

        if (faces[Voxels.above] > Voxels.solid || faces[Voxels.below] < Voxels.solid) return;

        // No lava ramps.

        if (faces[Voxels.below] === Voxels.lava) return;

        // Add a ramp if there's a face opposite a non-face.

        let ramp0 = false, ramp1 = false, ramp2 = false, ramp3 = false;

        if (faces[0] > Voxels.solid && faces[2] < Voxels.solid) ramp0 = true;
        if (faces[1] > Voxels.solid && faces[3] < Voxels.solid) ramp1 = true;
        if (faces[2] > Voxels.solid && faces[0] < Voxels.solid) ramp2 = true;
        if (faces[3] > Voxels.solid && faces[1] < Voxels.solid) ramp3 = true;

        // No ramps to nowhere -- ramps must lead up to empty voxels

        if (ramp0) {
            const side = Voxels.adjacent(...this.xyz,Voxels.north);
            const sideAbove = Voxels.adjacent(...side, Voxels.above);
            if (Voxels.isValid(...sideAbove) && voxels.get(...sideAbove) > Voxels.solid) ramp0 = false;
        }

        if (ramp1) {
            const side = Voxels.adjacent(...this.xyz,Voxels.east);
            const sideAbove = Voxels.adjacent(...side, Voxels.above);
            if (Voxels.isValid(...sideAbove) && voxels.get(...sideAbove) > Voxels.solid) ramp1 = false;
        }

        if (ramp2) {
            const side = Voxels.adjacent(...this.xyz,Voxels.south);
            const sideAbove = Voxels.adjacent(...side, Voxels.above);
            if (Voxels.isValid(...sideAbove) && voxels.get(...sideAbove) > Voxels.solid) ramp2 = false;
        }

        if (ramp3) {
            const side = Voxels.adjacent(...this.xyz,Voxels.west);
            const sideAbove = Voxels.adjacent(...side, Voxels.above);
            if (Voxels.isValid(...sideAbove) && voxels.get(...sideAbove) > Voxels.solid) ramp3 = false;
        }

        // No double ramps in tight spaces -- the diagonal voxel adjacent to the base corner of a double ramp must be empty.

        if (ramp0 && ramp1) {
            const south = Voxels.adjacent(...this.xyz,Voxels.south);
            const sw = Voxels.adjacent(...south, Voxels.west);
            if (Voxels.isValid(...sw) && voxels.get(...sw) > Voxels.solid) {
                ramp0 = false;
                ramp1 = false;
            }
        } else if ((ramp1 && ramp2)) {
            const north = Voxels.adjacent(...this.xyz,Voxels.north);
            const nw = Voxels.adjacent(...north, Voxels.west);
            if (Voxels.isValid(...nw) && voxels.get(...nw) > Voxels.solid) {
                ramp1 = false;
                ramp2 = false;
            }
        } else if ((ramp2 && ramp3)) {
            const north = Voxels.adjacent(...this.xyz,Voxels.north);
            const ne = Voxels.adjacent(...north, Voxels.east);
            if (Voxels.isValid(...ne) && voxels.get(...ne) > Voxels.solid) {
                ramp2 = false;
                ramp3 = false;
            }
        } else if ((ramp3 && ramp0)) {
            const south = Voxels.adjacent(...this.xyz,Voxels.south);
            const se = Voxels.adjacent(...south, Voxels.east);
            if (Voxels.isValid(...se) && voxels.get(...se) > Voxels.solid) {
                ramp3 = false;
                ramp0 = false;
            }
        }

        // Change shape to reflect ramps & delete hidden faces

        if (ramp0) {
            faces[0] = 0;
            if (ramp1) {
                faces[1] = 0;
                this.shape = 6;
                this.facing = 0;
            } else if (ramp3) {
                faces[3] = 0;
                this.shape = 6;
                this.facing = 3;
            } else {
                this.shape = 3;
                this.facing = 0;
            }
        } else if (ramp2) {
            faces[2] = 0;
            if (ramp1) {
                faces[1] = 0;
                this.shape = 6;
                this.facing = 1;
            } else if (ramp3) {
                faces[3] = 0;
                this.shape = 6;
                this.facing = 2;
            } else {
                this.shape = 3;
                this.facing = 2;
            }
        } else if (ramp1) {
            faces[1] = 0;
            this.shape = 3;
            this.facing = 1;
        } else if (ramp3) {
            faces[3] = 0;
            this.shape = 3;
            this.facing = 3;
        }
    }

    // Finds the half-flat surfaces at the top of double ramps.

    findFloors(surfaces) {
        const below = Voxels.adjacent(...this.xyz,Voxels.below);
        const belowKey = Voxels.packKey(...below);
        if (!surfaces.has(belowKey)) return;
        const belowSurface = surfaces.get(belowKey);
        if (belowSurface.shape !== 6) return; // Not a double ramp below
        this.shape = 4;
        this.facing = belowSurface.facing;
        this.faces[Voxels.below] = belowSurface.faces[Voxels.below];
    }

    // Find the triangles that block off the gaps at the sides of single and double ramps

    findTriangles(surfaces) {

        const faces = this.faces;
        const sides = this.sides;

        const north = Voxels.adjacent(...this.xyz,Voxels.north);
        const northSurface = surfaces.get(Voxels.packKey(...north));
        if (northSurface) {
            if (northSurface.hasWestRamp() && !this.hasWestRamp()) {
                faces[Voxels.north] = northSurface.faces[Voxels.below];
                sides[Voxels.north] = 1;
                if (this.shape === 0) this.shape = 1;
            } else if (northSurface.hasEastRamp() && !this.hasEastRamp()) {
                faces[Voxels.north] = northSurface.faces[Voxels.below];
                sides[Voxels.north] = 2;
                if (this.shape === 0) this.shape = 1;
            }
        }

        const east = Voxels.adjacent(...this.xyz,Voxels.east);
        const eastSurface = surfaces.get(Voxels.packKey(...east));
        if (eastSurface) {
            if (eastSurface.hasNorthRamp() && !this.hasNorthRamp()) {
                faces[Voxels.east] = eastSurface.faces[Voxels.below];
                sides[Voxels.east] = 1;
                if (this.shape === 0) this.shape = 1;
            } else if (eastSurface.hasSouthRamp() && !this.hasSouthRamp()) {
                faces[Voxels.east] = eastSurface.faces[Voxels.below];
                sides[Voxels.east] = 2;
                if (this.shape === 0) this.shape = 1;
            }
        }

        const south = Voxels.adjacent(...this.xyz,Voxels.south);
        const southSurface = surfaces.get(Voxels.packKey(...south));
        if (southSurface) {
            if (southSurface.hasEastRamp() && !this.hasEastRamp()) {
                faces[Voxels.south] = southSurface.faces[Voxels.below];
                sides[Voxels.south] = 1;
                if (this.shape === 0) this.shape = 1;
            } else if (southSurface.hasWestRamp() && !this.hasWestRamp()) {
                faces[Voxels.south] = southSurface.faces[Voxels.below];
                sides[Voxels.south] = 2;
                if (this.shape === 0) this.shape = 1;
            }
        }

        const west = Voxels.adjacent(...this.xyz,Voxels.west);
        const westSurface = surfaces.get(Voxels.packKey(...west));
        if (westSurface) {
            if (westSurface.hasSouthRamp() && !this.hasSouthRamp()) {
                faces[Voxels.west] = westSurface.faces[Voxels.below];
                sides[Voxels.west] = 1;
                if (this.shape === 0) this.shape = 1;
            } else if (westSurface.hasNorthRamp() && !this.hasNorthRamp()) {
                faces[Voxels.west] = westSurface.faces[Voxels.below];
                sides[Voxels.west] = 2;
                if (this.shape === 0) this.shape = 1;
            }
        }

    }

    // Extrude adjacent ramps into this voxel to create smooth terrain.
    // This uses the previously calculated side data.

    findShims(voxels) {

        // No shims in base voxels

        if(voxels.get(...this.xyz) === Voxels.base) return;

        const sides = this.sides;
        const faces = this.faces;

        if (faces[Voxels.below] < Voxels.solid) return;
        if (faces[Voxels.above] > Voxels.solid) return;

        const left0 = sides[0] === 2;
        const right0 = sides[1] === 1;
        const shim0 = (left0 && right0) || (left0 && faces[1] > Voxels.solid) || (faces[0] > Voxels.solid && right0);

        const left1 = sides[1] === 2;
        const right1 = sides[2] === 1;
        const shim1 = (left1 && right1) || (left1 && faces[2] > Voxels.solid) || (faces[1]> Voxels.solid && right1);

        const left2 = sides[2] === 2;
        const right2 = sides[3] === 1;
        const shim2 = (left2 && right2) || (left2 && faces[3] > Voxels.solid) || (faces[2]> Voxels.solid && right2);

        const left3 = sides[3] === 2;
        const right3 = sides[0] === 1;
        const shim3 = (left3 && right3) || (left3 && faces[0] > Voxels.solid) || (faces[3] > Voxels.solid && right3);

        // Delete hidden triangular faces

        if (this.shape === 2 || this.shape === 3) {
            if (shim0) {
                if (sides[0] === 2) faces[0] = 0;
                if (sides[1] === 1) faces[1] = 0;
            }

            if (shim1) {
                if (sides[1] === 2) faces[1] = 0;
                if (sides[2] === 1) faces[2] = 0;
            }

            if (shim2) {
                if (sides[2] === 2) faces[2] = 0;
                if (sides[3] === 1) faces[3] = 0;
            }

            if (shim3) {
                if (sides[3] === 2) faces[3] = 0;
                if (sides[0] === 1) faces[0] = 0;
            }
        }

        // Update shape of voxel

        if (this.shape === 2) { // Currently flat
            if (shim0) {
                if (shim1) {
                    this.shape = 9;
                    this.facing = 3;
                } else if (shim2) {
                    this.shape = 8;
                    this.facing = 0;
                } else if (shim3) {
                    this.shape = 9;
                    this.facing = 2;
                } else {
                    this.shape = 7;
                    this.facing = 0;
                }
            } else if (shim1) {
                if (shim2) {
                    this.shape = 9;
                    this.facing = 0;
                } else if (shim3) {
                    this.shape = 8;
                    this.facing = 1;
                } else {
                    this.shape = 7;
                    this.facing = 1;
                }
            } else if (shim2) {
                if (shim3) {
                    this.shape = 9;
                    this.facing = 1;
                } else {
                    this.shape = 7;
                    this.facing = 2;
                }
            } else if (shim3) {
                this.shape = 7;
                this.facing = 3;
            }
        } else if (this.shape === 3) { // Currently ramp
            switch (this.facing) {
                case 0:
                    if (shim1) {
                        this.shape = 11;
                    } else if (shim2) {
                        this.shape = 10;
                    }
                    break;
                case 1:
                    if (shim2) {
                        this.shape = 11;
                    } else if (shim3) {
                        this.shape = 10;
                    }
                    break;
                case 2:
                    if (shim3) {
                        this.shape = 11;
                    } else if (shim0) {
                        this.shape = 10;
                    }
                    break;
                case 3:
                    if (shim0) {
                        this.shape = 11;
                    } else if (shim1) {
                        this.shape = 10;
                    }
                    break;
                default:
            }
        }
    }

    // Looks for the special case of a half floor above a double ramp.

    liftFloors() {
        if (this.shape !== 4) return;
        const sides = this.sides;
        switch (this.facing) {
            case 0:
                if (sides[0] === 2 && sides[1] === 1) {
                    this.shape = 5;
                    this.faces[0] = 0;
                    this.faces[1] = 0;
                }
                break;
            case 1:
                if (sides[1] === 2 && sides[2] === 1) {
                    this.shape = 5;
                    this.faces[1] = 0;
                    this.faces[2] = 0;
                }
                break;
            case 2:
                if (sides[2] === 2 && sides[3] === 1) {
                    this.shape = 5;
                    this.faces[2] = 0;
                    this.faces[3] = 0;
                }
                break;
            case 3:
                if (sides[3] === 2 && sides[0] === 1) {
                    this.shape = 5;
                    this.faces[3] = 0;
                    this.faces[0] = 0;
                }
                break;
            default:
        }

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
            case Voxels.above: return this.ceilingTriangles();
            case Voxels.below: return this.floorTriangles();
            case Voxels.north: return this.northTriangles();
            case Voxels.south: return this.southTriangles();
            case Voxels.east: return this.eastTriangles();
            case Voxels.west: return this.westTriangles();
            default:
        }
        return null;
    }

    ceilingTriangles() {
        if (!this.faces[Voxels.above]) return null;
        return [[[0,0,1], [0,1,1], [1,1,1]], [[0,0,1], [1,1,1], [1,0,1]]];
    }

    floorTriangles() {
        switch (this.shape) {
            case 2:
                return [[[0,0,0], [1,0,0], [1,1,0]], [[0,0,0], [1,1,0], [0,1,0]]];
            case 3: // Ramp
                switch (this.facing) {
                    case 0: return [[[0,0,0], [1,0,0], [1,1,1]], [[0,0,0], [1,1,1], [0,1,1]]];
                    case 1: return [[[0,0,0], [1,0,1], [1,1,1]], [[0,0,0], [1,1,1], [0,1,0]]];
                    case 2: return [[[0,0,1], [1,0,1], [1,1,0]], [[0,0,1], [1,1,0], [0,1,0]]];
                    case 3: return [[[0,0,1], [1,0,0], [1,1,0]], [[0,0,1], [1,1,0], [0,1,1]]];
                    default: return null;
                }
            case 4: // Half floor
                switch (this.facing) {
                    case 0: return [[[1,1,0], [0,1,0], [1,0,0]]];
                    case 1: return [[[1,0,0], [1,1,0], [0,0,0]]];
                    case 2: return [[[0,0,0], [1,0,0], [0,1,0]]];
                    case 3: return [[[0,1,0], [0,0,0], [1,1,0]]];
                    default: return null;
                }
            case 5: // Shim
                switch (this.facing) {
                    case 0: return [[[1,1,1], [0,1,0], [1,0,0]]];
                    case 1: return [[[1,0,1], [1,1,0], [0,0,0]]];
                    case 2: return [[[0,0,1], [1,0,0], [0,1,0]]];
                    case 3: return [[[0,1,1], [0,0,0], [1,1,0]]];
                    default: return null;
                }
            case 6: // Double ramp
                switch (this.facing) {
                    case 0: return [[[0,0,0], [1,0,1], [0,1,1]]];
                    case 1: return [[[0,1,0], [0,0,1], [1,1,1]]];
                    case 2: return [[[1,1,0], [0,1,1], [1,0,1]]];
                    case 3: return [[[1,0,0], [1,1,1], [0,0,1]]];
                    default: return null;
                }
            case 7: // Half flat + shim
                switch (this.facing) {
                    case 0: return [[[0,0,0], [1,0,0], [0,1,0]], [[1,1,1], [0,1,0], [1,0,0]]];
                    case 1: return [[[0,1,0], [0,0,0], [1,1,0]], [[1,0,1], [1,1,0], [0,0,0]]];
                    case 2: return [[[1,1,0], [0,1,0], [1,0,0]], [[0,0,1], [1,0,0], [0,1,0]]];
                    case 3: return [[[1,0,0], [1,1,0], [0,0,0]], [[0,1,1], [0,0,0], [1,1,0]]];
                    default: return null;
                }
            case 8: // Butterfly
                switch (this.facing) {
                    case 0:
                    case 2: return [[[0,0,1], [1,0,0], [0,1,0]], [[1,1,1], [0,1,0], [1,0,0]]];
                    case 1:
                    case 3: return [[[0,1,1], [0,0,0], [1,1,0]], [[1,0,1], [1,1,0], [0,0,0]]];
                    default: return null;
                }
            case 9: // Cuban
                switch (this.facing) {
                    case 0: return [[[0.5,0.5,0], [1,1,0], [0,1,0]],
                        [[0.5,0.5,0], [0,1,0], [0,0,1]], [[0.5,0.5,0], [0,0,1], [0.5,0,0.5]],
                        [[0.5,0.5,0], [0.5,0,0.5], [1,0,1]], [[0.5,0.5,0], [1,0,1], [1,1,0]]];
                    case 1: return [[[0.5,0.5,0], [1,0,0], [1,1,0]],
                        [[0.5,0.5,0], [1,1,0], [0,1,1]], [[0.5,0.5,0], [0,1,1], [0,0.5,0.5]],
                        [[0.5,0.5,0], [0,0.5,0.5], [0,0,1]], [[0.5,0.5,0], [0,0,1], [1,0,0]]];
                    case 2: return [[[0.5,0.5,0], [0,0,0], [1,0,0]],
                        [[0.5,0.5,0], [1,0,0], [1,1,1]], [[0.5,0.5,0], [1,1,1], [0.5,1,0.5]],
                        [[0.5,0.5,0], [0.5,1,0.5], [0,1,1]], [[0.5,0.5,0], [0,1,1], [0,0,0]]];
                    case 3: return [[[0.5,0.5,0], [0,1,0], [0,0,0]],
                        [[0.5,0.5,0], [0,0,0], [1,0,1]], [[0.5,0.5,0], [1,0,1], [1,0.5,0.5]],
                        [[0.5,0.5,0], [1,0.5,0.5], [1,1,1]], [[0.5,0.5,0], [1,1,1],  [0,1,0]]];
                    default: return null;
                }
            case 10: // Ramp + left shim
                switch (this.facing) {
                    case 0: return [[[0,0,1], [1,0,0], [0,0.5,0.5]],
                        [[1,1,1], [0,1,1], [0,0.5,0.5]], [[1,1,1], [0,0.5,0.5], [1,0,0]]];
                    case 1: return [[[0,1,1], [0,0,0], [0.5,1,0.5]],
                        [[1,0,1], [1,1,1], [0.5,1,0.5]], [[1,0,1], [0.5,1,0.5], [0,0,0]]];
                    case 2: return [[[1,1,1], [0,1,0], [1,0.5,0.5]],
                        [[0,0,1], [1,0,1], [1,0.5,0.5]], [[0,0,1], [1,0.5,0.5], [0,1,0]]];
                    case 3: return [[[1,0,1], [1,1,0], [0.5,0,0.5]],
                        [[0,1,1], [0,0,1], [0.5,0,0.5]], [[0,1,1], [0.5,0,0.5], [1,1,0]]];
                    default: return null;
                }
            case 11: // Ramp + right shim
                switch (this.facing) {
                    case 0: return [[[1,0,1], [1,0.5,0.5], [0,0,0]],
                        [[1,1,1], [0,1,1], [0,0,0]], [[1,1,1], [0,0,0], [1,0.5,0.5]]];
                    case 1: return [[[0,0,1], [0.5,0,0.5], [0,1,0]],
                        [[1,0,1], [1,1,1], [0,1,0]], [[1,0,1], [0,1,0], [0.5,0,0.5]]];
                    case 2: return [[[0,1,1], [0,0.5,0.5], [1,1,0]],
                        [[0,0,1], [1,0,1], [1,1,0]], [[0,0,1], [1,1,0], [0,0.5,0.5]]];
                    case 3: return [[[1,1,1], [0.5,1,0.5], [1,0,0]],
                        [[0,1,1], [0,0,1], [1,0,0]], [[0,1,1], [1,0,0], [0.5,1,0.5]]];
                    default: return null;
                }
            default:
        }
        return null;
    }

    baseTriangles() {
        return [[[0,0,0], [1,0,0], [1,1,0]], [[0,0,0], [1,1,0], [0,1,0]]];
    }

    northTriangles() {
        if (!this.faces[Voxels.north]) return null;
        switch (this.sides[Voxels.north]) {
            case 0: return [[[0,1,0], [1,1,0], [1,1,1]], [[0,1,0], [1,1,1], [0,1,1]]];
            case 1: return [[[0,1,0], [1,1,0], [0,1,1]]];
            case 2: return [[[0,1,0], [1,1,0], [1,1,1]]];
            default:
        }
        return null;
    }

    eastTriangles() {
        if (!this.faces[Voxels.east]) return null;
        switch (this.sides[Voxels.east]) {
            case 0: return [[[1,1,0], [1,0,0], [1,0,1]], [[1,1,0], [1,0,1], [1,1,1]]];
            case 1: return [[[1,1,0], [1,0,0], [1,1,1]]];
            case 2: return [[[1,1,0], [1,0,0], [1,0,1]]];
            default:
        }
        return null;
    }

    southTriangles() {
        if (!this.faces[Voxels.south]) return null;
        switch (this.sides[Voxels.south]) {
            case 0: return [[[1,0,0], [0,0,0], [0,0,1]], [[1,0,0],[0,0,1],[1,0,1]]];
            case 1: return [[[1,0,0], [0,0,0], [1,0,1]]];
            case 2: return [[[1,0,0], [0,0,0], [0,0,1]]];
            default:
        }
        return null;
    }

    westTriangles() {
        if (!this.faces[Voxels.west]) return null;
        switch (this.sides[Voxels.west]) {
            case 0: return [[[0,0,0], [0,1,0], [0,1,1]], [[0,0,0],[0,1,1],[0,0,1]]];
            case 1: return [[[0,0,0], [0,1,0], [0,0,1]]];
            case 2: return [[[0,0,0], [0,1,0], [0,1,1]]];
            default:
        }
        return null;
    }


    // Returns a 4 array with flags showing if the side of the shape is level.
    // Used for stuff like road exits.
    flatSides() {
        let out = [false, false, false, false];
        switch (this.shape) {
            case 2:
                out = [true, true, true, true];
                break;
            case 3:
                out = [true, false, true, false];
                break;
            case 4:
                out = [true, true, false, false];
                break;
            case 7:
                out = [false, false, true, true];
                break;
            case 9:
                out = [true, false, false, false];
                break;
            case 10:
                out = [true, false, false, false];
                break;
            case 11:
                out = [true, false, false, false];
                break;
            default:
        }
        rot4(out, this.facing);
        return out;
    }

    flatCorners() {
        let out = [false, false, false, false];
        switch (this.shape) {
            case 2:
                out = [true, true, true, true];
                break;
            case 4:
                out = [true, false, false, false];
                break;
            case 6:
                out = [true, false, false, false];
                break;
            case 7:
                out = [false, false, true, false];
                break;
            case 8:
                out = [true, false, true, false];
                break;
            default:
        }
        rot4(out, this.facing);
        return out;
    }

}

export function VoxelBaseTriangles(xyz) {
    const triangles = [[[0,0,0], [1,0,0], [1,1,0]], [[0,0,0], [1,1,0], [0,1,0]]];
    return triangles.map(triangle => {
        return triangle.map(vertex => {
            return v3_add(xyz, vertex);
        });
    });

}

export function IntersectVoxelBase(xyz, start, aim) {
    const triangles = VoxelBaseTriangles(xyz);
    for (let i = 0; i < triangles.length; i++) {
        const intersect = rayTriangleIntersect(start, aim, triangles[i]);
        if (intersect) return intersect;
    }
    return null;
}

// Rotates the values of a 4 array clockwise

function rot4(a, n) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    switch (n) {
        case 1:
            a[0] = a3;
            a[1] = a0;
            a[2] = a1;
            a[3] = a2;
            break;
        case 2:
            a[0] = a2;
            a[1] = a3;
            a[2] = a0;
            a[3] = a1;
            break;
        case 3:
            a[0] = a1;
            a[1] = a2;
            a[2] = a3;
            a[3] = a0;
            break;
        default:
    }
}