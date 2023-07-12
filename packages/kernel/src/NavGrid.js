import { RegisterMixin } from "./Mixins";
import { v2_manhattan, q_multiply, q_axisAngle, v3_normalize, v3_add, q_lookAt, v3_sub, v3_magnitude, v3_distance, v2_normalize, v2_sub,
        v3_rotateX, v3_rotateY, v3_rotateZ, toRad, v3_max, v2_scale, v2_add, v2_floor, v2_magnitude, v2_signedAngle }from "./Vector";
import { PerlinNoise, PriorityQueue } from "./Utilities";
import { Behavior } from "./Behavior";

//------------------------------------------------------------------------------------------
// -- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function packKey(x,y) {
    const xx = x + 0x4000;
    const yy = y + 0x4000;
    return ((0x8000|xx)<<16)|yy;
}

function unpackKey(key) {
    const x = (key>>>16) & 0x7FFF;
    const y = key & 0x7FFF;
    return [x - 0x4000, y - 0x4000];
}

//------------------------------------------------------------------------------------------
// -- AM_Grid ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Grid = superclass => class extends superclass {

    get gridSize() { return this._gridSize || 16}
    get gridScale() { return this._gridScale || 1}
    get gridPlane() { return this._gridPlane || 0 } // 0 = xz, 1 = xy, 2 = yz
    get isGrid() { return true}

    init(options) {
        super.init(options);
        this.gridBins = new Map();
    }

    gridXY(x,y,z) {
        const s = this.gridScale;
        switch (this.gridPlane) {
            default:
            case 0: return [x/s, z/s];
            case 1: return [x/s, y/s];
            case 2: return [y/s, z/s];
        }
    }

    gridXYZ(x,y) {
        switch (this.gridPlane) {
            default:
            case 0: return [x,0,y];
            case 1: return [x,y,0];
            case 2: return [0,x,y];
        }
    }

    addToBin(key,child) {
        let bin = this.gridBins.get(key);
        if (!bin) {
            bin = new Set();
            this.gridBins.set(key, bin);
        }
        bin.add(child);
        child.gridBin = bin;
    }

    removeFromBin(key,child) {
        const bin = this.gridBins.get(key);
        if (bin) {
            bin.delete(child);
            if (bin.size === 0) this.gridBins.delete(key);
        }
        child.gridBin = null;
    }

    getBin(x,y) {
        const key = packKey(x,y);
        return this.gridBins.get(key);
    }

    pingAll(tag, center, radius=0, exclude) {     // returns an array of all actors with tag in radius
        const out = [];

        const xy = this.gridXY(...center);
        const cx = Math.floor(xy[0]);
        const cy = Math.floor(xy[1]);
        const r = Math.floor(radius/this.gridScale);

        const bbb = this.getBin(cx, cy);
        if (bbb) {
            for (const actor of bbb) {
                if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
            }
        }
        // for (const actor of this.getBin(cx, cy)) {
        //     if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
        // }

        for (let n = 1; n<=r; n++) {
            const x0 = cx-n;
            const y0 = cy-n;
            const x1 = cx+n;
            const y1 = cy+n;

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y0);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x0,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y1);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x1,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
                }
            }
        }

        return out;
    }

    pingAny(tag, center, radius=0, exclude) { // Returns the first actor it finds in the radius

        const xy = this.gridXY(...center);
        const cx = Math.floor(xy[0]);
        const cy = Math.floor(xy[1]);
        const r = Math.floor(radius/this.gridScale);

        let bin = this.getBin(cx, cy);
        if (bin) {
            for (const actor of bin) {
                if (actor !== exclude && actor.tags.has(tag)) return actor;
            }
        }

        for (let n = 1; n<=r; n++) {
            const x0 = cx-n;
            const y0 = cy-n;
            const x1 = cx+n;
            const y1 = cy+n;

            for (let x = x0; x<=x1; x++) {
                bin = this.getBin(x,y0);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) return actor;
                }
            }

            for (let y = y0+1; y<y1; y++) {
                bin = this.getBin(x0,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) return actor;
                }
            }

            for (let x = x0; x<=x1; x++) {
                bin = this.getBin(x,y1);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) return actor;
                }
            }

            for (let y = y0+1; y<y1; y++) {
                bin = this.getBin(x1,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor !== exclude && actor.tags.has(tag)) return actor;
                }
            }
        }

        return null;
    }

};
RegisterMixin(AM_Grid);

//------------------------------------------------------------------------------------------
//-- AM_OnGrid -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnGrid = superclass => class extends superclass {

    get xy() { return this._xy || [0,0]}

    translationSet(xyz) {
        if (!this.parent || !this.parent.isGrid) { console.error("AM_OnGrid must have an AM_Grid parent!"); return}
        const xy = this.parent.gridXY(...xyz);
        this.set({xy});

        const oldKey = this.gridKey;
        this.gridKey = packKey(...xy);

        if (this.gridKey !== oldKey) {
            this.parent.removeFromBin(oldKey,this);
            this.parent.addToBin(this.gridKey, this);
        }
    }

    destroy() {
        if (this.parent) this.parent.removeFromBin(this.gridKey, this);
        super.destroy();
    }

    pingAll(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAll(tag, this.translation, radius, this);
    }

    pingAny(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAny(tag, this.translation, radius, this);
    }
};
RegisterMixin(AM_OnGrid);

//------------------------------------------------------------------------------------------
// -- AM_NavGrid --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGrid = superclass => class extends AM_Grid(superclass) {

    static types() { return { "AM_NavGrid:NavNode": NavNode }}

    get isNavGrid() { return true}
    get noise() { return this._noise || 0}

    init(options) {
        super.init(options);
        this.navNodes = new Map();
        this.navClear();
    }

    navClear() {
        const perlin = new PerlinNoise();
        const halfSize = this.gridSize/2;
        for (let x = -halfSize; x < halfSize; x++) {
            for (let y = -halfSize; y < halfSize; y++) {
                const node = new NavNode(x,y);
                node.clear(this.gridSize);
                if (this.noise) node.effort += this.noise*perlin.noise2D(x,y);
                this.navNodes.set(node.key, node);
            }
        }

        this._say("navGridChanged");
    }

    addBlock(x,y) {

        const west = this.navNodes.get(packKey(x-1, y));
        const south = this.navNodes.get(packKey(x, y-1));
        const east = this.navNodes.get(packKey(x+1, y));
        const north = this.navNodes.get(packKey(x, y+1));

        const southwest = this.navNodes.get(packKey(x-1, y-1));
        const southeast = this.navNodes.get(packKey(x+1, y-1));
        const northeast = this.navNodes.get(packKey(x+1, y+1));
        const northwest = this.navNodes.get(packKey(x-1, y+1));

        if (west) west.exits[2] = 0;
        if (south) south.exits[3] = 0;
        if (east) east.exits[0] = 0;
        if (north) north.exits[1] = 0;

        if (southwest) southwest.exits[6] = 0;
        if (southeast) southeast.exits[7] = 0;
        if (northeast) northeast.exits[4] = 0;
        if (northwest) northwest.exits[5] = 0;

    }

    addHorizontalFence(x,y,length) {

        for ( let n = 0; n<length; n++) {

            const south = this.navNodes.get(packKey(x+n,y-1));
            const north = this.navNodes.get(packKey(x+n,y));

            if (south) south.exits[3] = 0;
            if (north) north.exits[1] = 0;

            if (n>0) {
                if (south) south.exits[7] = 0;
                if (north) north.exits[4] = 0;
            }

            if (n<length-1) {
                if (south) south.exits[6] = 0;
                if (north) north.exits[5] = 0;
            }
        }
    }

    addVerticalFence(x,y,length) {

        for ( let n = 0; n<length; n++) {

            const west = this.navNodes.get(packKey(x-1,y+n));
            const east = this.navNodes.get(packKey(x,y+n));

            if (west) west.exits[2] = 0;
            if (east) east.exits[0] = 0;

            if (n>0) {
                if (west) west.exits[5] = 0;
                if (east) east.exits[4] = 0;
            }

            if (n<length-1) {
                if (west) west.exits[6] = 0;
                if (east) east.exits[7] = 0;
            }
        }

    }

    isBlocked(from, aim) {
        const to = v3_add(from,aim);
        const fromKey = packKey(...v2_floor(this.gridXY(...from)));
        const toKey = packKey(...v2_floor(this.gridXY(...to)));
        if (fromKey === toKey) return false;
        const node = this.navNodes.get(fromKey);
        if (node) return !node.hasExitTo(toKey);
        return true;
    }

    findPath(startKey, endKey) {

        const path = [];

        if (!this.navNodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.navNodes.has(endKey)) return path;    // Invalid end waypoint
        if (startKey === endKey) return [startKey]; // already at destination

        const endXY = this.navNodes.get(endKey).xy;

        const frontier = new PriorityQueue((a, b) => a.priority < b.priority);
        const visited = new Map();

        frontier.push({priority: 0, key: startKey});
        visited.set(startKey, {from: startKey, cost: 0});

        let key;
        while (!frontier.isEmpty) {
            key = frontier.pop().key;
            if (key === endKey) break;
            const cost = visited.get(key).cost;
            const node = this.navNodes.get(key);
            node.exits.forEach((exit,n) => {
                if (!exit) return;
                const weight = node.weight(n);
                if (!visited.has(exit)) visited.set(exit, {}); // First time visited
                const next = visited.get(exit);
                if (!next.from || next.cost > cost + weight ) { // This route is better
                    next.from = key;
                    next.cost = cost + weight;
                    const heuristic = v2_manhattan(this.navNodes.get(exit).xy, endXY);
                    frontier.push({priority: next.cost + heuristic, key: exit});
                }
            });
        }

        if (key === endKey) { // A path was found!
            while (key !== startKey) { // Run backwards along "from" links to build path array
                path.push(key);
                key = visited.get(key).from;
            }
            path.push(startKey);
            path.reverse();
        }

        return path;
    }

};
RegisterMixin(AM_NavGrid);

//------------------------------------------------------------------------------------------
//-- NavNode -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class NavNode {
    constructor(x, y) {
        this.xy = [x,y];
        this.key = packKey(x,y);
        this.exits = [0,0,0,0, 0,0,0,0];
        this.effort = 1;
    }

    get west() { return this.exits[0] }
    get south() { return this.exits[1] }
    get east() { return this.exits[2] }
    get north() { return this.exits[3] }

    get southwest() { return this.exits[4] }
    get southeast() { return this.exits[5] }
    get northeast() { return this.exits[6] }
    get northwest() { return this.exits[7] }

    get hasExit() { return this.exits.some(e => e)}
    get isEmpty() { return !this.hasExit }

    hasExitTo(key) {
        if (key) return this.exits.some(e => e===key);
        return false;
    }

    exitTo(x,y) {
        const xx = Math.abs(x) > 2*Math.abs(y);
        const yy = Math.abs(y) > 2*Math.abs(x);

        if (x>0) { // east
            if (y>0) { // northeast
                if (xx) return this.east;
                if (yy) return this.north;
                return !this.northeast;
            } // southeast
            if (xx) return this.east;
            if (yy) return this.south;
            return this.southeast;
        } // west
        if (y>0) { // northwest
            if (xx) return this.west;
            if (yy) return this.north;
            return this.northwest;
        } // southwest
        if (xx) return this.west;
        if (yy) return this.south;
        return this.southwest;
    }

    clear(gridSize) {
        this.exits.fill(0);
        const x = this.xy[0];
        const y = this.xy[1];
        const min = -gridSize/2;
        const max = gridSize/2-1;

        if (x>min) this.exits[0] = packKey(x-1, y);
        if (y>min) this.exits[1] = packKey(x, y-1);
        if (x<max) this.exits[2] = packKey(x+1, y);
        if (y<max) this.exits[3] = packKey(x, y+1);

        if (x>min && y>min) this.exits[4] = packKey(x-1,y-1);
        if (x<max && y>min) this.exits[5] = packKey(x+1,y-1);
        if (x<max && y<max) this.exits[6] = packKey(x+1,y+1);
        if (x>min && y<max) this.exits[7] = packKey(x-1,y+1);
    }

    weight(n) {
        if (n>3) return 1.5 * this.effort;
        return this.effort;
    }

}

//------------------------------------------------------------------------------------------
// -- AM_OnNavGrid -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnNavGrid = superclass => class extends AM_OnGrid(superclass) {

    get obstacle() { return this._obstacle}

    init(options) {
        super.init(options);
        if (this.parent && this.obstacle) this.buildObstacle();
    }

    isBlocked(aim) {
        return this.parent.isBlocked(this.translation, aim);
    }

    buildObstacle() {
        this.parent.addBlock(...this.xy);
    }

};
RegisterMixin(AM_OnNavGrid);

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get radius() { return this._radius || 0}
    get speed() { return this._speed || 1}
    get target() {return this._target || this.actor.translation}

    do(delta) {
        const distance = this.speed * delta / 1000;

        const to = v3_sub(this.target, this.actor.translation);
        const left = v3_magnitude(to);

        if (left < this.radius) {
            this.succeed();
            return;
        }

        if (left<distance) {
            this.actor.set({translation:this.target});
            this.succeed();
            return;
        }

        const aim = v3_normalize(to);

        const x = aim[0] * distance;
        const y = aim[1] * distance;
        const z = aim[2] * distance;

        const translation = v3_add(this.actor.translation, [x,y,z]);
        const rotation = q_lookAt(this.actor.forward, this.actor.up, aim);

        this.actor.set({translation, rotation});

    }

}
GotoBehavior.register("GotoBehavior");

//------------------------------------------------------------------------------------------
//-- PathToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PathToBehavior extends Behavior {

    get target() {return this._target || this.actor.translation}
    get speed() { return this._speed || 3}
    get radius() { return this._radius || 0}
    get noise() { return this._noise || 0}

    onStart() {
        if (!this.actor.parent || !this.actor.parent.isNavGrid) {
            console.warn("PathToBehavior must be used on a NavGrid");
            this.fail();
        }

        const grid = this.actor.parent;
        const start = grid.gridXY(...this.actor.translation);
        const end = grid.gridXY(...this.target);
        const startKey = packKey(...v2_floor(start));
        const endKey = packKey(...v2_floor(end));


        this.path = grid.findPath(startKey, endKey);

        if (this.path.length === 0) { // No path to destination
            this.fail();
            return;
        }

        this.step = 0;

        if (this.path.length === 1) {
            this.goto = this.start({name: "GotoBehavior", speed: this.speed, target: this.target});
        } else {
            this.goto = this.start({name: "GotoBehavior", speed: this.speed, neverSucceed: true});
            this.nextStep();
        }

    }

    nextStep() {
        const grid = this.actor.parent;
        this.step++;
        if (this.step >  this.path.length-2) { // at end
            this.goto.set({target: this.target, radius: this.radius});
        } else {
            const xy = unpackKey(this.path[this.step]);
            this.addNoise(xy);
            const target = grid.gridXYZ(...xy);
            this.goto.set({target});
        }
    }

    addNoise(xy) {
        const s = this.actor.parent.gridScale;
        let x = 0.5;
        let y = 0.5;
        const n = this.noise/2;
        if (n) {
            x = (0.5-n/2) + n*this.random();
            y = (0.5-n/2) + n*this.random();
        }
        xy[0] += x; xy[1] += y;
        xy[0] *=s; xy[1] *=s;
    }

    onProgress() {
        if (this.step<this.path.length) {
            this.nextStep();
            this.progress(this.step/this.path.length);
        } else {
            this.progress(1);
            this.succeed();
        }
    }

    onFail() { this.fail() }

    onSucceed() { this.succeed() }

}
PathToBehavior.register("PathToBehavior");
