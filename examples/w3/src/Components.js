import { RegisterMixin  } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Voxel ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Voxel actors exist in a voxel in the world. Provides utilities for getting the voxel
// coordinates and the voxel key from the actor's world translation.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Voxel = superclass => class extends superclass {

    get voxelXYZ() {
        return Voxels.toClippedVoxelXYZ(...this.translation);
    }

    get voxelKey() {
        return Voxels.packKey(...this.voxelXYZ)
    }

};
RegisterMixin(AM_Voxel);

