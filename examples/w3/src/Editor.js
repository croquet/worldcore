import { GetNamedView, NamedView } from "@croquet/worldcore";
import { PickSurface, PickVoxel } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

export class Editor extends NamedView {
    constructor(model) {
        super("Editor", model);
        this.mode = 'dig';
        this.subscribe("ui", "pointerDown", this.onPointerDown);
        this.subscribe("hud", "editMode", this.onEditMode);
    }

    onPointerDown(data) {

        if (data.type === 'mouse' && data.button !== 0) return;

        switch (this.mode) {
            case 'fill':
                this.doFill(data.xy);
                break;
            case 'dig':
                this.doDig(data.xy);
                break;
            default:
        }

    }

    doDig(xy) {
        const xyz = PickVoxel(xy);
        if (!xyz || !Voxels.canEdit(...xyz)) return;
        this.publish("editor", "setVoxel", {xyz, type: Voxels.air})
    }

    doFill(xy) {
        const pick = PickSurface(xy);
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "setVoxel", {xyz, type: Voxels.dirt})
    }

    onEditMode(mode) {
        this.mode = mode;
    }
}