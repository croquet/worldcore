import { ModelService, Constants } from "@croquet/worldcore";
import { packKey, unpackKey, Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Surfaces ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Surfaces extends ModelService {

    static types() {
        return { "W3:Surface": Surface };
    }

    init() {
        super.init('Surfaces');
        this.surfaces = new Map();

        this.subscribe("voxels", "load", this.rebuildAll)
        this.subscribe("voxels", "set", this.rebuildSome)
    }

    elevation(x,y,z) {
        const xx = Math.floor(x);
        const yy = Math.floor(y);
        const zz = Math.floor(z);
        const key = packKey(xx,yy,zz);
        const s = this.get(key);
        if (!s) return undefined;
        return s.elevation(x-xx, y-yy);
    }

    get(key) {
        return this.surfaces.get(key) || new Surface(key);
    }

    set(key, surface) {
        this.surfaces.set(key,surface);
    }

    // Removes a set of surfaces
    clip(keys) {
        keys.forEach(key=>{this.surfaces.delete(key)});
    }

    rebuildSome(data) {
        const xyz = data.xyz

        const voxels = this.service("Voxels");
        const zero = Voxels.boxSet(...xyz);
        const primary = Voxels.boxSet(...xyz,2);
        const secondary = new Set();

        this.clip(zero);
        zero.forEach(key => this.surfaces.set(key, new Surface(key)));

        primary.forEach(key => { this.get(key).findFaces(voxels) });
        primary.forEach(key => { this.get(key).findRamps(voxels); });
        primary.forEach(key => { this.get(key).findCaps(voxels,this,secondary) });
        primary.forEach(key => { this.get(key).findSides(voxels,this,secondary)});

        secondary.forEach(key => {this.get(key).findShims();});

        primary.forEach(key => { this.get(key).cullUnderRamps() });
        primary.forEach(key => { this.get(key).cullUnderDoubles() });

        secondary.forEach(key => {this.get(key).cullUnderShims();});
        secondary.forEach(key => {this.get(key).cullDuplicateSides(this,secondary);});

        const add = new Set([...primary, ...secondary]);
        const remove = new Set();
        add.forEach(key => { if (this.get(key).isEmpty) remove.add(key) });

        this.clip(remove);

        this.publish("surfaces", "rebuildSome", {add,remove});


    }

    rebuildAll() {
        // console.log("Building surfaces ...");
        this.surfaces = new Map();

        const voxels = this.service("Voxels");
        const primary = new Set();
        const secondary = new Set();

        // Build primary set
        voxels.forEach((x,y,z,t)=> {
            if (t>=2) return;
            const key = packKey(x,y,z);
            voxels.forAdjacent(x,y,z, (x,y,z,t,d) => {
                if (t<2) return;
                this.surfaces.set(key, new Surface(key));
                primary.add(key);
            })
        });

        primary.forEach(key => { this.get(key).findFaces(voxels) });
        primary.forEach(key => { this.get(key).findRamps(voxels); });
        primary.forEach(key => { this.get(key).findCaps(voxels,this,secondary) });
        primary.forEach(key => { this.get(key).findSides(voxels,this,secondary)});
        secondary.forEach(key => {this.get(key).findShims();});

        primary.forEach(key => { this.get(key).cullUnderRamps() });
        primary.forEach(key => { this.get(key).cullUnderDoubles() });
        secondary.forEach(key => {this.get(key).cullUnderShims();});
        secondary.forEach(key => {this.get(key).cullDuplicateSides(this,secondary);});

        const cull = new Set();
        primary.forEach(key => { if (this.surfaces.get(key).isEmpty) cull.add(key) });
        this.clip(cull);

        this.publish("surfaces", "rebuildAll");
        // console.log("Building surfaces done");

    }






}
Surfaces.register('Surfaces');

//------------------------------------------------------------------------------------------
//-- Surface -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Surface {
    constructor(key) {
        this.xyz = unpackKey(key);
        this.key = key;
        this.floor = 0;
        this.ceiling = 0;
        this.faces = [0,0,0,0,0,0]; // type of adjacent voxel
        this.ramps = [0,0,0,0];
        this.doubles = [0,0,0,0];   // 2 perpendicular ramps replaced with a triangle
        this.caps = [0,0,0,0];      // voxel below has a double
        this.sides = [0,0,0,0];     // type of adjacent voxel or ramp
        this.shapes = [0,0,0,0];    // 1 = left triangle, 2 = right triangle, 3 = square
        this.shims = [0,0,0,0];     // Triangles bridging 2 triangular sides
    }

    get west() { return this.faces[0]; }
    get south() { return this.faces[1]; }
    get east() { return this.faces[2]; }
    get north() { return this.faces[3]; }
    get below() { return this.faces[4]; }
    get above() { return this.faces[5]; }

    get hasFace() { return this.faces.some(e => e)}
    get hasRamp() { return this.ramps.some(e => e)}
    get hasDouble() {return this.doubles.some(e => e)}
    get hasCap() {return this.caps.some(e => e)}
    get hasSide() {return this.sides.some(e => e)}
    get hasShape() {return this.shapes.some(e => e)}
    get hasShim() {return this.shims.some(e => e)}
    get isEmpty() { return !(this.floor || this.ceiling || this.hasFace || this.hasRamp || this.hasDouble || this.hasCap || this.hasShape || this.hasShim); }

    elevation(x,y) {

        if (!this.below && !this.hasCap) return undefined;

        let e = 0;

        const xx = 1-x;
        const yy = 1-y
        if (this.ramps[0]) e = Math.max(e,xx);
        if (this.ramps[1]) e = Math.max(e,yy);
        if (this.ramps[2]) e = Math.max(e,x);
        if (this.ramps[3]) e = Math.max(e,y);

        if (this.doubles[0]) e = Math.max(e,xx+yy);
        if (this.doubles[1]) e = Math.max(e,x+yy);
        if (this.doubles[2]) e = Math.max(e,x+y);
        if (this.doubles[3]) e = Math.max(e,xx+y);

        if (this.shims[0]) e = Math.max(e, xx+yy-1);
        if (this.shims[1]) e = Math.max(e,x+yy-1);
        if (this.shims[2]) e = Math.max(e,x+y-1);
        if (this.shims[3]) e = Math.max(e,xx+y-1);

        return Math.max(0, Math.min(1, e));

    }

    // Find adjacent solid voxels
    findFaces(voxels) {
        if (voxels.get(...this.xyz) >=2) return; // Only air has faces
        voxels.forAdjacent(...this.xyz, (x,y,z,t,d) => {
            if(t<2) return;
            this.faces[d] = t
            this.sides[d] = t;
            this.shapes[d] = 3;
        });
        this.floor = this.below;
        this.ceiling = this.above;
    }

    // Add ramps if there's a wall next to a floor
    findRamps(voxels) {

        // No floor or low ceiling = no ramp
        if (!this.below || this.above|| this.below == Constants.lava) return;

        // Add a ramp if there's a face opposite a non-face.

        if (this.west && !this.east) this.ramps[0] = this.below;
        if (this.south && !this.north) this.ramps[1] = this.below;
        if (this.east && !this.west) this.ramps[2] = this.below;
        if (this.north && !this.south) this.ramps[3] = this.below;

        // No ramps to nowhere -- ramps must lead up to empty voxels

        if (this.ramps[0]) {
            const adjacent = Voxels.adjacent(...this.xyz, [-1,0,1]);
            if (Voxels.isValid(...adjacent) && voxels.get(...adjacent)>=2) this.ramps[0] = 0
        };

        if (this.ramps[1]) {
            const adjacent = Voxels.adjacent(...this.xyz, [0,-1,1]);
            if (Voxels.isValid(...adjacent) && voxels.get(...adjacent)>=2) this.ramps[1] = 0
        };

        if (this.ramps[2]) {
            const adjacent = Voxels.adjacent(...this.xyz, [1,0,1]);
            if (Voxels.isValid(...adjacent) && voxels.get(...adjacent)>=2) this.ramps[2] = 0
        };

        if (this.ramps[3]) {
            const adjacent = Voxels.adjacent(...this.xyz, [0,1,1]);
            if (Voxels.isValid(...adjacent) && voxels.get(...adjacent)>=2) this.ramps[3] = 0
        };

        // Find double ramps

        if (this.ramps[0] && this.ramps[1]) {
            this.doubles[0] = this.below;
        }

        if (this.ramps[1] && this.ramps[2]) {
            this.doubles[1] = this.below;
        }

        if (this.ramps[2] && this.ramps[3]) {
            this.doubles[2] = this.below;
        }

        if (this.ramps[3] && this.ramps[0]) {
            this.doubles[3] = this.below;
        }

        // Eliminate doubles where the bottom corner points to a solid voxel

        if (this.doubles[0]) {
            const corner = Voxels.adjacent(...this.xyz, [1,1,0]);
            if (Voxels.isValid(...corner) && voxels.get(...corner)>=2){
                this.doubles[0] = 0
                this.ramps[0] = 0;
                this.ramps[1] = 0;
            }
        }

        if (this.doubles[1]) {
            const corner = Voxels.adjacent(...this.xyz, [-1,1,0]);
            if (Voxels.isValid(...corner) && voxels.get(...corner)>=2){
                this.doubles[1] = 0
                this.ramps[1] = 0;
                this.ramps[2] = 0;
            }
        }

        if (this.doubles[2]) {
            const corner = Voxels.adjacent(...this.xyz, [-1,-1,0]);
            if (Voxels.isValid(...corner) && voxels.get(...corner)>=2){
                this.doubles[2] = 0
                this.ramps[2] = 0;
                this.ramps[3] = 0;
            }
        }

        if (this.doubles[3]) {
            const corner = Voxels.adjacent(...this.xyz, [1,-1,0]);
            if (Voxels.isValid(...corner) && voxels.get(...corner)>=2){
                this.doubles[3] = 0
                this.ramps[2] = 0;
                this.ramps[0] = 0;
            }
        }
    }

    // Add half floors above double ramps
    findCaps(voxels, surfaces, secondary) {
        if (!this.hasDouble) return false;
        const aboveXYZ = Voxels.adjacent(...this.xyz, [0,0,1]);
        if (!Voxels.isValid(...aboveXYZ)) return;
        const aboveKey = packKey(...aboveXYZ);
        const above = surfaces.get(aboveKey);
        surfaces.set(aboveKey, above);
        secondary.add(aboveKey);
        above.caps = [...this.doubles];
    }

    // Add triangular sides next to ramps
    findSides(voxels, surfaces, secondary) {

        if (this.ramps[0]) {
            const leftXYZ = Voxels.adjacent(...this.xyz, [0,-1,0]);
            const rightXYZ = Voxels.adjacent(...this.xyz, [0,1,0]);

            if (Voxels.isValid(...leftXYZ) && voxels.get(...leftXYZ)<2) {
                const leftKey = packKey(...leftXYZ);
                const left = surfaces.get(leftKey);
                surfaces.set(leftKey, left);
                secondary.add(leftKey);
                left.sides[3] = this.below;
                left.shapes[3] = 1;
            }

            if (Voxels.isValid(...rightXYZ) && voxels.get(...rightXYZ)<2){
                const rightKey = packKey(...rightXYZ);
                const right = surfaces.get(rightKey);
                surfaces.set(rightKey, right);
                secondary.add(rightKey);
                right.sides[1] = this.below;
                right.shapes[1] = 2;
            }

        }

        if (this.ramps[1]) {
            const leftXYZ = Voxels.adjacent(...this.xyz, [-1,0,0]);
            const rightXYZ = Voxels.adjacent(...this.xyz, [1,0,0]);

            if (Voxels.isValid(...leftXYZ) && voxels.get(...leftXYZ)<2) {
                const leftKey = packKey(...leftXYZ);
                const left = surfaces.get(leftKey);
                surfaces.set(leftKey, left);
                secondary.add(leftKey);
                left.sides[2] = this.below;
                left.shapes[2] = 2;
            }

            if (Voxels.isValid(...rightXYZ) && voxels.get(...rightXYZ)<2){
                const rightKey = packKey(...rightXYZ);
                const right = surfaces.get(rightKey);
                surfaces.set(rightKey, right);
                secondary.add(rightKey);
                right.sides[0] = this.below;
                right.shapes[0] = 1;
            }
        }

        if (this.ramps[2]) {
            const leftXYZ = Voxels.adjacent(...this.xyz, [0,-1,0]);
            const rightXYZ = Voxels.adjacent(...this.xyz, [0,1,0]);

            if (Voxels.isValid(...leftXYZ) && voxels.get(...leftXYZ)<2) {
                const leftKey = packKey(...leftXYZ);
                const left = surfaces.get(leftKey);
                surfaces.set(leftKey, left);
                secondary.add(leftKey);
                left.sides[3] = this.below;
                left.shapes[3] = 2;
            }

            if (Voxels.isValid(...rightXYZ) && voxels.get(...rightXYZ)<2){
                const rightKey = packKey(...rightXYZ);
                const right = surfaces.get(rightKey);
                surfaces.set(rightKey, right);
                secondary.add(rightKey);
                right.sides[1] = this.below;
                right.shapes[1] = 1;
            }
        }

        if (this.ramps[3]) {
            const leftXYZ = Voxels.adjacent(...this.xyz, [-1,0,0]);
            const rightXYZ = Voxels.adjacent(...this.xyz, [1,0,0]);

            if (Voxels.isValid(...leftXYZ) && voxels.get(...leftXYZ)<2) {
                const leftKey = packKey(...leftXYZ);
                const left = surfaces.get(leftKey);
                surfaces.set(leftKey, left);
                secondary.add(leftKey);
                left.sides[2] = this.below;
                left.shapes[2] = 1;
            }

            if (Voxels.isValid(...rightXYZ) && voxels.get(...rightXYZ)<2){
                const rightKey = packKey(...rightXYZ);
                const right = surfaces.get(rightKey);
                surfaces.set(rightKey, right);
                secondary.add(rightKey);
                right.sides[0] = this.below;
                right.shapes[0] = 2;
            }
        }

    }

    // Add shims to connect two triangular sides, or a square & a triangle
    findShims() {

        if (this.floor) {

            if (this.shapes[1] == 3 && this.shapes[0] == 1) this.shims[0] = this.floor;
            if (this.shapes[0] == 3 && this.shapes[1] == 2) this.shims[0] = this.floor;

            if (this.shapes[2] == 3 && this.shapes[1] == 1) this.shims[1] = this.floor;
            if (this.shapes[1] == 3 && this.shapes[2] == 2) this.shims[1] = this.floor;

            if (this.shapes[3] == 3 && this.shapes[2] == 1) this.shims[2] = this.floor;
            if (this.shapes[2] == 3 && this.shapes[3] == 2) this.shims[2] = this.floor;

            if (this.shapes[0] == 3 && this.shapes[3] == 1) this.shims[3] = this.floor;
            if (this.shapes[3] == 3 && this.shapes[0] == 2) this.shims[3] = this.floor;

            if (this.shapes[0] == 1  && this.shapes[1] == 2) this.shims[0] = this.floor;
            if (this.shapes[1] == 1  && this.shapes[2] == 2) this.shims[1] = this.floor;
            if (this.shapes[2] == 1 && this.shapes[3] == 2) this.shims[2] = this.floor;
            if (this.shapes[3] == 1 && this.shapes[0] == 2) this.shims[3] = this.floor;
        }
        if (this.caps[0] && (this.shapes[0] == 1  && this.shapes[1] == 2)) this.shims[0] = this.caps[0];
        if (this.caps[1] && (this.shapes[1] == 1  && this.shapes[2] == 2)) this.shims[1] = this.caps[1];
        if (this.caps[2] && (this.shapes[2] == 1 && this.shapes[3] == 2)) this.shims[2] = this.caps[2];
        if (this.caps[3] && (this.shapes[3] == 1 && this.shapes[0] == 2)) this.shims[3] = this.caps[3];
    }

    //-- Culling -------------------------------------------------------------------------------

    // Remove walls and floors under ramps
    cullUnderRamps() {
        if (this.ramps[0]) {this.sides[0] = this.shapes[0]= this.floor = 0};
        if (this.ramps[1]) {this.sides[1] = this.shapes[1]= this.floor = 0};
        if (this.ramps[2]) {this.sides[2] = this.shapes[2]= this.floor = 0};
        if (this.ramps[3]) {this.sides[3] = this.shapes[3]= this.floor = 0};
    }

    // Remove ramps under double ramps
    cullUnderDoubles() {
        if (this.doubles[0]) { this.ramps[0] = this.ramps[1] = 0;};
        if (this.doubles[1]) { this.ramps[1] = this.ramps[2] = 0;};
        if (this.doubles[2]) { this.ramps[2] = this.ramps[3] = 0;};
        if (this.doubles[3]) { this.ramps[3] = this.ramps[0] = 0;};
    }

    // Remove sides and caps under shims
    cullUnderShims(){
        if (this.shims[0]) {
            this.caps[0] = 0;
            if (this.shapes[0] !== 3) this.shapes[0] = 0;
            if (this.shapes[1] !== 3) this.shapes[1] = 0;
        };

        if (this.shims[1]) {
            this.caps[1] = 0;
            if (this.shapes[1] !== 3) this.shapes[1] = 0;
            if (this.shapes[2] !== 3) this.shapes[2] = 0;
        };

        if (this.shims[2]) {
            this.caps[2] = 0;
            if (this.shapes[2] !== 3) this.shapes[2] = 0;
            if (this.shapes[3] !== 3) this.shapes[3] = 0;
        };

        if (this.shims[3]) {
            this.caps[3] = 0;
            if (this.shapes[3] !== 3) this.shapes[3] = 0;
            if (this.shapes[0] !== 3) this.shapes[0] = 0;
        };
    }

    // Remove triangular sides that face each other
    cullDuplicateSides(surfaces, secondary){
        if (this.shapes[0]){
            const aXYZ = Voxels.adjacent(...this.xyz, [-1,0,0]);
            const aKey = packKey(...aXYZ);
            if (secondary.has(aKey)) {
                const adjacent = surfaces.get(aKey);
                if (this.shapes[0] == 1 && adjacent.shapes[2] == 2 || this.shapes[0] == 2 && adjacent.shapes[2] == 1) {
                    this.sides[0] = this.shapes[0] = adjacent.sides[2] = adjacent.shapes[2] = 0
                };
            }
        }

        if (this.shapes[1]){
            const aXYZ = Voxels.adjacent(...this.xyz, [0,-1,0]);
            const aKey = packKey(...aXYZ);
            if (secondary.has(aKey)) {
                const adjacent = surfaces.get(aKey);
                if (this.shapes[1] == 1 && adjacent.shapes[3] == 2 || this.shapes[1] == 2 && adjacent.shapes[3] == 1) {
                    this.sides[1] = this.shapes[1] = adjacent.sides[3] = adjacent.shapes[3] = 0
                };
            }
        }
    }

}

