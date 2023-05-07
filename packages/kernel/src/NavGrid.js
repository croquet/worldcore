import { RegisterMixin } from "./Mixins";
import { v2_manhattan, q_multiply, q_axisAngle, v3_normalize, v3_add, q_lookAt, v3_sub, v3_magnitude, v3_distance, v2_normalize, v2_sub,
        v3_rotateX, v3_rotateY, v3_rotateZ, toRad, v3_max, v2_scale, v2_add, v2_floor, v2_magnitude, v2_signedAngle }from "./Vector";
import { PerlinNoise, PriorityQueue } from "./Utilities";
import { Behavior } from "./Behavior";

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
// Utilities ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// function packKey(x,y) {
//     return 0xF0000000|(x<<14)|y;
// }

// function unpackKey(key) {
//     return [(key>>>14) & 0x3FFF,key & 0x3FFF];
// }

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
            case 0: return [Math.floor(x/s), Math.floor(z/s)];
            case 1: return [Math.floor(x/s), Math.floor(y/s)];
            case 2: return [Math.floor(y/s), Math.floor(z/s)];
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
        if (x<0 || y<0) return null;
        const key = packKey(x,y);
        return this.gridBins.get(key);
    }

    pingAll(tag, cx, cy, radius=0, exclude) {     // returns an array of all actors with tag in radius
        const out = [];

        for (const actor of this.getBin(cx, cy)) {
            if (actor !== exclude && actor.tags.has(tag)) out.push(actor);
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

    pingAny(tag, cx, cy, radius=0, exclude) { // Returns the first actor it finds in the radius

        let bin = this.getBin(cx, cy);
        if (bin) {
            for (const actor of bin) {
                if (actor !== exclude && actor.tags.has(tag)) return actor;
            }
        }

        for (let n = 1; n<=radius; n++) {
            const x0 = cx-n;
            const x1 = cx+n;
            const y0 = cy-n;
            const y1 = cx+n;

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

    xySet(xy) {
        if (!this.parent || !this.parent.isGrid) { console.error("AM_OnGrid must have an AM_Grid parent!"); return}
        const scaled = v2_scale(xy, this.parent.gridScale);
        const translation = this.parent.gridXYZ(...scaled);
        this.set({translation});

        if (xy[0]<0 || xy[1]<0 ) console.error("Off grid: " + xy);

        const oldKey = this.gridKey;
        this.gridKey = packKey(...xy);

        if (this.gridKey !== oldKey) {
            this.parent.removeFromBin(oldKey,this);
            this.parent.addToBin(this.gridKey, this);
        }
    }

    destroy() {
        if (this.parent) this.parent.removeFromBin(this.binKey, this);
        super.destroy();
    }

    pingAll(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAll(tag, ...this.xy, radius, this);
    }

    pingAny(tag, radius = 0) {
        if (!this.parent || !this.parent.isGrid) { console.error("Ping requires an AM_Grid!"); return []}
        return this.parent.pingAny(tag, ...this.xy, radius, this);
    }
};
RegisterMixin(AM_OnGrid);

//------------------------------------------------------------------------------------------
// AM_NavGrid ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGrid = superclass => class extends superclass {

    static types() {
        return { "AM_NavGrid:NavNode": NavNode };
    }

    get gridSize() { return this._gridSize || 16}
    get gridScale() { return this._gridScale || 1}
    get gridPlane() { return this._gridPlane || 0 } // 0 = xz, 1 = xy, 2 = yz
    get subdivisions() { return this._subdivisions || 4}
    get noise() { return this._noise || 0}
    get isNavGrid() {return true}

    init(options) {
        super.init(options);
        this.gridBins = new Map();
        this.navNodes = new Map();
        this.gridObstacles = new Set();
        this.navClear();
    }

    destroy() {
        super.destroy();
    }

    binXY(x,y,z) {
        const s = this.gridScale/this.subdivisions;
        switch (this.gridPlane) {
            default:
            case 0: return [Math.floor(x/s), Math.floor(z/s)];
            case 1: return [Math.floor(x/s), Math.floor(y/s)];
            case 2: return [Math.floor(y/s), Math.floor(z/s)];
        }
    }

    navXY(x,y,z) {
        const s = this.gridScale;
        switch (this.gridPlane) {
            default:
            case 0: return [Math.floor(x/s), Math.floor(z/s)];
            case 1: return [Math.floor(x/s), Math.floor(y/s)];
            case 2: return [Math.floor(y/s), Math.floor(z/s)];
        }
    }

    packNavKey(x,y,z) {
        return packKey(...this.navXY(x,y,z));
    }

    // packNavKey(x,y,z) {
    //     const s = this.gridScale;
    //     switch (this.gridPlane) {
    //         default:
    //         case 0: return packKey(Math.floor(x/s), Math.floor(z/s));
    //         case 1: return packKey(Math.floor(x/s), Math.floor(y/s));
    //         case 2: return packKey( Math.floor(y/s), Math.floor(z/s));
    //     }
    // }

    unpackNavKey(key){
        const s = this.gridScale;
        const xy = unpackKey(key);
        switch (this.gridPlane) {
            default:
            case 0: return [s*xy[0], 0, s*xy[1]];
            case 1: return [s*xy[0], s*xy[1], 0];
            case 2: return [0, s*xy[0], s*xy[1]];
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
            if (bin.size === 0)this.gridBins.delete(key);
        }
        child.gridBin = null;
    }

    addObstacle(child){
        this.gridObstacles.add(child);
        child.drawObstacles()
    }

    removeObstacle(child){
        this.gridObstacles.delete(child);
        this.navClear();
        for (const o of this.gridObstacles) o.drawObstacles();
    }

    navClear() {
        const perlin = new PerlinNoise();
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = new NavNode(x,y)
                node.clear(this.gridSize);
                if (this.noise) node.effort += this.noise*perlin.noise2D(x,y);
                this.navNodes.set(node.key, node);
            }
        }

        this.say("navGridChanged");
    }

    drawBlock(x,y) {

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

        this.say("navGridChanged");
    }

    drawHorizontalFence(x,y,length) {

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

        this.say("navGridChanged");
    }

    drawVerticalFence(x,y,length) {

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
        this.say("navGridChanged");
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
                if (!next.from || next.cost > cost + weight ) { // This route is better
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

    // findWay(startKey, aim) {
    //     const node = this.navNodes.get(startKey);
    //     if (!node) return startKey;  // Invalid start waypoint
    //     const x = aim[0];
    //     const y = aim[1];
    //     const xx = Math.abs(x) > 2*Math.abs(y);
    //     const yy = Math.abs(y) > 2*Math.abs(x);

    //     let d=[];
    //     if(x>0) { // east
    //         if (y>0) { // northeast
    //             d=[6,2,3,7,5];
    //             if (xx) d = [2,6,3,5,7]
    //             if (yy) d = [3,6,2,7,5]
    //         } else { // southeast
    //             d=[5,1,2,6,4];
    //             if (xx) d = [2,5,1,6,4]
    //             if (yy) d = [1,5,2,4,6]
    //         }
    //     } else { // west
    //         if (y>0) { // northwest
    //             d=[7,3,0,6,4];
    //             if (xx) d = [0,7,3,4,6]
    //             if (yy) d = [3,7,0,6,4]
    //         } else { // southwest
    //             d=[4,0,1,5,7];
    //             if (xx) d = [0,4,1,7,5]
    //             if (yy) d = [1,4,0,5,7]
    //         }
    //     }

    //     for(const n of d) {
    //         const exit = node.exits[n];
    //         if (exit) return exit;
    //     }

    //     return startKey;
    // }


};
RegisterMixin(AM_NavGrid);

//------------------------------------------------------------------------------------------
// AM_OnNavGrid ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnNavGrid = superclass => class extends superclass {

    init(options) {
        super.init(options);
        if (this.parent && this.obstacle) this.parent.addObstacle(this);
    }

    destroy() {
        // super.destroy();
        if (this.parent) {
            this.parent.removeFromBin(this.binKey, this);
            if (this.obstacle) this.parent.removeObstacle(this);
        }
        super.destroy();
    }

    get navXY() {
        return this.parent.navXY(...this.translation);
    }

    // get navXY() {
    //     const x = this.translation[0];
    //     const y = this.translation[1];
    //     const z = this.translation[2];
    //     const s = this.parent.gridScale;

    //     switch (this.parent.gridPlane) {
    //         default:
    //         case 0: return[Math.floor(x/s), Math.floor(z/s)];
    //         case 1: return[Math.floor(x/s), Math.floor(y/s)];
    //         case 2: return[Math.floor(y/s), Math.floor(z/s)];
    //     }

    // }

    get navKey() {
        return this.parent.packNavKey(...this.translation);
    }

    // get navKey() {
    //     return packKey(...this.navXY);
    //     // return this.packXYZ(...this.translation)
    // }

    get navNode() {
        const n = this.parent.navNodes.get(this.navKey);
        if (!n) console.error(this + " offNavGrid");
        return n
    }

    get obstacle() { return this._obstacle}

    obstacleSet(value,old) {
        if (!this.parent) return;
        if (old) {
            this.parent.removeObstacle(this);
        }
        if (value) {
            this.parent.addObstacle(this);
        }
    }

    drawObstacles(){ // default
        this.parent.drawBlock(...this.navXY)
    }
    parentSet(value,old) {
        super.parentSet(value,old);
        if(this.parent && !this.parent.isNavGrid) console.warn("AM_OnNavGrid must have a NavGrid parent!");
    }

    translationSet(value, old) {
        super.translationSet(value,old);
        if(!this.parent || !this.parent.isNavGrid) console.error("AM_OnNavGrid must have a NavGrid parent!");
        if (old && this.obstacle) console.warn("NavGrid obstacles can't move!");

        const oldKey = this.binKey;
        this.binXY = this.parent.binXY(...value);

        // const s = this.parent.gridScale/this.parent.subdivisions;
        // const x = value[0];
        // const y = value[1];
        // const z = value[2];

        // switch (this.parent.gridPlane) {
        //     default:
        //     case 0: this.binXY = [Math.floor(x/s), Math.floor(z/s)]; break;
        //     case 1: this.binXY = [Math.floor(x/s), Math.floor(y/s)]; break;
        //     case 2: this.binXY = [Math.floor(y/s), Math.floor(z/s)]; break;
        // }

        if (this.binXY[0] < 0 || this.binXY[1] < 0 ) console.warn("Negative coordinates are not allowed on a NavGrid!");

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

    /// isBlocked (start, aim) ... instead of assuming translation. Probaly up in the grid.

    isBlocked(aim) {
        const target = v3_add(aim, this.translation);
        const x = target[0];
        const y = target[1];
        const z = target[2];
        const s = this.parent.gridScale;
        let key;
        switch (this.parent.gridPlane) {
            default:
                case 0: key = packKey(Math.floor(x/s), Math.floor(z/s)); break;
                case 1: key = packKey(Math.floor(x/s), Math.floor(y/s)); break;
                case 2: key = packKey(Math.floor(y/s), Math.floor(z/s)); break;
        }
        if (this.navKey !== key) {
            // console.log("boundary");
            if (!this.navNode.hasExitTo(key)) {
                // console.log("block");
                return true;
            }
        }

        return false;


        // if(this.navKey===key) {
        //     return false
        // } else {
        //     console.log(key)
        //     console.log(this.navNode.exits);
        //     console.log(!this.navNode.hasExitTo(key));
        //     return !this.navNode.hasExitTo(key);

        // }

    }

    // findWay(start, aim) ... instead of assuming translation.

    findWay(aim) {
        if (!this.isBlocked(aim)) return aim;

        let left;
        let right;

        switch (this.parent.gridPlane) {
            default:
            case 0: left = v3_rotateY(aim, toRad(45)); right = v3_rotateY(aim, toRad(-45)); break;
            case 1: left = v3_rotateZ(aim, toRad(45)); right = v3_rotateZ(aim, toRad(-45)); break;
            case 2: left = v3_rotateX(aim, toRad(45)); right = v3_rotateX(aim, toRad(-45)); break;
        }

        if (!this.isBlocked(left)) return v3_max(left, [0,0,0]);
        if (!this.isBlocked(right)) return v3_max(right, [0,0,0]);

        switch (this.parent.gridPlane) {
            default:
            case 0: left = v3_rotateY(aim, toRad(90)); right = v3_rotateY(aim, toRad(-90)); break;
            case 1: left = v3_rotateZ(aim, toRad(90)); right = v3_rotateZ(aim, toRad(-90)); break;
            case 2: left = v3_rotateX(aim, toRad(90)); right = v3_rotateX(aim, toRad(-90)); break;
        }

        if (!this.isBlocked(left)) return v3_max(left, [0,0,0]);
        if (!this.isBlocked(right)) return v3_max(right, [0,0,0]);

        return [0,0,0];
    }

    pingXYZ(tag, xyz, radius=0) {
        const out = [];
        const binXY = this.parent.binXY(...xyz);
        const cx = binXY[0];
        const cy = binXY[1];
        const grid = this.parent;
        const bins = grid.gridBins;
        const ss = grid.gridScale*grid.subdivisions;
        const max = Math.max(1,Math.floor(radius/ss));

        for (const actor of this.gridBin) {
            if (actor !== this && actor.tags.has(tag)) out.push(actor);
        }

        for (let n = 1; n<=max; n++) {
            const x0 = cx-n;
            const x1 = cx+n;
            const y0 = cy-n;
            const y1 = cx+n;

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y0);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x0,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y1);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x1,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

        }

        return out.sort((a,b) => {
            const aDistance = v3_distance(this.translation, a.translation);
            const bDistance = v3_distance(this.translation, b.translation);
            return aDistance-bDistance;
        });
    }

    ping(tag, radius=0) {
        const out = [];
        const cx = this.binXY[0];
        const cy = this.binXY[1];
        const grid = this.parent;
        const bins = grid.gridBins;
        const ss = grid.gridScale*grid.subdivisions;
        const max = Math.max(1,Math.floor(radius/ss));

        for (const actor of this.gridBin) {
            if (actor !== this && actor.tags.has(tag)) out.push(actor);
        }

        for (let n = 1; n<=max; n++) {
            const x0 = cx-n;
            const x1 = cx+n;
            const y0 = cy-n;
            const y1 = cx+n;

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y0);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x0,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y1);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x1,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

        }

        return out.sort((a,b) => {
            const aDistance = v3_distance(this.translation, a.translation);
            const bDistance = v3_distance(this.translation, b.translation);
            return aDistance-bDistance;
        });
    }

    pingClosest(tag, radius=0) {
        const out = [];

        for (const actor of this.gridBin) {
            if (actor !== this && actor.tags.has(tag)) out.push(actor);

        }

        if (out.length > 0) {
            out.sort((a,b) => {
                const aDistance = v3_distance(this.translation, a.translation);
                const bDistance = v3_distance(this.translation, b.translation);
                return aDistance-bDistance;
            });
            return out[0];
        }

        const cx = this.binXY[0];
        const cy = this.binXY[1];
        const grid = this.parent;
        const bins = grid.gridBins;
        const ss = grid.gridScale*grid.subdivisions;
        const max = Math.max(1,Math.floor(radius/ss));

        for (let n = 1; n<=max; n++) {
            const x0 = cx-n;
            const x1 = cx+n;
            const y0 = cy-n;
            const y1 = cx+n;

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y0);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x0,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let x = x0; x<=x1; x++) {
                const key = packKey(x,y1);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            for (let y = y0+1; y<y1; y++) {
                const key = packKey(x1,y);
                const bin = bins.get(key);
                if (!bin) continue;
                for (const actor of bin) {
                    if (actor.tags.has(tag)) out.push(actor);
                }
            }

            if (out.length > 0) {
                out.sort((a,b) => {
                    const aDistance = v3_distance(this.translation, a.translation);
                    const bDistance = v3_distance(this.translation, b.translation);
                    return aDistance-bDistance;
                });
                return out[0];
            }

        }
        return null;

    }

};
RegisterMixin(AM_OnNavGrid);

//------------------------------------------------------------------------------------------
// -- AM_NavGridX --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGridX = superclass => class extends AM_Grid(superclass) {

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
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = new NavNode(x,y);
                node.clear(this.gridSize);
                if (this.noise) node.effort += this.noise*perlin.noise2D(x,y);
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

    isBlocked(from, aim) {
        const to = v2_add(from,aim);
        const fromKey = packKey(...v2_floor(from));
        const toKey = packKey(...v2_floor(to));
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
// -- AM_OnNavGridX ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnNavGridX = superclass => class extends AM_OnGrid(superclass) {

    get obstacle() { return this._obstacle}

    init(options) {
        super.init(options);
        if (this.parent && this.obstacle) this.buildObstacle();
    }

    isBlocked(aim) {
        return this.parent.isBlocked(this.xy, aim);
    }

    buildObstacle() {
        this.parent.addBlock(...this.xy);
    }

};
RegisterMixin(AM_OnNavGridX);

// class NavNode {
//     constructor(x, y) {
//         this.xy = [x,y];
//         this.key = packKey(x,y);
//         this.exits = [0,0,0,0, 0,0,0,0];
//         this.effort = 1;
//     }

//     get west() { return this.exits[0]; }
//     get south() { return this.exits[1]; }
//     get east() { return this.exits[2]; }
//     get north() { return this.exits[3]; }

//     get southwest() { return this.exits[4]; }
//     get southeast() { return this.exits[5]; }
//     get northeast() { return this.exits[6]; }
//     get northwest() { return this.exits[7]; }

//     get hasExit() { return this.exits.some(e => e)}
//     get isEmpty() { return !this.hasExit; }

//     hasExitTo(key) { return this.exits.some(e => e===key)}

//     exitTo(x,y) {
//         const xx = Math.abs(x) > 2*Math.abs(y);
//         const yy = Math.abs(y) > 2*Math.abs(x);

//         if(x>0) { // east
//             if (y>0) { // northeast
//                 if (xx) return this.east;
//                 if (yy) return this.north;
//                 return !this.northeast
//             } else { // southeast
//                 if (xx) return this.east;
//                 if (yy) return this.south;
//                 return this.southeast
//             }
//         } else { // west
//             if (y>0) { // northwest
//                 if (xx) return this.west;
//                 if (yy) return this.north
//                 return this.northwest
//             } else { // southwest
//                 if (xx) return this.west;
//                 if (yy) return this.south;
//                 return this.southwest
//             }
//         }
//     }

//     clear(gridSize) {
//         this.exits.fill(0);
//         const x = this.xy[0];
//         const y = this.xy[1];
//         const max = gridSize-1

//         if (x>0) this.exits[0] = packKey(x-1, y);
//         if (y>0) this.exits[1] = packKey(x, y-1);
//         if (x<max) this.exits[2] = packKey(x+1, y);
//         if (y<max) this.exits[3] = packKey(x, y+1);

//         if (x>0 && y>0) this.exits[4] = packKey(x-1,y-1);
//         if (x<max && y>0) this.exits[5] = packKey(x+1,y-1);
//         if (x<max && y<max) this.exits[6] = packKey(x+1,y+1);
//         if (x>0 && y<max) this.exits[7] = packKey(x-1,y+1);
//     }

//     weight(n) {
//         if (n>3) return 1.5 * this.effort;
//         return this.effort;
//     }

// }

//------------------------------------------------------------------------------------------
//-- GoBehavior ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Move in a straight line

class GoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get aim() {return this._aim || [0,0,1]}
    get speed() { return this._speed || 3}

    aimSet(a) {
        this._aim = v3_normalize(a);
        const rotation = q_lookAt(this.actor.forward, this.actor.up, this.aim);
        this.actor.set({rotation});
    }

    do(delta) {
        const distance = this.speed * delta / 1000;

        const x = this.aim[0] * distance;
        const y = this.aim[1] * distance;
        const z = this.aim[2] * distance;

        const translation = v3_add(this.actor.translation, [x,y,z]);

        this.actor.set({translation});

    }

}
GoBehavior.register("GoBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Moves to a target point

class GotoBehavior extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get radius() { return this._radius || 0}
    get speed() { return this._speed || 3}
    get target() {return this._target || this.actor.translation}

    do(delta) {
        let distance = this.speed * delta / 1000;

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

        let x = aim[0] * distance;
        let y = aim[1] * distance;
        let z = aim[2] * distance;

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

    get target() {return this._target}
    get speed() { return this._speed || 3}
    get radius() { return this._radius || 0}
    get noise() { return this._noise || 0}

    onStart() {
        if (!this.actor.parent || !this.actor.parent.isNavGrid) {
            console.warn("PathToBehavior must be used on a NavGrid");
            this.fail();
        }

        const grid = this.actor.parent;
        const startKey = this.actor.navKey;
        const endKey = grid.packNavKey(... this.target);

        this.path = grid.findPath(startKey, endKey);

        if (this.path.length === 0) { // No path to destination
            // console.log("no path!")
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
        this.step++
        if (this.step >  this.path.length-2) { // at end
            this.goto.set({target: this.target, radius: this.radius});
        } else {
            const grid = this.actor.parent;
            const target = grid.unpackNavKey(this.path[this.step]);
            this.correctHeight(target);
            this.addNoise(target);
            this.goto.set({target})
        }
    }

    correctHeight(xyz) {
        switch (this.actor.parent.gridPlane) {
            default:
            case 0: xyz[1] = this.actor.translation[1]; break;
            case 1: xyz[2] = this.actor.translation[2]; break;
            case 2: xyz[0] = this.actor.translation[0]; break;
        }
    }

    addNoise(xyz) {
        const grid = this.actor.parent;
        const s = grid.gridScale;
        const n = this.noise/2;
        let x = 0.5;
        let y = 0.5;
        if (n) {
            x = (0.5-n/2) + n*this.random()
            y = (0.5-n/2) + n*this.random()
        }

        switch (grid.gridPlane) {
            default:
            case 0: xyz[0] += x*s; xyz[2] += y*s; break;
            case 1: xyz[0] += x*s; xyz[1] += y*s; break;
            case 2: xyz[1] += x*s; xyz[2] += y*s; break;
        }
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

    onFail() {
        this.fail();
    }

    onSucceed() {
        this.succeed();
    }

}
PathToBehavior.register("PathToBehavior");

//------------------------------------------------------------------------------------------
//-- GotoBehaviorX -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class GotoBehaviorX extends Behavior {

    get tickRate() { return this._tickRate || 50} // More than 15ms for smooth movement

    get radius() { return this._radius || 0}
    get speed() { return this._speed || 1}
    get xy() {return this._xy || this.actor.xy}

    do(delta) {
        const distance = this.speed * delta / 1000;

        const to = v2_sub(this.xy, this.actor.xy);
        const left = v2_magnitude(to);

        if (left < this.radius) {
            this.succeed();
            return;
        }

        if (left<distance) {
            this.actor.set({xy:this.xy});
            this.succeed();
            return;
        }

        const aim = v2_normalize(to);

        const x = aim[0] * distance;
        const y = aim[1] * distance;

        const xy = v2_add(this.actor.xy, [x,y]);
        const angle = v2_signedAngle([0,1], aim);
        const rotation = q_axisAngle(this.actor.up, -angle);

        this.actor.set({xy, rotation});

    }

}
GotoBehaviorX.register("GotoBehaviorX");

//------------------------------------------------------------------------------------------
//-- PathToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class PathToBehaviorX extends Behavior {

    get xy() {return this._xy || this.actor.xy}
    get speed() { return this._speed || 3}
    get radius() { return this._radius || 0}
    get noise() { return this._noise || 0}

    onStart() {
        if (!this.actor.parent || !this.actor.parent.isNavGrid) {
            console.warn("PathToBehavior must be used on a NavGrid");
            this.fail();
        }


        const grid = this.actor.parent;
        const startKey = packKey(...v2_floor(this.actor.xy));
        const endKey = packKey(...v2_floor(this.xy));

        this.path = grid.findPath(startKey, endKey);

        if (this.path.length === 0) { // No path to destination
            this.fail();
            return;
        }

        this.step = 0;

        if (this.path.length === 1) {
            this.goto = this.start({name: "GotoBehaviorX", speed: this.speed, xy: this.xy});
        } else {
            this.goto = this.start({name: "GotoBehaviorX", speed: this.speed, neverSucceed: true});
            this.nextStep();
        }

    }

    nextStep() {
        this.step++;
        if (this.step >  this.path.length-2) { // at end
            this.goto.set({xy: this.xy, radius: this.radius});
        } else {
            const xy = unpackKey(this.path[this.step]);
            this.addNoise(xy);
            this.goto.set({xy});
        }
    }

    addNoise(xy) {
        let x = 0.5;
        let y = 0.5;
        const n = this.noise/2;
        if (n) {
            x = (0.5-n/2) + n*this.random();
            y = (0.5-n/2) + n*this.random();
        }
        xy[0] += x; xy[1] += y;
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

    onSucceed() {  this.succeed()}

}
PathToBehaviorX.register("PathToBehaviorX");
