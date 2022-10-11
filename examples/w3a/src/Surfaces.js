import { ModelService } from "@croquet/worldcore";
import { packKey, unpackKey } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Surface -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Surface {
    constructor(key) {
        this.xyz = unpackKey(key);
        this.key = key;
        this.faces = [0,0,0,0,0,0];
        this.ramps = [0,0,0,0]
    }

    findRamps(voxels) {

        // No floor or low ceiling = no ramp
        if (!this.faces[4] || this.faces[5]) return;

        // Add a ramp if there's a face opposite a non-face.

        if (this.faces[0] && !this.faces[2]) this.ramps[0] = true;
        if (this.faces[1] && !this.faces[3]) this.ramps[1] = true;
        if (this.faces[2] && !this.faces[0]) this.ramps[2] = true;
        if (this.faces[3] && !this.faces[1]) this.ramps[3] = true;

        // No ramps to nowhere -- ramps must lead up to empty voxels

        if (this.ramps[0]) {
            const adjacent = voxels.adjacent(...this.xyz, [-1,0,1]);
            if (voxels.isValid(...adjacent) && voxels.get(...adjacent)) this.ramps[0] = 0
        };

        if (this.ramps[1]) {
            const adjacent = voxels.adjacent(...this.xyz, [0,-1,1]);
            if (voxels.isValid(...adjacent) && voxels.get(...adjacent)) this.ramps[1] = 0
        };

        if (this.ramps[2]) {
            const adjacent = voxels.adjacent(...this.xyz, [1,0,1]);
            if (voxels.isValid(...adjacent) && voxels.get(...adjacent)) this.ramps[2] = 0
        };

        if (this.ramps[3]) {
            const adjacent = voxels.adjacent(...this.xyz, [0,1,1]);
            if (voxels.isValid(...adjacent) && voxels.get(...adjacent)) this.ramps[3] = 0
        };

    }
}

//------------------------------------------------------------------------------------------
//-- Surfaces ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Surfaces extends ModelService {

    static types() {
        return { "W3:Surface": Surface };
    }

    init() {
        super.init('Surfaces');
    }

    get(key) {
        return(this.surfaces.get(key));
    }

    rebuildAll() {
        this.surfaces = new Map();
        const surfaces = this.surfaces;

        const voxels = this.service("Voxels");
        const primary = new Set();

        voxels.forEach((x,y,z, t)=> {
            if (t>=2) return;
            const key = packKey(x,y,z);
            voxels.forAdjacent(x,y,z, (d,x,y,z,t) => {
                if (t<2) return;
                primary.add(key);
            })
        });

        primary.forEach(key => {
            const xyz = unpackKey(key);
            const s = new Surface(key);
            this.surfaces.set(key,s);
            voxels.forAdjacent(...xyz, (d,x,y,z,t) => {
                if(t<2) return;
                s.faces[d] = t
            });

        });

        primary.forEach(key => {
            const xyz = unpackKey(key);
            const s = this.get(key);
            s.findRamps(voxels);
        });

    }
}
Surfaces.register('Surfaces');