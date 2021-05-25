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
