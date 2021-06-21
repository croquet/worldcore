import { GetNamedModel, GetNamedView, v3_divide } from "@croquet/worldcore";
import { IntersectVoxelBase } from "./Surfaces";
import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- PickVoxel -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given xy in screen coordinates, returns the xyz coordinates of the voxel pointed at.
// TopLayer lets you ignore the top layers of the voxel volume in a cutaway.

// xyz = undefined means no voxel was found.

export function PickVoxel(xy, topLayer = Voxels.sizeZ) {
    const viewRoot = GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;
    const voxels = viewRoot.model.voxels;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);

    let xyz =  raycast.find(rc => {
        if ( rc[2] >= topLayer) return false;
        return (voxels.get(...rc));
    });

    return xyz;
}

//------------------------------------------------------------------------------------------
//-- PickSurface----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given xy in screen coordinates, returns an object with information about the
// voxel surface being pointed at. TopLayer lets you ignore the top layers
// of the voxel volume in a cutaway.
//
// * xyz -- the coordinates of the empty voxel conataining the surface.
// * intersect -- the exact point in voxel space being pointed at on the surface.
// * direction -- the orientation of the surface  relative to the empty voxel.
//
// xyz = undefined means no surface was found.

export function PickSurface(xy, topLayer = Voxels.sizeZ) {
    const viewRoot = GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;

    const surfaces = viewRoot.model.surfaces;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);

    let intersect;
    let direction;
    const xyz = raycast.find(rc => {
        if ( rc[2] >= topLayer) return false;
        const key = Voxels.packKey(...rc);
        const surface = surfaces.get(key);
        if (!surface) return false;
        for (direction = 5; direction >=0; direction--) {
            intersect = surface.intersect(start, aim, direction);
            if (intersect) return true;
        }
        return false;
    });

    return {xyz, intersect, direction};
}

//------------------------------------------------------------------------------------------
//-- PickDigVoxel --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns xyz coordinates of the voxel under the cursor if it can be dug.

export function PickDigVoxel(xy, topLayer = Voxels.sizeZ) {
    const test = PickVoxel(xy, topLayer);
    if (test && test[2] === topLayer-1) return test;

    const pick = PickSurface(xy, topLayer);
    if (!pick.xyz) return null;
    const xyz = Voxels.adjacent(...pick.xyz, pick.direction);
    const viewRoot = GetNamedView("ViewRoot");
    const voxels = viewRoot.model.voxels;
    const surfaces = viewRoot.model.surfaces;
    if (!voxels.get(...xyz)) return null;
    if (pick.direction === Voxels.below) {
        const above = Voxels.adjacent(...xyz, Voxels.above);
        const aboveKey = Voxels.packKey(...above);
        const aboveSurface = surfaces.get(aboveKey);
        // if (aboveSurface && aboveSurface.hidesBelow()) return null;
    }
    return xyz;
}

//------------------------------------------------------------------------------------------
//-- PickFillSurface -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns surface data of the voxel under the cursor if it can be filled.

export function PickFillSurface(xy, topLayer = Voxels.sizeZ) {

    const viewRoot = GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;

    const surfaces = viewRoot.model.surfaces;
    const voxels = viewRoot.model.voxels;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);

    let intersect;
    let direction;
    let blocked;
    let xyz = raycast.find(rc => {
        const voxel = voxels.get(...rc);

        if (rc[2] < topLayer) blocked = blocked || voxel;
        if (voxel) return false;

        if (rc[2] < topLayer) {
            const key = Voxels.packKey(...rc);
            const surface = surfaces.get(key);
            if (!surface) return false;
            for (direction = 5; direction >=0; direction--) {
                intersect = surface.intersect(start, aim, direction);
                if (intersect) {
                    let hasAdjacent = false;
                    voxels.forAdjacent(...rc, type => hasAdjacent = hasAdjacent || type);
                    return hasAdjacent;;
                }
            }
        } else if (rc[2] === topLayer) {
            const below = Voxels.adjacent(...rc, Voxels.below);
            if (voxels.get(...below)) {
                direction = Voxels.below;
                intersect = IntersectVoxelBase(rc, start, aim);
                if (intersect) return true;
            }
        }
        return false;
    });

    if (blocked) xyz = null;

    return {xyz, intersect, direction};
}

//------------------------------------------------------------------------------------------
//-- PickGrabSurface -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns surface data of the voxel under the cursor if it can be grabbed during navigation.

export function PickGrabSurface(xy, topLayer = Voxels.sizeZ) {

    const viewRoot = GetNamedView("ViewRoot");
    const camera = viewRoot.render.camera;

    const surfaces = viewRoot.model.surfaces;
    const voxels = viewRoot.model.voxels;

    const start = v3_divide(camera.location, Voxels.scale);
    const aim = v3_divide(camera.viewLookRay(...xy), Voxels.scale);

    const raycast = FilteredVoxelRaycast(start, aim);

    let intersect;
    let direction;
    let xyz = raycast.find(rc => {
        if (rc[2] < topLayer) {
            const key = Voxels.packKey(...rc);
            const surface = surfaces.get(key);
            if (!surface) return false;
            for (direction = 5; direction >=0; direction--) {
                intersect = surface.intersect(start, aim, direction);
                if (intersect) return true;
            }
        } else if (rc[2] === topLayer) {
            const below = Voxels.adjacent(...rc, Voxels.below);
            if (voxels.get(...below)) {
                direction = Voxels.below;
                intersect = IntersectVoxelBase(rc, start, aim);
                if (intersect) return true;
            }
        }
        return false;
    });



    return {xyz, intersect, direction};
}

//------------------------------------------------------------------------------------------
//-- PickFloorSurface ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// PickSurface, but only returns a surface if you're pointing at a floor.

export function PickFloorSurface(xy, topLayer = Voxels.sizeZ) {
    const pick = PickSurface(xy, topLayer);
    if (pick.direction != Voxels.below) pick.xyz = null;
    return pick;
}

//------------------------------------------------------------------------------------------
//-- PickPlantSurface ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// PickSurface, but only returns a surface if you're pointing at a floor.

export function PickPlantSurface(xy, topLayer = Voxels.sizeZ) {
    const pick = PickFloorSurface(xy, topLayer);
    if (pick.direction != Voxels.below) pick.xyz = null;
    if (pick.xyz) {
        const below = Voxels.adjacent(...pick.xyz, Voxels.below);
        if (GetNamedModel("Voxels").get(...below) != Voxels.dirt) pick.xyz = null;
    }
    return pick;
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