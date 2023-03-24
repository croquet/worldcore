import { RegisterMixin } from "./Mixins";
import { v2_manhattan, q_multiply, q_axisAngle, v3_normalize, v3_add, q_lookAt, v3_sub, v3_magnitude } from "./Vector";
import { PriorityQueue } from "./Utilities";
import { Behavior } from "./Behavior";



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
    get isNavGrid() {return true}

    init(options) {
        super.init(options)
        this.gridBins = new Map();
        this.navNodes = new Map();
        this.navClear();
    }

    destroy() {
        super.destroy();
    }

    packNavKey(x,y,z) {
        const s = this.gridScale;
        switch (this.gridPlane) {
            default:
            case 0: return packKey(Math.floor(x/s), Math.floor(z/s));
            case 1: return packKey(Math.floor(x/s), Math.floor(y/s));
            case 2: return packKey( Math.floor(y/s), Math.floor(z/s));
        }
    }

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

        this.addHorizontalFence(0,3,8);

        this.say("navGridChanged");
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

        this.say("navGridChanged");
    }

    removeObstacle(x,y) {
        const navKey = packKey(x,y);

        const west = this.navNodes.get(packKey(x-1, y));
        const south = this.navNodes.get(packKey(x, y-1));
        const east = this.navNodes.get(packKey(x+1, y));
        const north = this.navNodes.get(packKey(x, y+1));

        const southwest = this.navNodes.get(packKey(x-1, y-1));
        const southeast = this.navNodes.get(packKey(x+1, y-1));
        const northeast = this.navNodes.get(packKey(x+1, y+1));
        const northwest = this.navNodes.get(packKey(x-1, y+1));

        if (west) west.exits[2] = navKey;
        if (south) south.exits[3] = navKey;
        if (east) east.exits[0] = navKey;
        if (north) north.exits[1] = navKey;

        if (southwest) southwest.exits[6] = navKey;
        if (southeast) southeast.exits[7] = navKey;
        if (northeast) northeast.exits[4] = navKey;
        if (northwest) northwest.exits[5] = navKey;

        this.say("navGridChanged");
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

        this.say("navGridChanged");
    }

    removeHorizontalFence(x,y,length) {

        for ( let n = 0; n<length; n++) {

            const south = this.navNodes.get(packKey(x+n,y-1));
            const north = this.navNodes.get(packKey(x+n,y));

            if (south) south.exits[3] = packKey(x+n,y);
            if (north) north.exits[1] = packKey(x+n,y-1);

            if (n>0) {
                if (south) south.exits[7] = packKey(x+n-1,y);
                if (north) north.exits[4] = packKey(x+n-1,y-1);
            }

            if (n<length-1) {
                if (south) south.exits[6] = packKey(x+n+1,y);
                if (north) north.exits[5] = packKey(x+n+1,y-1);
            }
        }

        this.say("navGridChanged");
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
        this.say("navGridChanged");
    }

    removeVerticalFence(x,y,length) {

        for ( let n = 0; n<length; n++) {

            const west = this.navNodes.get(packKey(x-1,y+n));
            const east = this.navNodes.get(packKey(x,y+n));

            if (west) west.exits[2] = packKey(x,y+n);
            if (east) east.exits[0] = packKey(x-1,y+n);

            if (n>0) {
                if (west) west.exits[5] = packKey(x,y+n-1); //se
                if (east) east.exits[4] = packKey(x-1,y+n-1); //sw
            }

            if (n<length-1) {
                if (west) west.exits[6] = packKey(x,y+n); //ne
                if (east) east.exits[7] = packKey(x-1,y+n); //nw
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

    init(options) {
        super.init(options);
        if (this.obstacle) this.parent.addObstacle(...this.navXY);
    }

    destroy() {
        if (this.obstacle) this.parent.removeObstacle(...this.navXY);
        this.parent.removeFromBin(this.binKey, this);
        super.destroy();
    }

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

    get obstacle() { return this._obstacle}

    parentSet(value,old) {
        super.parentSet(value,old);
        if(this.parent && !this.parent.isNavGrid) console.warn("AM_OnNavGrid must have a NavGrid parent!");
    }

    translationSet(value, old) {
        super.translationSet(value,old);
        if (old && this.obstacle) console.warn("NavGrid obstacles can't move!");

        const oldKey = this.binKey;

        const s = this.parent.gridScale/this.parent.subdivisions;
        const x = value[0];
        const y = value[1];
        const z = value[2];
        if (x < 0 || y < 0 || z < 0 ) console.warn("Negative xyz coordinates are not allowed on an NavGrid!");

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

    obstacleSet(value,old) {
        if (!this.parent) return;
        if (old) this.parent.removeObstacle(...this.navXY);
        if (value) this.parent.addObstacle(...this.navXY);
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
            console.log("no path!")
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
        let x =0.5;
        let y =0.5;
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