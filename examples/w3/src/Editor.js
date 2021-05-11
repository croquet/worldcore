import { GetNamedView, NamedView } from "@croquet/worldcore";
import { GetTopLayer } from "./Globals";
import { PickSurface, PickVoxel, PickFloor, PickSolid, PickEmpty } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

export class Editor extends NamedView {
    constructor(model) {
        super("Editor", model);
        this.mode = 'dig';
        this.subscribe("ui", "pointerDown", this.onPointerDown);
        this.subscribe("ui", "pointerMove", this.onPointerMove);
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
            case 'spawn':
                this.doSpawn(data.xy);
                break;
            default:
        }

    }

    onPointerMove(data) {
        if (this.mode === 'spawn') {
            const pick = PickFloor(data.xy, GetTopLayer());
            const xyz = pick.xyz;
            if (xyz) {
                this.end = Voxels.packKey(...xyz);
                const paths = this.wellKnownModel("Paths");
                const path = paths.findPath(this.start, this.end);
                const routeRender = GetNamedView("RouteRender");
                if (routeRender) routeRender.setRoute(path);
            }
        }
    }

    onEditMode(mode) {
        this.mode = mode;
    }

    doDig(xy) {
        const xyz = PickSolid(xy, GetTopLayer());
        if (!xyz || !Voxels.canEdit(...xyz)) return;
        this.publish("editor", "setVoxel", {xyz, type: Voxels.air})
    }

    doFill(xy) {
        const pick = PickEmpty(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "setVoxel", {xyz, type: Voxels.dirt})
    }

    doSpawn(xy) {
        const pick = PickFloor(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.start = Voxels.packKey(...xyz);
    }


}