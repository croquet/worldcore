

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

    get gridScale() {return this._gridScale || 3}
    get gridX() {return this._gridX || 10}
    get gridY() {return this._gridY || 10}

    init(options) {
        super.init(options)

    }

    destroy() {
        super.destroy();
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
    }

}
RegisterMixin(AM_OnGrid);