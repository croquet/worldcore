import { ModelService, Constants } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Constants -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.sizeX = 32;
Constants.sizeY = 32;
Constants.sizeZ = 16;

Constants.scaleX = 5;
Constants.scaleY = 5;
Constants.scaleZ = 3;

Constants.voxel = {};
Constants.voxel.air = 0;
Constants.voxel.base = 1;
Constants.voxel.lava = 2;
Constants.voxel.rock = 3;
Constants.voxel.dirt = 4;



//------------------------------------------------------------------------------------------
//-- Utility ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function packKey(x,y,z) {
    return (x << 20) | y << 10 | z;
}

export function unpackKey(key) {
    return [(key >>> 20) & 0x3FF, (key >>> 10) & 0x3FF, key & 0x3FF];
}

//------------------------------------------------------------------------------------------
//-- VoxelColumn ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class VoxelColumn {
    constructor() {
        this.c = new Uint16Array([Constants.sizeZ]);
        this.t = new Uint16Array([0]);
    }

    get(z) {
        return this.t[this.c.findIndex(count => { z -= count; return z<0; })];
    }

    set(z, type) {
        const expand = this.expand();
        if (expand[z] === type) return;
        expand[z] = type;
        this.compress(expand);
    }

    expand() {
        let start = 0, end = 0, n = 0;
        const out = new Array(Constants.sizeZ);
        this.c.forEach(c => {
            end = start + c;
            out.fill(this.t[n++], start, end);
            start = end;
        });
        return out;
    }

    compress(array) {
        let n = 1;
        let previous = array[0]
        array.forEach(entry => {
            if (entry !== previous) n++;
            previous = entry;
        });

        this.c = new Uint16Array(n);
        this.t = new Uint16Array(n);

        n = 0;
        previous = array[0]
        let count = 0;
        array.forEach(entry => {
            if (entry === previous) {
                count++;
            } else {
                this.t[n] = previous;
                this.c[n] = count;
                count = 1;
                n++;
            }
            previous = entry;
        });
        this.t[n] = previous;
        this.c[n] = count;
    }

    summit() {
        let h = 0;
        const top = this.t.findLastIndex(type => type >= 2 );
        this.c.forEach((count, index) => {
            if (index > top) return;
            h += count;
        })
        return h;
    }

}

//------------------------------------------------------------------------------------------
//-- Voxels --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Voxels extends ModelService {

    // -- Static --------------------------------------------------------------------------


    static types() {
        return { "W3:VoxelColumn": VoxelColumn };
    }

    static isValid(x,y,z) {
        if (x < 0) return false;
        if (x >= Constants.sizeX) return false;
        if (y < 0) return false;
        if (y >= Constants.sizeY) return false;
        if (z < 0) return false;
        if (z >= Constants.sizeZ) return false;
        return true;
    }

    // The top and bottom layer of voxels can't be changed to keep edge conditions simple.
    static canEdit(x, y, z) {
        if (x < 0) return false;
        if (x >= Constants.sizeX) return false;
        if (y < 0) return false;
        if (y >= Constants.sizeY) return false;
        if (z < 1) return false;
        if (z >= Constants.sizeZ-1) return false;
        return true;
    }

    static adjacent(x,y,z,v) {
        const out = [...v];
        out[0] += x;
        out[1] += y;
        out[2] += z;
        return out;
    }

    // Returns a box of keys centered on xyz
    static boxSet(x,y,z,s=1) {
        const out = new Set();
        const x0 = Math.max(0, x-s);
        const y0 = Math.max(0, y-s);
        const z0 = Math.max(0, z-s);

        const x1 = Math.min(Constants.sizeX-1, x+s)
        const y1 = Math.min(Constants.sizeY-1, y+s)
        const z1 = Math.min(Constants.sizeZ-1, z+s)

        for( x = x0; x<=x1; x++) {
            for( y = y0; y<=y1; y++) {
                for( z=z0; z<=z1; z++) {
                    out.add(packKey(x,y,z));
                }
            }
        }
        return out;
    }

    // -- Methods ------------------------------------------------------------------------------


    init() {
        super.init('Voxels');
        console.log("Voxels");

        this.voxels = Array.from(Array(Constants.sizeX), ()=>Array.from(Array(Constants.sizeY), ()=>new VoxelColumn()));

        this.subscribe("edit", "setVoxel", this.doSetVoxel);
    }

    doSetVoxel(data) {
        if (Voxels.canEdit(...data.xyz)) {
            this.set(...data.xyz, data.type);
        }
    }

    get(x, y, z) {
        return this.voxels[x][y].get(z);
    }


    set(x, y, z, type) {
        const column = this.voxels[x][y];
        const old = column.get(z);
        if (type === old) return;
        column.set(z, type);
        this.publish("voxels", "set", {xyz:[x, y, z], type, old});
    }

    load(matrix) {
        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                this.voxels[x][y].compress(matrix[x][y]);
            }
        }
        this.publish("voxels", "load");
    }

    forEach(callback) {
        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                const expanded = this.voxels[x][y].expand();
                expanded.forEach((t, z) => callback(x, y, z, t));
            }
        }
    }

    forAdjacent(x,y,z, callback){
        const x0 = x-1, x1 = x+1;
        const y0 = y-1, y1 = y+1;
        const z0 = z-1, z1 = z+1;
        if (x0 >= 0) callback(0, x0,y,z, this.get(x0,y,z));
        if (y0 >= 0) callback(1, x,y0,z, this.get(x,y0,z));
        if (x1 < Constants.sizeX) callback(2, x1,y,z, this.get(x1,y,z));
        if (y1 < Constants.sizeY) callback(3, x,y1,z, this.get(x,y1,z));
        if (z0 >= 0) callback(4,  x,y,z0, this.get(x,y,z0));
        if (z1 < Constants.sizeZ) callback(5, x,y,z1, this.get(x,y,z1));
    }

    forBox(x,y,z, s=1,callback){
        const x0 = Math.max(0, x-s);
        const y0 = Math.max(0, y-s);
        const z0 = Math.max(0, z-s);

        const x1 = Math.min(Constants.sizeX-1, x+s)
        const y1 = Math.min(Constants.sizeY-1, y+s)
        const z1 = Math.min(Constants.sizeZ-1, z+s)

        for( x = x0; x<=x1; x++) {
            for( y = y0; y<=y1; y++) {
                const e = this.voxels[x][y].expand();
                for( z=z0; z<=z1; z++) {
                    callback(x,y,z,e[z]);
                }
            }

        }

    }

    interiorSlice(z) { // Returns a 2d array though the voxels. Only includes voxels with solid above them
        const out = Array.from(Array(Constants.sizeX), ()=>Array.from(Array(Constants.sizeY),0));
        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                const e = this.voxels[x][y].expand();
                if (e[z+1] >= [2]) out[x][y] = e[z];
            }
        }
        return out;
    }

    edgeSummit() { // Finds the maximum height of the voxels on the outside border
        let h = 0
        for (let x = 0; x < Constants.sizeX; x++) {
            h = Math.max(h, this.voxels[x][0].summit())
            h = Math.max(h, this.voxels[x][Constants.sizeY-1].summit())
        }

        for (let y = 0; y < Constants.sizeY; y++) {
            h = Math.max(h, this.voxels[0][y].summit())
            h = Math.max(h, this.voxels[Constants.sizeX-1][y].summit())
        }

        return h;
    }

}
Voxels.register('Voxels');
