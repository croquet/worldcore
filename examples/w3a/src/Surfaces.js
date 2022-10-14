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
        this.ramps = [0,0,0,0];
        this.doubles = [0,0,0,0];
        this.caps = [0,0,0,0];
        this.sides = [0,0,0,0];
        this.shims = [0,0,0,0];
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

        // Replace double ramps

        if (this.ramps[0] && this.ramps[1]) {
            this.doubles[0] = true;
        }

        if (this.ramps[1] && this.ramps[2]) {
            this.doubles[1] = true;
        }

        if (this.ramps[2] && this.ramps[3]) {
            this.doubles[2] = true;
        }

        if (this.ramps[3] && this.ramps[0]) {
            this.doubles[3] = true;
        }

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

    add(key) {
        const s = new Surface(key);
        this.surfaces.set(key,s);
        return s;
    }

    rebuildAll() {
        this.surfaces = new Map();

        const voxels = this.service("Voxels");
        const primary = new Set();

        // Build primary set
        voxels.forEach((x,y,z, t)=> {
            if (t>=2) return;
            const key = packKey(x,y,z);
            voxels.forAdjacent(x,y,z, (d,x,y,z,t) => {
                if (t<2) return;
                this.add(key)
                primary.add(key);
            })
        });

        // const secondary = new Set();
        // primary.forEach(key => {
        //     const xyz = unpackKey(key);
        //     const west = voxels.adjacent(...xyz, [-1,0,0]);
        //     const south = voxels.adjacent(...xyz, [1,-1,0]);
        //     const east = voxels.adjacent(...xyz, [1,0,0]);
        //     const north = voxels.adjacent(...xyz, [1,1,0]);
        //     if (voxels.isValid(...west) && !voxels.get(...west)) secondary.add(packKey(...west));
        //     if (voxels.isValid(...south) && !voxels.get(...south)) secondary.add(packKey(...south));
        //     if (voxels.isValid(...east) && !voxels.get(...east)) secondary.add(packKey(...east));
        //     if (voxels.isValid(...north) && !voxels.get(...north)) secondary.add(packKey(...north));
        // });



        // Find faces
        primary.forEach(key => {
            const xyz = unpackKey(key);
            const s = this.get(key);
            voxels.forAdjacent(...xyz, (d,x,y,z,t) => {
                if(t<2) return;
                s.faces[d] = t
            });

        });

        // Find ramps
        primary.forEach(key => {
            const xyz = unpackKey(key);
            const s = this.get(key);
            s.findRamps(voxels);
        });

        // Find caps
        primary.forEach(key => {
            const xyz = unpackKey(key);
            const aboveXYZ = voxels.adjacent(...xyz, [0,0,1]);
            if (!voxels.isValid(...aboveXYZ)) return;
            const aboveKey = packKey(...aboveXYZ);
            let above = this.get(aboveKey);
            const s = this.get(key);
            if (s.doubles[0] || s.doubles[1] || s.doubles[2] ||s.doubles[3]) {
                if (!above) above = this.add(aboveKey);
                above.caps = [...s.doubles];
            }
        });

        // Find sides

        const secondary = new Set(); // surfaces with a side may have a shim
        primary.forEach(key => {
            const xyz = unpackKey(key);
            const s = this.get(key);

            if (s.ramps[0]) {
                const leftXYZ = voxels.adjacent(...xyz, [0,-1,0]);
                const rightXYZ = voxels.adjacent(...xyz, [0,1,0]);

                if (voxels.isValid(...leftXYZ)){
                    const leftKey = packKey(...leftXYZ);
                    let left = this.get(leftKey);
                    if (!left) left = this.add(leftKey);
                    left.sides[3] = 1;
                    secondary.add(leftKey);
                }

                if (voxels.isValid(...rightXYZ)){
                    const rightKey = packKey(...rightXYZ);
                    let right = this.get(rightKey);
                    if (!right) right = this.add(rightKey);
                    right.sides[1] = 1;
                    secondary.add(rightKey);

                }
            }

            if (s.ramps[1]) {
                const leftXYZ = voxels.adjacent(...xyz, [-1,0,0]);
                const rightXYZ = voxels.adjacent(...xyz, [1,0,0]);

                if (voxels.isValid(...leftXYZ)){
                    const leftKey = packKey(...leftXYZ);
                    let left = this.get(leftKey);
                    if (!left) left = this.add(leftKey);
                    left.sides[2] = 1;
                    secondary.add(leftKey);
                }

                if (voxels.isValid(...rightXYZ)){
                    const rightKey = packKey(...rightXYZ);
                    let right = this.get(rightKey);
                    if (!right) right = this.add(rightKey);
                    right.sides[0] = 1;
                    secondary.add(rightKey);

                }
            }

            if (s.ramps[2]) {
                const leftXYZ = voxels.adjacent(...xyz, [0,-1,0]);
                const rightXYZ = voxels.adjacent(...xyz, [0,1,0]);

                if (voxels.isValid(...leftXYZ)){
                    const leftKey = packKey(...leftXYZ);
                    let left = this.get(leftKey);
                    if (!left) left = this.add(leftKey);
                    left.sides[3] = 2;
                    secondary.add(leftKey);
                }

                if (voxels.isValid(...rightXYZ)){
                    const rightKey = packKey(...rightXYZ);
                    let right = this.get(rightKey);
                    if (!right) right = this.add(rightKey);
                    right.sides[1] = 2;
                    secondary.add(rightKey);

                }
            }

            if (s.ramps[3]) {
                const leftXYZ = voxels.adjacent(...xyz, [-1,0,0]);
                const rightXYZ = voxels.adjacent(...xyz, [1,0,0]);

                if (voxels.isValid(...leftXYZ)){
                    const leftKey = packKey(...leftXYZ);
                    let left = this.get(leftKey);
                    if (!left) left = this.add(leftKey);
                    left.sides[2] = 2;
                    secondary.add(leftKey);
                }

                if (voxels.isValid(...rightXYZ)){
                    const rightKey = packKey(...rightXYZ);
                    let right = this.get(rightKey);
                    if (!right) right = this.add(rightKey);
                    right.sides[0] = 2;
                    secondary.add(rightKey);

                }
            }
        });

        // Find Shims

        secondary.forEach(key => {
            const s = this.get(key);
            if (!s.faces[4]) return // No floor = no shim
            if (s.sides[0] === 1  && s.sides[1] ===1) s.shims[0] = true;
            if (s.sides[1] === 2  && s.sides[2] ===1) s.shims[1] = true;
            if (s.sides[2] === 2 && s.sides[3] ===2) s.shims[2] = true;
            if (s.sides[3] === 1 && s.sides[0] ===2) s.shims[3] = true;
        });

    }
}
Surfaces.register('Surfaces');