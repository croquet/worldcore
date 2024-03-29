import { ModelService, Constants, Actor, v3_multiply, mix, AM_Smoothed, v3_add, v3_floor, v3_min, v3_max, v3_sub} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Constants -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.sizeX = 64;
Constants.sizeY = 64;
Constants.sizeZ = 32;

Constants.scaleX = 5;
Constants.scaleY = 5;
Constants.scaleZ = 3;

Constants.gravity = 9.8; // m/s/s

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

export function toWorld(v) {
    return v3_multiply(v,[Constants.scaleX, Constants.scaleY, Constants.scaleZ]);
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

    solidBelow(z) {
        const e = this.expand();
        while (--z > 0) {
            if (e[z] >=2) return z;
        }
        return 0;

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
        if (x < 1) return false;
        if (x >= Constants.sizeX-1) return false;
        if (y < 1) return false;
        if (y >= Constants.sizeY-1) return false;
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

    static clamp(voxel, fraction) {
        return v3_add(voxel, v3_floor(fraction));
    }

    // Maps a vector onto one of the 8 direction indices
    static direction(v) {
        const x = v[0];
        const y = v[1];
        const xx = Math.abs(x) > 2*Math.abs(y);
        const yy = Math.abs(y) > 2*Math.abs(x);

        let out;
        if(x>0) { // east
            if (y>0) { // northeast
                out=6;
                if (xx) out = 2;
                if (yy) out = 3;
            } else { // southeast
                out=5;
                if (xx) out = 2;
                if (yy) out = 1;
            }
        } else { // west
            if (y>0) { // northwest
                out=7;
                if (xx) out = 0;
                if (yy) out = 3;
            } else { // southwest
                out=4;
                if (xx) out = 0;
                if (yy) out = 1;
            }
        }
        return out;
    }

        // Maps a vector onto 1-2 of the 8 direction indices
        static arc(v) {
            const x = v[0];
            const y = v[1];
            const xx = Math.abs(x) > 2*Math.abs(y);
            const yy = Math.abs(y) > 2*Math.abs(x);

            let out;
            if(x>0) { // east
                if (y>0) { // northeast
                    out=[6];
                    if (xx) out = [2,6];
                    if (yy) out = [3,6];
                } else { // southeast
                    out=[5];
                    if (xx) out = [2,5];
                    if (yy) out = [1,5];
                }
            } else { // west
                if (y>0) { // northwest
                    out=[7];
                    if (xx) out = [0,7];
                    if (yy) out = [3,7];
                } else { // southwest
                    out=[4];
                    if (xx) out = [0,4];
                    if (yy) out = [1,4];
                }
            }
            return out;
        }

    // -- Methods ------------------------------------------------------------------------------


    init() {
        super.init('Voxels');
        console.log("Voxels");
        this.watertable = 1; // Voxel height of water surface

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

    forEachWalkable(callback) { // executes a callback on every air voxel with a solid voxel below it.
        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                const expanded = this.voxels[x][y].expand();
                expanded.forEach((t, z) => {
                    if (t>=2) return; // solid
                    const b = expanded[z-1]
                    if (b>=2) callback(x, y, z)
                })
            }
        }
    }

    forAdjacent(x,y,z, callback){ // (x,y,z,t,d) // where d: 0=west, 1=south, 2=east, 3=north, 4=below, 5=above
        const x0 = x-1, x1 = x+1;
        const y0 = y-1, y1 = y+1;
        const z0 = z-1, z1 = z+1;
        if (x0 >= 0) callback(x0,y,z, this.get(x0,y,z),0);
        if (y0 >= 0) callback(x,y0,z, this.get(x,y0,z),1);
        if (x1 < Constants.sizeX) callback(x1,y,z, this.get(x1,y,z),2);
        if (y1 < Constants.sizeY) callback(x,y1,z, this.get(x,y1,z),3);
        if (z0 >= 0) callback(x,y,z0, this.get(x,y,z0),4);
        if (z1 < Constants.sizeZ) callback(x,y,z1, this.get(x,y,z1),5);
    }

    forHorizontalX(x,y,z, callback){ // (x,y,z,t,d) // where d: 0=west, 1=south, 2=east, 3=north
        const x0 = x-1, x1 = x+1;
        const y0 = y-1, y1 = y+1;
        if (x0 >= 0) callback(x0,y,z, this.get(x0,y,z),0);
        if (y0 >= 0) callback(x,y0,z, this.get(x,y0,z),1);
        if (x1 < Constants.sizeX) callback(x1,y,z, this.get(x1,y,z),2);
        if (y1 < Constants.sizeY) callback(x,y1,z, this.get(x,y1,z),3);
    }

    forHorizontal(x,y,z, callback){ // (x,y,z,t,d) // where d: 0=west, 1=south, 2=east, 3=north, 4=southwest, 5=southeast, 6=northeast, 7=northwest
        const x0 = x-1, x1 = x+1;
        const y0 = y-1, y1 = y+1;
        callback(x0,y,z, this.get(x0,y,z),0);
        callback(x,y0,z, this.get(x,y0,z),1);
        callback(x1,y,z, this.get(x1,y,z),2);
        callback(x,y1,z, this.get(x,y1,z),3);

        callback(x0,y0,z, this.get(x0,y0,z),4);
        callback(x1,y0,z, this.get(x1,y0,z),5);
        callback(x1,y1,z, this.get(x1,y1,z),6);
        callback(x0,y1,z, this.get(x0,y1,z),7);
    }

    forBox(x,y,z,callback){ // (x,y,z,t)
        const s = 1;
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

    solidBelow(x,y,z) { // Returns next solid voxel below z
        return this.voxels[x][y].solidBelow(z);

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

    summit(x,y) {
        return this.voxels[x][y].summit();
    }

    setWatertable(depth) {
        this.watertable = depth;
    }

}
Voxels.register('Voxels');


