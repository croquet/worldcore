import { RegisterMixin } from "./Mixins";

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
// AM_Grid ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Grid = superclass => class extends superclass {

    static types() {
        return { "AM_Grid:NavNode": Node };
    }

    get gridSize() { return this._gridSize || 4}
    get gridScale() { return this._gridScale || 10}
    get gridPlane() { return this._gridPlane || "xz" }
    get subdivisions() { return this._subdivisions || 2}


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
                const node = new Node(x,y)
                node.clear(this.gridSize);
                this.navNodes.set(node.key, node);
            }
        }

    }

}
RegisterMixin(AM_Grid);

//------------------------------------------------------------------------------------------
// AM_OnGrid -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_OnGrid = superclass => class extends superclass {

    init(options) {
        super.init(options)
    }

    destroy() {
        super.destroy();
        this.parent.removeFromBin(this.gridKey, this);
    }

    parentSet(value,old) {
        super.parentSet(value,old);
        if(!this.parent || !this.parent.gridBins) console.warn("AM_OnGrid must have an AM_Grid parent");
    }

    translationSet(value, old) {
        super.translationSet(value,old);

        if (!this.parent || !this.parent.gridBins) return;

        const ss = this.parent.gridScale/this.parent.subdivisions
        const oldKey = this.gridKey;
        const x = Math.floor(value[0]/ss);
        const y = Math.floor(value[1]/ss);
        const z = Math.floor(value[2]/ss);

        if (x < 0 || y < 0 || z < 0 ) console.warn("Negative xyz coordinates are not allowed in an AM_Grid");

        let k;
        switch (this.parent.gridPlane) {
            default:
            case "xy": k = packKey(x,y); break;
            case "yz": k = packKey(y,z); break;
            case "xz": k = packKey(x,z); break;
        }

        this.gridKey = k
        if (this.gridKey !== oldKey) {
            this.parent.removeFromBin(oldKey,this);
            this.parent.addToBin(this.gridKey, this);
        }
    }

}
RegisterMixin(AM_OnGrid);

//------------------------------------------------------------------------------------------
//-- Node ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Node {
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