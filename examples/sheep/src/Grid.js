import { RegisterMixin, PriorityQueue, v2_manhattan, Behavior, v3_sub, v3_magnitude, v3_normalize, v3_add, q_lookAt } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
// -- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function packKey(x,y) {
    if (x < 0 || y< 0 ) return 0;
    return ((0x8000|x)<<16)|y;
}

function unpackKey(key) {
    return [(key>>>16) & 0x7FFF,key & 0x7FFF];
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

    packKey(x,y,z) {
        const s = this.gridScale;
        switch (this.gridPlane) {
            default:
            case 0: return packKey(Math.floor(x/s), Math.floor(z/s));
            case 1: return packKey(Math.floor(x/s), Math.floor(y/s));
            case 2: return packKey(Math.floor(y/s), Math.floor(z/s));
        }
    }

    unpackKey(key) {
        const s = this.gridScale;
        const xy = unpackKey(key);
        switch (this.gridPlane) {
            default:
            case 0: return [s*xy[0], 0, s*xy[1]];
            case 1: return [s*xy[0], s*xy[1], 0];
            case 2: return [0, s*xy[0], s*xy[1]];
        }
    }

    gridXY(x,y,z) {
        const s = this.gridScale;
        switch (this.gridPlane) {
            default:
            case 0: return [Math.floor(x/s), Math.floor(z/s)];
            case 1: return [Math.floor(x/s), Math.floor(y/s)];
            case 2: return [Math.floor(y/s), Math.floor(z/s)];
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
        if (x<0 || y<0) return null;
        const key = packKey(x,y);
        return this.bins.get(key);
    }

    pingAll(tag, cx, cy, radius=0) {     // returns an array of all actors with tag in radius
        const out = [];

        for (const actor of this.getBin(cx, cy)) {
            if (actor !== this && actor.tags.has(tag)) out.push(actor);
        }

        for (let n = 1; n<=radius; n++) {
            const x0 = Math.max(0,cx-n);
            const y0 = Math.max(0,cy-n);
            const x1 = cx+n;
            const y1 = cx+n;

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y0);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x0,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y1);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x1,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

        }

        return out;
    }

    pingAny(tag, cx, cy, radius=0) { // Returns the first actor it finds in the radius

        for (const actor of this.getBin(cx, cy)) {
            if (actor !== this && actor.tags.has(tag)) return actor;
        }

        for (let n = 1; n<=radius; n++) {
            const x0 = cx-n;
            const x1 = cx+n;
            const y0 = cy-n;
            const y1 = cx+n;

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y0);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) return actor;
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x0,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) return actor;
                }
            }

            for (let x = x0; x<=x1; x++) {
                const bin = this.getBin(x,y1);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) return actor;
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const bin = this.getBin(x1,y);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) return actor;
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

    get gridXY() { return this.parent.gridXY(...this.translation) }

    destroy() {
        if (this.parent) this.parent.removeFromBin(this.binKey, this);
        super.destroy();
    }

    translationSet(value, old) {
        super.translationSet(value,old);
        if (!this.parent || !this.parent.isGrid) { console.error("AM_OnGrid must have an AM_Grid parent!"); return}
        const xy = this.parent.gridXY(...value);
        if (xy[0]<0 || xy[1]<0 ) console.error("Off grid: " + xy);

        const oldKey = this.binKey;
        this.binKey = packKey(...xy);

        if (this.binKey !== oldKey) {
            this.parent.removeFromBin(oldKey,this);
            this.parent.addToBin(this.binKey, this);
        }
    }

    pingAll(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAll(tag, ...this.gridXY, radius);
    }

    pingAny(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAny(tag, ...this.gridXY, radius);
    }
};
RegisterMixin(AM_OnGrid);

//------------------------------------------------------------------------------------------
// -- AM_NavGridX ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGridX = superclass => class extends AM_Grid(superclass) {

    static types() { return { "AM_NavGrid:NavNode": NavNode }}

    init(options) {
        super.init(options);
        this.navNodes = new Map();
        this.navClear();
    }

    navClear() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = new NavNode(x,y);
                node.clear(this.gridSize);
                this.navNodes.set(node.key, node);
            }
        }

        this.say("navGridChanged");
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
RegisterMixin(AM_NavGridX);

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

    hasExitTo(key) { return this.exits.some(e => e===key)}

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
        const max = gridSize-1;

        if (x>0) this.exits[0] = packKey(x-1, y);
        if (y>0) this.exits[1] = packKey(x, y-1);
        if (x<max) this.exits[2] = packKey(x+1, y);
        if (y<max) this.exits[3] = packKey(x, y+1);

        if (x>0 && y>0) this.exits[4] = packKey(x-1,y-1);
        if (x<max && y>0) this.exits[5] = packKey(x+1,y-1);
        if (x<max && y<max) this.exits[6] = packKey(x+1,y+1);
        if (x>0 && y<max) this.exits[7] = packKey(x-1,y+1);
    }

    weight(n) {
        if (n>3) return 1.5 * this.effort;
        return this.effort;
    }

}

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves to a target point

class GotoBehaviorX extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get radius() { return this._radius || 0}
    get speed() { return this._speed || 3}
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
GotoBehaviorX.register("GotoBehaviorX");

