import { Model } from "@croquet/croquet";
import { Actor, Pawn, mix, PM_Dynamic, PM_Spatial, PM_InstancedVisible, PM_Visible, CachedObject, UnitCube, DrawCall, GetNamedView,
    GetNamedModel, Triangles, Material, v3_add, m4_identity, GetViewRoot, viewRoot } from "@croquet/worldcore";
import { AM_VoxelSmoothed } from "./Components";
import { Voxels } from "./Voxels";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
//-- Water ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Water extends Model{

    init() {
        super.init();
        console.log("Starting water!");
        this.beWellKnownAs('Water');

        this.clear();

        this.subscribe("voxels", "newLevel", this.onNewLevel);
        this.subscribe("voxels", "changed", this.onChanged);
        this.subscribe("editor", "spawnWater", this.onSpawnWater);
        this.subscribe("editor", "spawnWaterSource", this.onSpawnWaterSource);

        this.tick();
    }

    clear() {
        if (this.layers) this.layers.forEach( layer => layer.destroy());
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = WaterLayer.create({z});
    }

    load(matrix) {
        this.clear();
        for (let z = 0; z < Voxels.sizeZ; z++) {
            const layer = this.layers[z];
            for (let x = 0; x < Voxels.sizeX; x++) {
                for (let y = 0; y < Voxels.sizeY; y++) {
                    const volume = matrix[x][y][z];
                    if (volume) {
                        const key = Voxels.packKey(x,y,z);
                        layer.setVolume(key,volume);
                        layer.active.add(key);
                    }
                }
            }
        }
    }

    activate(x, y, z) {
        if (z > this.layers.length-1) return;
        const layer = this.layers[z];
        const key = Voxels.packKey(x,y,z);
        layer.active.add(key);
    }

    deactivate(x, y, z) {
        if (z > this.layers.length-1) return;
        const layer = this.layers[z];
        const key = voxels.packKey(x,y,z);
        layer.active.delete(key);
    }

    setVolume(x,y,z, volume) {
        const key = Voxels.packKey(x,y,z);
        this.layers[z].setVolume(key, volume);
        this.activate(x,y,z+1);
        this.activate(x,y,z);
        this.activate(x-1,y,z);
        this.activate(x+1,y,z);
        this.activate(x,y-1,z);
        this.activate(x,y+1,z);
    }

    getVolume(x,y,z) {
        const key = Voxels.packKey(x,y,z);
        return this.layers[z].getVolume(key);
    }

    getVolumeByKey(key) {
        const xyz = Voxels.unpackKey(key);
        const z = xyz[2];
        return this.layers[z].getVolume(key);
    }

    onNewLevel() {
        this.clear()
    }

    onChanged(data) { //
        const xyz = data.xyz;
        const type = data.type;
        const old = data.old;
        if (type && !old) { // an empty voxel has been filled.
            this.setVolume(...xyz, 0);
        } else { // A solid voxel is now empty. Need to activate to the sides and above
            const x = xyz[0];
            const y = xyz[1];
            const z = xyz[2];
            this.activate(x,y,z+1);
            this.activate(x-1,y,z);
            this.activate(x+1,y,z);
            this.activate(x,y-1,z);
            this.activate(x,y+1,z);
        }
    }

    onSpawnWater(data) {
        const xyz = data.xyz;
        const volume = data.volume;
        this.setVolume(...xyz, volume);
    }

    onSpawnWaterSource(data) {
        const xyz = data.xyz;
        const flow = data.flow;
        WaterSourceActor.create({xyz, fraction: [0.5, 0.5, 0.5], flow});
    }

    get totalVolume() {
        let sum = 0;
        this.layers.forEach(layer => sum += layer.totalVolume);
        return sum;
    }

    tick() {
        for (let z = Voxels.sizeZ-2; z > 0; z--) {
            this.layers[z].flow(this.layers[z+1], this.layers[z-1]);
        }
        this.future(100).tick();
    }

}
Water.register('Water');

//------------------------------------------------------------------------------------------
//-- WaterLayer ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WaterLayer extends Actor {

    get pawn() {return WaterLayerPawn}
    get z() {return this._z}

    init(options) {
        super.init(options);

        this.active = new Set();    // Voxels in this layer that should be tested for water flowing out

        this.volume = new Map();    // How much water is currently in the voxel
        this.inFlow = new Map();    // How much water flowed into each voxel from the sides on the last tick (4-array)
        this.outFlow = new Map();   // How much water flowed out of each voxel to the sides on the last tick (4-array)
        this.inFall = new Map();    // How much water fell into each voxel from above on the last tick
        this.outFall = new Map();   // How much water fell out of each voxel on the last tick
    }

    clear() {
        this.active.clear();
        this.volume.clear();
        this.inFlow.clear();
        this.outFlow.clear();
        this.inFall.clear();
        this.outFall.clear();
    }

    setVolume(key, volume) {
        if (volume) {
            this.volume.set(key, volume);
        } else {
            this.volume.delete(key);
        }
    }

    getVolume(key) { return this.volume.get(key) || 0; }
    getInFlow(key) { return this.inFlow.get(key) || [0,0,0,0]; }
    getOutFlow(key) { return this.outFlow.get(key) || [0,0,0,0]; }
    getInFall(key) { return this.inFall.get(key) || 0; }
    getOutFall(key) { return this.outFall.get(key) || 0; }

    get totalVolume() {
        let sum = 0;
        this.volume.forEach( v=> sum += v );
        return sum;
    }

    // Runs every tick and does the works of transporting water to the side and down.

    flow(above, below) {

        const minFlow = 0.0005;  // Side flows below this value are rounded to zero
        const minVolume = 0.0005; // Volumes below this value are rounded to zero
        const viscosity = 0.6;  // Value 0-1 that determines how quickly water flows. Higher is faster.

        below.inFall.clear();
        this.outFall.clear();
        this.inFlow.clear();
        this.outFlow.clear();

        if (this.active.size === 0) return;

        const nextActive = new Set();
        const voxels = this.wellKnownModel("modelRoot").voxels;

        // Fall into the voxel below

        this.active.forEach( (key) => {
            const volume = this.getVolume(key);
            if (!volume) return;
            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.getVolume(belowKey);
            if (belowVolume === 1) return // Voxel below is full.

            const flow = Math.min(volume, 1-belowVolume);

            this.outFall.set(key, -flow);
            below.inFall.set(belowKey, flow);
            this.setVolume(key, volume-flow);
            below.setVolume(belowKey, belowVolume+flow);

            if (flow) {
                const aboveXYZ = Voxels.adjacent(...xyz, Voxels.above);
                const aboveKey = Voxels.packKey(...aboveXYZ);
                const x = xyz[0];
                const y = xyz[1];
                const z = xyz[2];
                above.active.add(aboveKey);
                below.active.add(belowKey);
                nextActive.add(key);
                nextActive.add(Voxels.packKey(x+1, y, z));
                nextActive.add(Voxels.packKey(x-1, y, z));
                nextActive.add(Voxels.packKey(x, y+1, z));
                nextActive.add(Voxels.packKey(x, y-1, z));
            }

        });

        // Calculate flow into voxels to the sides

        this.active.forEach( (key) => {
            const volume = this.getVolume(key);
            if (!volume) return;
            const xyz = Voxels.unpackKey(key);

            const sides = [];
            let sum = volume;

            for (let a = 0; a < 4; a++) {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                if (!Voxels.isValid(...sideXYZ) || voxels.get(...sideXYZ)) continue; // Side voxel is solid
                const sideVolume = this.getVolume(sideKey);
                if (sideVolume < volume) { // We should flow into it.
                    sides.push(a);
                    sum += sideVolume;
                }
            }

            if (sides.length===0) return; // All side volumes are higher or solid -- no flow!

            const average = sum/(sides.length+1); // The target volume

            this.outFlow.set(key, [0,0,0,0]);
            sides.forEach(a => {
                const sideXYZ = Voxels.adjacent(...xyz, a);
                const sideKey = Voxels.packKey(...sideXYZ);
                let flow = (average - this.getVolume(sideKey)) * viscosity;
                if (flow < minFlow) flow = 0;
                if (!this.inFlow.has(sideKey)) this.inFlow.set(sideKey, [0,0,0,0]);
                this.inFlow.get(sideKey)[Opposite(a)] = flow;
                this.outFlow.get(key)[a] = -flow;
            });
        })

        // Apply side inflows

        this.inFlow.forEach( (flow, key) => {
            const volume = this.getVolume(key);
            const xyz = Voxels.unpackKey(key);
            let sum = flow.reduce((sum, f) => sum+f);
            if ((volume + sum) > 1 ) { // Flow + volume is too big!
                flow = flow.map( f => f/(sum+volume)); // Scale the flow back to just fill the voxel
                this.inFlow.set(key, flow);
                sum = 1-volume;
                for (let a = 0; a < 4; a++) {   // Reduce the adjacent outflows to match
                    const sideXYZ = Voxels.adjacent(...xyz, a);
                    const sideKey = Voxels.packKey(...sideXYZ);
                    const f = this.outFlow.get(sideKey);
                    if (f) f[Opposite(a)] = -flow[a];
                }
            }
            let v = volume + sum;
            this.setVolume(key, v);
            nextActive.add(key);
        })

        // Apply side outflows

        this.outFlow.forEach( (flow,key) => {
            let volume = this.getVolume(key);
            const sum = flow.reduce((sum, f) => sum+f);
            this.setVolume(key, volume+sum);

            if (sum) {
                const xyz = Voxels.unpackKey(key);
                const x = xyz[0];
                const y = xyz[1];
                const z = xyz[2];

                above.active.add(Voxels.packKey(x, y, z+1));
                nextActive.add(key);
                nextActive.add(Voxels.packKey(x+1, y, z));
                nextActive.add(Voxels.packKey(x-1, y, z));
                nextActive.add(Voxels.packKey(x, y+1, z));
                nextActive.add(Voxels.packKey(x, y-1, z));
            }
        })

        // Fall again. We do this so water doesn't hang off edge of a cliff.

        nextActive.forEach( (volume,key) => {
            volume = this.getVolume(key);
            if (volume < minVolume) { // Clamp volume to zero if it goes below a minimum
                this.setVolume(key, 0);
                return;
            }

            const xyz = Voxels.unpackKey(key);
            const belowXYZ = Voxels.adjacent(...xyz, Voxels.below);
            if (voxels.get(...belowXYZ)) return; // Voxel below is solid.
            const belowKey = Voxels.packKey(...belowXYZ);
            const belowVolume = below.getVolume(belowKey);
            if (belowVolume === 1) return // Voxel below is full.

            const flow = Math.min(volume, 1-belowVolume);

            const outFall = this.getOutFall(key);
            this.outFall.set(key, outFall - flow);
            const inFall = below.getInFall(belowKey);
            below.inFall.set(belowKey, inFall+flow);
            this.setVolume(key, volume-flow);
            below.setVolume(belowKey, belowVolume+flow);

            if (flow) {
                const aboveXYZ = Voxels.adjacent(...xyz, Voxels.above);
                const aboveKey = Voxels.packKey(...aboveXYZ);
                const x = xyz[0];
                const y = xyz[1];
                const z = xyz[2];
                above.active.add(aboveKey);
                below.active.add(belowKey);
                nextActive.add(key);
                nextActive.add(Voxels.packKey(x+1, y, z));
                nextActive.add(Voxels.packKey(x-1, y, z));
                nextActive.add(Voxels.packKey(x, y+1, z));
                nextActive.add(Voxels.packKey(x, y-1, z));
            }
        });

        this.active = new Set([...nextActive].filter( key => this.getVolume(key))) // Remove active entries with zero volume
        this.say("rebuild");
    }

}
WaterLayer.register('WaterLayer');

//------------------------------------------------------------------------------------------
//-- WaterLayerPawn ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// In order to properly draw the inner water mesh, we need to change how the zOffsets are handled.
// Right now we only set zOffsets for polygons. Lines default to 0. But what should really happen is:
//
// Water = 6
// Terrain = 5
// Terrain Lines = 4
// Inner Water = 3
// Inner Terrain = 2
// Inner Terrain Lines = 1
// Voxel Cursor = 0
//
// This requires a big material reorg and verification that we can set zOffset of lines

const cornerSums = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));
const cornerCounts = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));

function clearCornerGrid() {
    cornerSums.forEach( c => c.fill(0) );
    cornerCounts.forEach( c => c.fill(0) );
}

// We don't use the averaged corner volume in cases where the corner consists of two
// water voxels and two solid voxels diagnonally separated. These functions check for
// that case.

function neIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x+1,y,z) || !Voxels.isValid(x,y+1,z)) return true;
    if (voxels.get(x+1,y,z) && voxels.get(x,y+1,z)) return false;
    return true;
}

function nwIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x-1,y,z) || !Voxels.isValid(x,y+1,z)) return true;
    if (voxels.get(x-1,y,z) && voxels.get(x,y+1,z)) return false;
    return true;
}

function swIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x-1,y,z) || !Voxels.isValid(x,y-1,z)) return true;
    if (voxels.get(x-1,y,z) && voxels.get(x,y-1,z)) return false;
    return true;
}

function seIsValid(xyz) {
    const x = xyz[0];
    const y = xyz[1];
    const z = xyz[2];
    if (!Voxels.isValid(x+1,y,z) || !Voxels.isValid(x,y-1,z)) return true;
    if (voxels.get(x+1,y,z) && voxels.get(x,y-1,z)) return false;
    return true;
}

let voxels;

class WaterLayerPawn extends mix(Pawn).with(PM_Visible) {

    constructor(...args) {
        super(...args);

        voxels = this.wellKnownModel("Voxels");

        this.mesh = new Triangles();
        const material = CachedObject("waterMaterial", this.buildMaterial);
        this.drawCall = new DrawCall(this.mesh, material);
        this.setDrawCall(this.drawCall);
        this.buildMesh();
        this.listenOnce("rebuild", this.buildMesh);
        this.subscribe("hud", "topLayer", this.onTopLayer);
    }

    onTopLayer(topLayer) {
        if (this.actor.z < topLayer) {
            this.setDrawCall(this.drawCall);
            this.draw.isHidden = false;
        } else if (this.actor.z === topLayer) {
            this.draw.isHidden = true;
        } else {
            this.draw.isHidden = true;
        }
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'translucent';
        material.zOffset = 2;
        return material;
    }

    buildMesh() {
        if (!this.actor.volume) return;

        clearCornerGrid();
        this.actor.volume.forEach( (v,key) =>  {

            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            cornerSums[x][y] += v;
            cornerSums[x+1][y] += v;
            cornerSums[x][y+1] += v;
            cornerSums[x+1][y+1] += v;

            cornerCounts[x][y]++;
            cornerCounts[x+1][y]++;
            cornerCounts[x][y+1]++;
            cornerCounts[x+1][y+1]++;
        });

        const c = [0, 0, 0.8, 0.2];

        this.mesh.clear();
        this.actor.volume.forEach( (v,key) =>  {

            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            let sw = v, se = v, ne = v, nw = v;

            if (swIsValid(xyz)) sw = cornerSums[x][y] / cornerCounts[x][y];
            if (seIsValid(xyz)) se = cornerSums[x+1][y] / cornerCounts[x+1][y];
            if (neIsValid(xyz)) ne = cornerSums[x+1][y+1] / cornerCounts[x+1][y+1];
            if (nwIsValid(xyz)) nw = cornerSums[x][y+1] / cornerCounts[x][y+1];

            const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0.5,0.5,v]));
            const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,sw]));
            const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,se]));
            const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,ne]));
            const v4 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,nw]));

            const c0 = ScaleColor(c, v);
            const c1 = ScaleColor(c, sw);
            const c2 = ScaleColor(c, se);
            const c3 = ScaleColor(c, ne);
            const c4 = ScaleColor(c, nw);

            this.mesh.addFace([v0, v1, v2, v3, v4, v1], [c0, c1, c2, c3, c4, c1], [[0.5,0.5], [0,0], [1,0], [1,1], [0,1], [0,0]]);
        });
        this.mesh.load();
        this.mesh.clear();

    }
}

function ScaleColor(c, v) {
    if (v > 0.2) return c;
    const scale = v / 0.2;
    return c.map(x => x * scale);
}


//------------------------------------------------------------------------------------------
//-- WaterSource ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class WaterSourceActor extends mix(Actor).with(AM_VoxelSmoothed) {
    get pawn() {return WaterSourcePawn}
    get flow() { return this._flow || 0} // Voxels / second

    init(options) {
        super.init(options)
        const firstDelta = Math.random() * 50;
        this.future(firstDelta).tick(firstDelta);
    }

    tick(delta) {
        console.log("source tick");
        const voxels = this.wellKnownModel("Voxels");
        if (voxels.get(...this.xyz)) {
            this.destroy();
            return;
        }
        const water = this.wellKnownModel("Water");
        const flow = delta * this.flow / 1000;
        const volume = Math.max(0, Math.min(1, water.getVolume(...this.xyz) + flow));
        water.setVolume(...this.xyz, volume);
        this.future(50).tick(50);
    }

}
WaterSourceActor.register('WaterSourceActor')

class WaterSourcePawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);
        this.setDrawCall(this.buildDraw());
    }

    buildDraw() {
        const mesh = this.buildMesh();
        const material = this.buildMaterial();
        const draw = new DrawCall(mesh, material);
        // GetNamedView('ViewRoot').render.scene.addDrawCall(draw);
        viewRoot.render.scene.addDrawCall(draw);
        return draw;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'opaque';
        material.texture.loadFromURL(paper);
        return material;
    }

    buildMesh() {
        const mesh = UnitCube();
        if (this.actor.flow > 0) {
            mesh.setColor([0, 1, 0, 1])
        } else {
            mesh.setColor([1, 0, 0, 1])
        }
        mesh.load();
        mesh.clear();
        return mesh;
    }

}

//------------------------------------------------------------------------------------------
//-- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given a voxel direction, returns the opposite.
function Opposite(side) {
    switch (side) {
        case 0: return 2;
        case 1: return 3;
        case 2: return 0;
        case 3: return 1;
        default: return 0;
    }
}

// Waterfalls -- Rethink the whole strategy
// Water affects pathing
// Characters can drown
