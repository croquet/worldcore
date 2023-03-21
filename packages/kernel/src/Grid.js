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

    get gridSize() { return this._gridSize || 10}
    get gridScale() { return this._gridScale || 10}
    get gridPlane() { return this._gridPlane || "xy" }
    get subdivisions() { return this._subdivisions || 2}


    init(options) {
        super.init(options)
        this.gridBins = new Map();
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

        if (x < 0 ) console.warn("AM_OnGrid: x<0");
        if (y < 0 ) console.warn("AM_OnGrid: y<0");
        if (z < 0 ) console.warn("AM_OnGrid: z<0");

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