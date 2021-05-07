import { NamedView, GetNamedView, v3_divide, Cube, Material, DrawCall, m4_translation, v3_multiply } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { PickFloor, PickSurface, PickVoxel } from "./VoxelRaycast";
import { GetTopLayer } from "./Globals";

export class VoxelCursor extends NamedView {
    constructor(model) {
        super("VoxelCursor", model);
        this.viewRoot =  GetNamedView("ViewRoot");
        this.xy = [0,0];
        this.mode = 'dig';

        this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [0.5, 0.5, 0.5, 0.5]);
        this.mesh.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ/2]));
        this.mesh.load();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;
        this.drawCall = new DrawCall(this.mesh, this.material);
        this.viewRoot.render.scene.addDrawCall(this.drawCall);

        this.subscribe("ui", "pointerMove", this.onPointerMove);
        this.subscribe("hud", "editMode", this.onEditMode);
    }

    onPointerMove(d) {
        this.xy = d.xy;
    }

    onEditMode(mode) {
        this.mode = mode;
    }

    update(time, delta) {
        let xyz;
        switch(this.mode) {
            case 'dig':
                xyz = PickVoxel(this.xy, GetTopLayer());
                break;
            case 'fill':
                xyz = PickSurface(this.xy, GetTopLayer()+1).xyz;
                break;
            case 'spawn':
                xyz = PickFloor(this.xy, GetTopLayer()+1).xyz;
                break;
            default:
        }

        if (xyz && Voxels.canEdit(...xyz)) {
            this.drawCall.isHidden = false;
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.drawCall.transform.set(m4_translation(location));
        } else {
            this.drawCall.isHidden = true;
        }

    }

}