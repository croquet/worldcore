import {Constants} from "@croquet/croquet";
import { q_identity, RegisterMixin, AM_Smoothed, v3_scale, v3_zero } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Voxel ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Voxel actors exist in a voxel in the world.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Voxel = superclass => class extends superclass {

    // init(...args) {
    //     super.init(...args);
    // }

    // destroy() {
    //     super.destroy();
    // }

    get key() { return this._key; }
    get xyz() { return Voxels.unpackKey(this.key) }

};
RegisterMixin(AM_Voxel);

//------------------------------------------------------------------------------------------
//-- Ballistic -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Ballistic actors respond to gravity and collide with terrain.


const gravity = [0,0,-Constants.sim.gravity]; // m/s/s

//-- Actor ---------------------------------------------------------------------------------

export const AM_Ballistic = superclass => class extends superclass {

    init(...args) {
        super.init(...args);
        const delay = 100 * this.random();
        this.future(delay).tick(delay);
    }


    get velocity() { return this._velocity || v3_zero()}
    get spin() {return this._spin || q_identity()}

    tick(delta) {
        const d = delta/1000;
        const v = v3_add(this.velocity, v3_scale(gravity, d));
        const t = v3_add(this.translation, v3_scale(v,d));
        this.set( {
            velocity: v,
            translation: t
        })
        this.future(100).tick(100);
    }


};
RegisterMixin(AM_Ballistic);

