import { Actor, RegisterMixin } from "@croquet/worldcore";
import { VoxelActor } from "./VoxelActor";

//------------------------------------------------------------------------------------------
//-- Flockable -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

 // Mixin to allow actors to belong to flocks.


 export const AM_Flockable = superclass => class extends superclass {

    get flock() { return this._flock }

    init(options) {
        super.init(options);
        this.aim = [0,0,0];
    }

    destroy() {
        super.destroy();
        if (this.flock) this.flock.leave(this);
    }

    flockSet(flock, old) {
        if (old) old.leave(this);
        if (flock) flock.join(this);
    }

}
RegisterMixin(AM_Flockable);

//------------------------------------------------------------------------------------------
//-- FlockActor ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FlockActor extends VoxelActor {

    init(options) {
        super.init(options);
        console.log("new flock");
        this.flock = new Set();
        this.centerTick();
    }

    get size() {return this.set.size}

    join(member) {
        this.flock.add(member);
    }

    leave(member) {
        this.flock.delete(member);
    }

    centerTick() {
        if (this.doomed) return;

        // if (this.flock.size>0) {
        const voxels = this.service("Voxels");
        let x = 0;
        let y = 0;
        let s = this.flock.size;
        if (s>0) {
            for (const member of this.flock) {
                x += member.xyz[0];
                y += member.xyz[1];
            }
            const z = voxels.summit(Math.floor(x/s), Math.floor(y/s));
            this.xyz = [x/s,y/s,z];
        }

        // }
        if (!this.doomed) this.future(100).centerTick();
    }

}
FlockActor.register("FlockActor");