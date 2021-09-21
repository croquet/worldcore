import { AM_Smoothed, RegisterMixin, v3_sub, v3_add, v3_floor, PM_Smoothed,  m4_identity, m4_translation } from "@croquet/worldcore-kernel";
import { PM_InstancedVisible } from "@croquet/worldcore-webgl";
import { Voxels } from "./Voxels";
import { GetTopLayer } from "./Globals";

//------------------------------------------------------------------------------------------
//-- VoxelSmoothed -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// VoxelSmoothed actors exist in a specific voxel in the world. They can be paired with either
// PM_Spatial or PM_VoxelSmoothed pawns.
//
// They hold an xyz value (the voxel coordinates) and a fraction (the offset within the voxel).
// Their world translation is calcuated from these base values. You can also get the voxel key.
//
// In general you want to always work with the xyz & fraction if possible. It's more numerically
// stable. However, if you you set the translation directly or use the default moveTo method, the
// xyz and the fraction will be updated to match.  Do not set the key directly.

//-- Actor ---------------------------------------------------------------------------------

export const AM_VoxelSmoothed = superclass => class extends AM_Smoothed(superclass) {

    set(options = {}) {
        super.set(options);
        if ('xyz' in options ) this.xyzChanged();
        if ('fraction' in options) this.fractionChanged();
        if ('translation' in options ) this.onTranslation(this.translation);
        if ('key' in options) console.warn("Do not directly set the voxel key of a VoxelSmoothed actor. Set its voxel coordinates instead.");
    }

    xyzChanged() {
        this.say("xyzChanged", this.xyz);
        this.localChanged();
    }

    fractionChanged() {
        this.say("fractionChanged", this.fraction);
        this.localChanged();
    }

    onTranslation(t) {
        this.extractVoxelInfo(t);
        delete this._translation;
    }

    extractVoxelInfo(translation) {
        const t = Voxels.toVoxelXYZ(...translation);
        this._xyz = v3_floor(t);
        this._fraction = v3_sub(t, this._xyz);
        this.xyzChanged();
        this.fractionChanged();
    }

    get xyz() {
        return this._xyz || [0,0,0];
    }

    get key() {
        return Voxels.packKey(...this.xyz)
    }

    get fraction() {
        return this._fraction || [0.5,0.5,0];
    }

    get translation() {
        return Voxels.toWorldXYZ(...v3_add(this.xyz, this.fraction));
    }

    voxelMoveTo(xyz, fraction) {
        this._xyz = xyz;
        this._fraction = fraction;
        this.localChanged();
    }

    moveTo(v) {
        this.extractVoxelInfo(v);
        super.moveTo(v);
    }

};
RegisterMixin(AM_VoxelSmoothed);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_VoxelSmoothed = superclass => class extends PM_Smoothed(superclass) {
    constructor(...args) {
        super(...args);
        this.listenOnce("xyzChanged", this.onSetTranslation);
        this.listenOnce("fractionChanged", this.onSetTranslation);
    }

};

//------------------------------------------------------------------------------------------
//-- LayeredInstancedVisible ---------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A variant of the normal InstancedVisible that works with VoxelSmoothed pawns. It hides pawns
// above the top layer by setting their transforms to a point high above the world.

const limbo = m4_translation([Voxels.scaleX * Voxels.sizeX / 2, Voxels.scaleY * Voxels.sizeY/2, 1000 * Voxels.scaleZ])

export const PM_LayeredInstancedVisible = superclass => class extends PM_InstancedVisible(superclass) {

    refreshDrawTransform() {
        if (this.draw) {
            if (this.actor.xyz[2] <= GetTopLayer()) {
                this.draw.instances.set(this.actor.id, this.global);
            } else {
                this.draw.instances.set(this.actor.id, limbo);
            }
        }
    }

}
