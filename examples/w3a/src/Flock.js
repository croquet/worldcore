import { Actor, RegisterMixin } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Flockable -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

 // Mixin to allow actors to belong to flocks.


 export const AM_Flockable = superclass => class extends superclass {

    get flock() { return this._flock }

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

export class FlockActor extends Actor {

    init(options) {
        super.init(options);
        console.log("new flock");
        this.set = new Set();
        this.centerTick();
    }

    get size() {return this.set.size}

    join(member) {
        this.set.add(member);
    }

    leave(member) {
        this.set.delete(member);
    }

    centerTick() {
        // console.log("flock tick")
        if (this.doomed) return;
        const voxels = this.service("Voxels");
        this.center = null;
        const s = this.size;
        if (s>0) {
            let x = 0;
            let y = 0;
            for (const member of this.set) {
                x += member.xyz[0];
                y += member.xyz[1];
            }
            const z = voxels.summit(Math.floor(x/s), Math.floor(y/s));
            this.center = [x/s,y/s,z];
        }
        // console.log("center: " + this.center);
        if (!this.doomed) this.future(100).centerTick();
    }

}
FlockActor.register("FlockActor");