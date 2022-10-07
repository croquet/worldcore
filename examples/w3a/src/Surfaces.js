import { ModelService } from "@croquet/worldcore";
import { packKey, unpackKey } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Surface -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Surface {
    constructor(key) {
        this.key = key;
        this.faces = [0,0,0,0,0,0];
    }

    findFaces(voxels) {

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

    }
}
Surfaces.register('Surfaces');