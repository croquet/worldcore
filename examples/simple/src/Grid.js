import { RegisterMixin } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
// -- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

function packKey(x,y) {
    if (x < 0 || y < 0 ) console.error("Negative AM_Grid coordinates!");
    return 0xF0000000|(x<<14)|y;
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

        const oldKey = this.binKey;
        this.binKey = this.parent.packKey(...value);

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
// -- AM_NavGrid ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_NavGrid = superclass => class extends AM_Grid(superclass) {

    static types() { return { "AM_NavGrid:NavNode": NavNode }}

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
