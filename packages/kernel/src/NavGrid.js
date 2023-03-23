import { RegisterMixin } from "./Mixins";
import { v2_manhattan } from "./Vector";
import { PriorityQueue } from "./Utilities";

//------------------------------------------------------------------------------------------
// Utilities ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function packKey(x,y) {
    return 0xF0000000|(x<<14)|y;
}

function unpackKey(key) {
    return [(key>>>14) & 0x3FFF,key & 0x3FFF];
}


//------------------------------------------------------------------------------------------
// AM_NavGrid ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGrid = superclass => class extends superclass {

    static types() {
        return { "AM_NavGrid:NavNode": NavNode };
    }

    get gridSize() { return this._gridSize || 4}
    get gridScale() { return this._gridScale || 2}
    get gridPlane() { return this._gridPlane || 0 } // 0 = xz, 1 = xy, 2 = yz
    get subdivisions() { return this._subdivisions || 1}

    init(options) {
        super.init(options)
        this.gridBins = new Map();
        this.navNodes = new Map();
        this.navClear();
    }

    destroy() {
        super.destroy();
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
        if (bin) bin.delete(child);
        child.gridBin = null;
    }

    navClear() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = new NavNode(x,y)
                node.clear(this.gridSize);
                this.navNodes.set(node.key, node);
            }
        }
    }

    addObstacle(x,y) {

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

    findPath(startKey, endKey) {

        const path = [];

        if (!this.navNodes.has(startKey)) return path;  // Invalid start waypoint
        if (!this.navNodes.has(endKey)) return path;    // Invalid end waypoint
        if (startKey === endKey) return [startKey] // already at destination

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
                if (!next.from || next.cost > cost + weight ){ // This route is better
                    next.from = key;
                    next.cost = cost + weight;
                    const heuristic = v2_manhattan(this.navNodes.get(exit).xy, endXY);
                    frontier.push({priority: next.cost + heuristic, key: exit});
                }
            })
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

}
RegisterMixin(AM_NavGrid);

//------------------------------------------------------------------------------------------
// AM_OnNavGrid ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnNavGrid = superclass => class extends superclass {

    get navXY() {
        const x = this.translation[0];
        const y = this.translation[1];
        const z = this.translation[2];
        const s = this.parent.gridScale;

        switch (this.parent.gridPlane) {
            default:
            case 0: return[Math.floor(x/s), Math.floor(z/s)];
            case 1: return[Math.floor(x/s), Math.floor(y/s)];
            case 2: return[Math.floor(y/s), Math.floor(z/s)];
        }
    }

    get navKey() {
        return packKey(...this.navXY);
    }

    destroy() {
        super.destroy();
        this.parent.removeFromBin(this.binKey, this);
    }

    parentSet(value,old) {
        super.parentSet(value,old);
        if(!this.parent || !this.parent.gridBins) console.warn("AM_OnNavGrid must have an AM_NavGrid parent");
    }

    translationSet(value, old) {
        super.translationSet(value,old);

        const oldKey = this.binKey;

        const s = this.parent.gridScale/this.parent.subdivisions;
        const x = value[0];
        const y = value[1];
        const z = value[2];
        if (x < 0 || y < 0 || z < 0 ) console.warn("Negative xyz coordinates are not allowed on an AM_NavGrid");

        switch (this.parent.gridPlane) {
            default:
            case 0: this.binXY = [Math.floor(x/s), Math.floor(z/s)]; break;
            case 1: this.binXY = [Math.floor(x/s), Math.floor(y/s)]; break;
            case 2: this.binXY = [Math.floor(y/s), Math.floor(z/s)]; break;
        }

        this.binKey = packKey(...this.binXY);

        if (this.binKey !== oldKey) {
            this.parent.removeFromBin(oldKey,this);
            this.parent.addToBin(this.binKey, this);
        }
    }

    findPathTo(target) {
        const x = target[0];
        const y = target[1];
        const z = target[2];
        const s = this.parent.gridScale;

        let endKey;

        switch (this.parent.gridPlane) {
            default:
            case 0: endKey = packKey(Math.floor(x/s), Math.floor(z/s)); break;
            case 1: endKey = packKey(Math.floor(x/s), Math.floor(y/s)); break;
            case 2: endKey = packKey(Math.floor(y/s), Math.floor(z/s)); break;
        }

        return this.parent.findPath(this.navKey, endKey);

    }

}
RegisterMixin(AM_OnNavGrid);

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

    get west() { return this.exits[0]; }
    get south() { return this.exits[1]; }
    get east() { return this.exits[2]; }
    get north() { return this.exits[3]; }

    get southwest() { return this.exits[4]; }
    get southeast() { return this.exits[5]; }
    get northeast() { return this.exits[6]; }
    get northwest() { return this.exits[7]; }

    get hasExit() { return this.exits.some(e => e)}
    get isEmpty() { return !this.hasExit; }

    clear(gridSize) {
        this.exits.fill(0);
        const x = this.xy[0];
        const y = this.xy[1];
        const max = gridSize-1

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