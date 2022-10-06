import { ModelService, Constants } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Constants -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.sizeX = 4;
Constants.sizeY = 4;
Constants.sizeZ = 4;

Constants.scaleX = 5;
Constants.scaleY = 5;
Constants.scaleZ = 3;

Constants.air = 0;
Constants.base = 1;
Constants.lava = 2;
Constants.rock = 3;
Constants.dirt = 4;

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

}

//------------------------------------------------------------------------------------------
//-- Voxels --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Voxels extends ModelService {

    static types() {
        return { "W3:VoxelColumn": VoxelColumn };
    }

    init() {
        super.init('Voxels');
        console.log("Voxels");

        this.voxels = Array.from(Array(Constants.sizeX), ()=>Array.from(Array(Constants.sizeY), ()=>new VoxelColumn()));
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

    forAdjacent( x,y,z, callback){
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

}
Voxels.register('Voxels');
