import { GetNamedView, v3_divide, v2_add, v2_sub, v2_multiply, v3_sub, v3_normalize } from "@croquet/worldcore";
import { Voxels } from './Voxels';

// export function PickEmptyVoxel(xy) {
//     const pick = PickVoxel(xy);
//     if (!pick.xyz) return null;

//     const xyz = [...pick.xyz];
//     if (pick.isSolid) return xyz;

//     const id = Voxels.packID(...xyz);
//     const viewRoot = GetNamedView('ViewRoot');
//     const surfaces = viewRoot.model.surfaces;
//     const surface = surfaces.get(id);

//     switch (pick.direction) {
//         case Voxels.north:
//             if (surface.sides[Voxels.north]) xyz[1] += 1;
//             break;
//         case Voxels.south:
//             if (surface.sides[Voxels.south]) xyz[1] -= 1;
//             break;
//         case Voxels.east:
//             if (surface.sides[Voxels.east]) xyz[0] += 1;
//             break;
//         case Voxels.west:
//             if (surface.sides[Voxels.west]) xyz[0] -= 1;
//             break;
//         case Voxels.below:
//             if (surface.shape === 4 || surface.shape === 5) xyz[2] -= 1;
//             break;
//         default:
//     }

//     return xyz;

// }

// export function PickSolidVoxel(xy) {
//     const pick = PickVoxel(xy);
//     if (!pick.xyz) return null;

//     const xyz = [...pick.xyz];

//     if (pick.isSolid) {
//         xyz[2] -= 1;
//         return xyz;
//     }

//     switch (pick.direction) {
//         case Voxels.north:
//             xyz[1] += 1;
//             break;
//         case Voxels.south:
//             xyz[1] -= 1;
//             break;
//         case Voxels.east:
//             xyz[0] += 1;
//             break;
//         case Voxels.west:
//             xyz[0] -= 1;
//             break;
//         case Voxels.above:
//             xyz[2] += 1;
//             break;
//         case Voxels.below:
//             xyz[2] -= 1;
//             break;
//         default:
//     }

//     const viewRoot = GetNamedView('ViewRoot');
//     const voxels = viewRoot.model.voxels;
//     const type = voxels.get(...xyz);
//     if (!type) xyz[2] -= 1;

//     return xyz;
// }

//------------------------------------------------------------------------------------------
//-- PickVoxel -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given xy in screen coordinates, it returns an object with information about the voxel
// that's being pointed at:

// * xyz -- the coordinates of the voxel
// * intersect -- the exact point in voxel space that's being picked
// * direction -- the orientation of the surface selected
// * isSolid -- thrue if the selected voxel is solid (only possible during cutaways, direction always down)
//
// Unless you're picking solid voxel during a cutaway, the picked voxel will always be an air
// voxel with an entry in the surface database.
//
// xyz = null means no voxel was selected.

export function PickBase(xy) {
    const viewRoot =  GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);


    if (aim[2] >= 0) return null;
    const scale = start[2]/aim[2];

    const out = [start[0] - aim[0] * scale, start[1] - aim[1] * scale, 0];

    return out;
}

export function PickSolidVoxel(xy) {
    const viewRoot =  GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;
    const topLayer = viewRoot.topLayer;
    const voxels = viewRoot.model.voxels;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);
    if (raycast.length === 0 ) return null;

    const xyz = raycast.find(rc => {
        if ( rc[2] >= topLayer) return false;
        // const id = Voxels.packID(...rc);
        return (voxels.get(...rc) !== 0);
    });

    return xyz;
}

export function PickEmptyVoxel(xy) {
    const viewRoot =  GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;
    const surfaces = viewRoot.model.surfaces;
    const topLayer = viewRoot.topLayer;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);
    if (raycast.length === 0 ) return null;

    let intersect;
    let direction;

    const xyz = raycast.find(rc => {
        if ( rc[2] >= topLayer) return false;
        const id = Voxels.packID(...rc);
        const surface = surfaces.get(id);
        if (!surface) return false;
        for (direction = 5; direction >=0; direction--) {
            intersect = surface.intersect(start, aim, direction);
            if (intersect) return true;
        }
        return false;
    });
    if (xyz) return {xyz, intersect, direction};

    return null;
}

export function PickVoxel(xy) {
    let xyz;
    let intersect;
    let direction;
    let isSolid;

    const viewRoot =  GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;
    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const voxels = viewRoot.model.voxels;
    const surfaces = viewRoot.model.surfaces;
    const topLayer = viewRoot.topLayer;

    const raycast = FilteredVoxelRaycast(start, aim);

    xyz = raycast.find(rc => {
        if ( rc[2] > topLayer) return false;
        const id = Voxels.packID(...rc);
        const surface = surfaces.get(id);

        if ( rc[2] === topLayer) {
            if (surface) {
                intersect = surface.intersectBase(start, aim);
                isSolid = false;
            } else {
                if (!voxels.get(...Voxels.adjacent(...rc, Voxels.below))) return false;
                intersect = Voxels.intersectBase(...rc, start, aim);
                isSolid = true;
            }
            if (intersect) {
                direction = Voxels.below;
                return true;
            }
        }

        if (!surface) return false;
        isSolid = false;

        for (direction = 5; direction >=0; direction--) {
            intersect = surface.intersect(start, aim, direction);
            if (intersect) return true;
        }
        return false;
    });

    const length = raycast.length;
    if (length > 1) {
        const last = raycast[length-1];
        if (!xyz && last[2] === 0) {
            xyz = last;
            intersect = Voxels.intersectBase(...last, start, aim);
            direction = Voxels.below;
            isSolid = false;
        }
    }

    return {xyz, intersect, direction, isSolid};
}

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
