// import {  } from "@croquet/croquet";
import { Model, Constants, ModelService, PriorityQueue } from "@croquet/worldcore-kernel";
import { Voxels } from "./Voxels";

Constants.path = {
    slopeEffort: 1.2,   // Multiplier to discourage walking uphill
    sideFlatWeight: Voxels.scaleX / 2,
    sideSlopeWeight: Math.sqrt(Voxels.scaleX * Voxels.scaleX + Voxels.scaleZ * Voxels.scaleZ) / 2,
    cornerFlatWeight: Math.sqrt(Voxels.scaleX * Voxels.scaleX + Voxels.scaleY * Voxels.scaleY) / 2,
    cornerSlopeWeight: Math.sqrt(Voxels.scaleX * Voxels.scaleX + Voxels.scaleY * Voxels.scaleY + Voxels.scaleZ * Voxels.scaleZ) / 2,
    centerWeight: 0.1,
    maxWaterDepth: 0.6,
    deepWaterDepth: 0.2,
    deepWaterWeight: 2
};

const slopeEffort = Constants.path.slopeEffort;
const sideFlatWeight = Constants.path.sideFlatWeight;
const sideSlopeWeight = Constants.path.sideSlopeWeight;
const cornerFlatWeight = Constants.path.cornerFlatWeight;
const cornerSlopeWeight = Constants.path.cornerSlopeWeight;
const centerWeight = Constants.path.centerWeight;
const maxWaterDepth = Constants.path.maxWaterDepth;
const deepWaterDepth = Constants.path.deepWaterDepth;
const deepWaterWeight = Constants.path.deepWaterWeight;


//------------------------------------------------------------------------------------------
//-- Paths ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds the nav mesh and automatically updates whenever the surfaces are changed.

export class Paths extends ModelService {

    static types() { return { "W3:Waypoint": Waypoint }; }

    init() {
        super.init("Paths");

        this.subscribe("surfaces", "newLevel", this.onNewLevel);
        this.subscribe("surfaces", "changed", this.onChanged);
    }

    onNewLevel() {
        this.buildAll();
        this.publish("paths", "newLevel");
    }

    onChanged(data) {
        this.buildLocal(data.remove);
        this.publish("paths", "changed");
    }

    buildAll() {
        this.waypoints = new Map();
        const waypoints = this.waypoints;
        const surfaces = this.service("Surfaces");
        surfaces.surfaces.forEach((surface,key) => {
            if (surface.hasFloor()) {
                const w = new Waypoint();
                w.setKey(key);
                waypoints.set(key, w);
            }
            });
        waypoints.forEach(w => w.findExits(surfaces));
    }

    buildLocal(remove) {
        const changed = Voxels.expandKeySet(remove);
        const waypoints = this.waypoints;
        const surfaces = this.service("Surfaces");
        const added = new Set();
        changed.forEach(key => {
            waypoints.delete(key);
            const surface = surfaces.get(key);
            if (surface && surface.hasFloor()) {
                const w = new Waypoint();
                w.setKey(key);
                waypoints.set(key, w);
                added.add(w);
            }
        });
        added.forEach(w => w.findExits(surfaces));
    }

    // Returns true if the start voxel has an exit that leads to the end voxel.
    // This is used during travel to make sure that terrain edits haven't broken the path we're using.

    hasExit(startKey, endKey) {
        if (!this.waypoints.has(startKey)) return false;
        return this.waypoints.get(startKey).hasExit(endKey);
    }

    findPath(startKey, endKey) {
        const water = this.service('Water');
        const path = [];

        if (!this.waypoints.has(startKey)) return path;  // Invalid start waypoint
        if (!this.waypoints.has(endKey)) return path;    // Invalid end waypoint

        const endXYZ = this.waypoints.get(endKey).xyz;

        const frontier = new PriorityQueue((a, b) => a.priority < b.priority);
        const visited = new Map();

        frontier.push({priority: 0, key: startKey});
        visited.set(startKey, {from: startKey, cost: 0});

        // Iterate until frontier is empty or we find the end of the path
        let currentKey;
        while (!frontier.isEmpty) {
            currentKey = frontier.pop().key;
            if (currentKey === endKey) break;
            const current = visited.get(currentKey);
            const currentWaypoint = this.waypoints.get(currentKey);
            for (let i = 0; i < 10; i++) {
                const exitKey = currentWaypoint.exits[i];
                const exitWater = water.getVolumeByKey(exitKey);
                if (!exitKey) continue; // No exit in that direction;
                if (exitWater > maxWaterDepth) continue; // Don't walk into water that could drown you
                if (!visited.has(exitKey)) visited.set(exitKey, {}); // First time visited
                const exit = visited.get(exitKey);
                let addedCost = currentWaypoint.weights[i];
                if (exitWater > deepWaterDepth) addedCost *= deepWaterWeight;
                const cost = current.cost + addedCost;
                if (exit.from && exit.cost <= cost) continue; // A better route to this exit already exists
                exit.from = currentKey;
                exit.cost = cost;
                const exitWaypoint = this.waypoints.get(exitKey);
                const heuristic = Heuristic(endXYZ, exitWaypoint.xyz);  // Manhattan distance
                frontier.push({priority: cost + heuristic, key: exitKey});
            }
        }

        if (currentKey === endKey) { // A path was found!
            while (currentKey !== startKey) { // Run backwards along "from" links to build path array
                path.push(currentKey);
                currentKey = visited.get(currentKey).from;
            }
            path.push(currentKey);
            path.reverse();
        }

        return path;

    }

}
Paths.register("Paths");

//------------------------------------------------------------------------------------------
//-- Waypoint ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Storage for each individual waypoint. Holds the keys of the adjacent voxels that can be pathed to
// and the cost of traversing that path.

class Waypoint {
    constructor() {
        this.exits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.weights = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }

    setKey(key) {
        this.key = key;
        this.xyz = Voxels.unpackKey(key);
    }

    hasExit(key) {
        const exits = this.exits;
        for (let i = 0; i < exits.length; i++) {
            if (key === exits[i]) return true;
        }
        return false;
    }

    findExits(surfaces) {
        this.exits.fill(0);

        let s = surfaces.get(this.key);
        let adjacent, adjacentKey;

        const sideExits = SideExits(s);
        const cornerExits = CornerExits(s);
        const centerExit = CenterExit(s);
        const elevation = CenterElevation(s);

        const above = Voxels.adjacent(...this.xyz, Voxels.above);
        const below = Voxels.adjacent(...this.xyz, Voxels.below);

    //     // -- Find side exits --

        for (let a = 0; a < 4; a++) {
            const sideExit = sideExits[a];
            if (sideExit === 1) {   // This side has a bottom exit

                adjacent = Voxels.adjacent(...this.xyz, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && SideExits(s)[Opposite(a)] === 1) { // Adjacent voxel also has bottom exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = SideWeight(elevation, 1, CenterElevation(s));
                    continue;
                }

                adjacent = Voxels.adjacent(...below, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && SideExits(s)[Opposite(a)] === 3) { // Adjacent + below voxel has a top exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = SideWeight(elevation, 1, CenterElevation(s));
                    continue;
                }

            } else if (sideExit === 2) {    // This side has a middle exit

                adjacent = Voxels.adjacent(...this.xyz, a);
                adjacentKey= Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && SideExits(s)[Opposite(a)] === 2) { // Adjacent voxel also has a middle exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = SideWeight(elevation, 2, CenterElevation(s));
                    continue;
                }

            } else if (sideExit === 3) {    // This side has a top exit

                adjacent = Voxels.adjacent(...above, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && SideExits(s)[Opposite(a)] === 1) { // Adjacent + above voxel has a bottom exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = SideWeight(elevation, 3, CenterElevation(s));
                    continue;
                }

            }
        }

    //     // -- Find corner exits --

        for (let c = 0; c < 4; c++) {
            const a = c+6;
            const cornerExit = cornerExits[c];
            if (cornerExit === 1) {   // This corner has a bottom exit

                adjacent = Voxels.adjacent(...this.xyz, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && CornerExits(s)[Opposite(c)] === 1) { // Adjacent voxel also has bottom exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = CornerWeight(elevation, 1, CenterElevation(s));
                    continue;
                }

                adjacent = Voxels.adjacent(...below, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && CornerExits(s)[Opposite(c)] === 3) { // Adjacent + below voxel has a top exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = CornerWeight(elevation, 1, CenterElevation(s));
                    continue;
                }

            } else if (cornerExit === 2) {    // This corner has a middle exit

                adjacent = Voxels.adjacent(...this.xyz, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && CornerExits(s)[Opposite(c)] === 2) { // Adjacent voxel also has a middle exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = CornerWeight(elevation, 3, CenterElevation(s));
                    continue;
                }

            } else if (cornerExit === 3) {    // This corner has a top exit

                adjacent = Voxels.adjacent(...this.xyz, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && CornerExits(s)[Opposite(c)] === 3) { // Adjacent voxel also has a top exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = CornerWeight(elevation, 3, CenterElevation(s));
                    continue;
                }

                adjacent = Voxels.adjacent(...above, a);
                adjacentKey = Voxels.packKey(...adjacent);
                s = surfaces.get(adjacentKey);
                if (s && CornerExits(s)[Opposite(c)] === 1) { // Adjacent + above voxel has a bottom exit
                    this.exits[a] = adjacentKey;
                    this.weights[a] = CornerWeight(elevation, 3, CenterElevation(s));
                    continue;
                }

            }
        }

    //     // -- Find center exits --

        if (centerExit === 1) { // This voxel has a bottom center exit
            adjacentKey = Voxels.packKey(...below);
            s = surfaces.get(adjacentKey);
            if (s && CenterExit(s) === 3) { // Below voxel has top center exit
                this.exits[Voxels.below] = adjacentKey;
                this.weights[Voxels.below] = centerWeight;
            }
        } else if (centerExit === 3) { // This voxel has a top center exit
            adjacentKey = Voxels.packKey(...above);
            s = surfaces.get(adjacentKey);
            if (s && CenterExit(s) === 1) { // Above voxel has bottom center exit
                this.exits[Voxels.above] = adjacentKey;
                this.weights[Voxels.above] = centerWeight;
            }
        }

    }

}

//------------------------------------------------------------------------------------------
//-- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


// Rotates the elements of a four-element array clockwise.
function Rot(a, n) {
    switch (n) {
        case 1: return [a[3], a[0], a[1], a[2]];
        case 2: return [a[2], a[3], a[0], a[1]];
        case 3: return [a[1], a[2], a[3], a[0]];
        default: return a;
    }
}

// Give a surface, returns possible side exits based on shape and facing.
// 0 = none / 1 = bottom / 2 = middle / 3 = top

function SideExits(s) {
    switch (s.shape) {
        case 2: return [1,1,1,1];
        case 3: return Rot([3,2,1,2], s.facing);
        case 4: return Rot([1,1,0,0], s.facing);
        case 5: return Rot([2,2,0,0], s.facing);
        case 6: return Rot([0,0,2,2], s.facing);
        case 7: return Rot([2,2,1,1], s.facing);
        case 8: return [2,2,2,2];
        case 9: return Rot([1,2,2,2], s.facing);
        case 10: return Rot([3,2,2,2], s.facing);
        case 11: return Rot([3,2,2,2], s.facing);
        default: return [0,0,0,0];
    }
}

// Given a surface, returns possible corner exits based on shape and facing.
// 0 = none / 1 = bottom / 2 = middle / 3 = top

function CornerExits(s) {
    let exits;
    switch (s.shape) {
        case 2: exits = [1,1,1,1]; break;
        case 3: exits = Rot([3,1,1,3], s.facing); break;
        case 4: exits = Rot([1,1,0,1], s.facing); break;
        case 5: exits = Rot([3,1,0,1], s.facing); break;
        case 6: exits = Rot([0,3,1,3], s.facing); break;
        case 7: exits = Rot([3,1,1,1], s.facing); break;
        case 8: exits = Rot([3,1,3,1], s.facing); break;
        case 9: exits = Rot([1,3,3,1], s.facing); break;
        case 10: exits = Rot([3,1,3,3], s.facing); break;
        case 11: exits = Rot([3,3,1,3], s.facing); break;
        default: exits = [0,0,0,0]; break;
    }

    // Throw out exits on corners with adjacent solid faces.

    if ((s.faces[0] || s.faces[1])) exits[0] = 0;
    if ((s.faces[1] || s.faces[2])) exits[1] = 0;
    if ((s.faces[2] || s.faces[3])) exits[2] = 0;
    if ((s.faces[3] || s.faces[0])) exits[3] = 0;

    return exits;
}

// Given a surface, returns possible center exits based on shape.
// 0 = none / 1 = bottom / 3 = top

function CenterExit(s) {
    switch (s.shape) {
        case 4:
        case 5: return 1;
        case 6: return 3;
        default: return 0;
    }
}

function CenterElevation(s) {
    switch (s.shape) {
        case 2: return 1;   // Flat
        case 3: return 2;   // Ramp
        case 4: return 1;   // Half flat
        case 5: return 1;   // Shim
        case 6: return 3;   // Double ramp (ramp + ramp)
        case 7: return 1;   // Wedge (half flat + shim)
        case 8: return 1;   // Butterfly (shim + shim)
        case 9: return 1;   // Cuban (shim + shim)
        case 10: return 2;  // Left skew (ramp + left shim)
        case 11: return 2;  // Right skew (ramp + right shim)
        default: return 0;
    }
}

function Opposite(side) {
    switch (side) {
        case 0: return 2;
        case 1: return 3;
        case 2: return 0;
        case 3: return 1;
        default: return 0;
    }
}

function SideWeight(e0, e1, e2) {
    let w = 0;
    const d01 = e1 - e0;
    const d12 = e2 - e1;
    if (d01 > 0) {
        w += sideSlopeWeight * slopeEffort;
    } else if (d01 < 0) {
        w += sideSlopeWeight;
    } else {
        w += sideFlatWeight;
    }
    if (d12 > 0) {
        w += sideSlopeWeight * slopeEffort;
    } else if (d12 < 0) {
        w += sideSlopeWeight;
    } else {
        w += sideFlatWeight;
    }
    return w;
}

function CornerWeight(e0, e1, e2) {
    let w = 0;
    const d01 = e1 - e0;
    const d12 = e2 - e1;
    if (d01 > 0) {
        w += cornerSlopeWeight * slopeEffort;
    } else if (d01 < 0) {
        w += cornerSlopeWeight;
    } else {
        w += cornerFlatWeight;
    }
    if (d12 > 0) {
        w += cornerSlopeWeight * slopeEffort;
    } else if (d12 < 0) {
        w += cornerSlopeWeight;
    } else {
        w += cornerFlatWeight;
    }
    return w;
}

function Heuristic(v0, v1) {
    return Voxels.scaleX * Math.abs(v0[0]-v1[0]) + Voxels.scaleY * Math.abs(v0[1]-v1[1]) + Voxels.scaleZ * Math.abs(v0[2]-v1[2]);
}
