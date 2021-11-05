import { ViewService } from "@croquet/worldcore-kernel";
import { GetTopLayer } from "./Globals";
import { PickFillSurface, PickFloorSurface, PickDigVoxel, PickPlantSurface } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

// Take ponter inputs and translate them into edit events based on the edit mode.

//------------------------------------------------------------------------------------------
//-- Editor --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Editor extends ViewService {
    constructor() {
        super("Editor");
        this.mode = 'dig';
        this.subscribe("ui", "tap", this.onTap);
        this.subscribe("hud", "editMode", this.onEditMode);
    }

    onTap(data) {
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
            case 'tree':
                this.doTree(data.xy);
                break;
            case 'road':
                this.doRoad(data.xy);
                break;
            case 'clear':
                this.doClear(data.xy);
                break;
            case 'build':
                this.doBuild(data.xy);
                break;
            case 'water':
                this.doWater(data.xy);
                break;
            case 'source':
                this.doSource(data.xy);
                break;
            case 'sink':
                this.doSink(data.xy);
                break;
            default:
        }

    }

    onEditMode(mode) {
        this.mode = mode;
    }

    doDig(xy) {
        const xyz = PickDigVoxel(xy, GetTopLayer());
        if (!xyz || !Voxels.canEdit(...xyz)) return;
        this.publish("editor", "setVoxel", {xyz, type: Voxels.air})
    }

    doFill(xy) {
        const pick = PickFillSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "setVoxel", {xyz, type: Voxels.dirt})
    }

    doSpawn(xy) {
        const pick = PickFloorSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnPerson", xyz);
    }

    doTree(xy) {
        const pick = PickPlantSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnTree", xyz);
    }

    doRoad(xy) {
        const pick = PickFloorSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnRoad", xyz);
    }

    doClear(xy) {
        const pick = PickFloorSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "clearProp", xyz);
    }

    doBuild(xy) {
        const pick = PickFloorSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnBuilding", xyz);
    }

    doWater(xy) {
        const pick = PickFillSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnWater", {xyz, volume: 1});
    }

    doSource(xy) {
        const pick = PickFillSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnWaterSource", {xyz, flow: 2});
    }

    doSink(xy) {
        const pick = PickFillSurface(xy, GetTopLayer());
        const xyz = pick.xyz;
        if (!xyz || !Voxels.canEdit(...xyz)) return
        this.publish("editor", "spawnWaterSource", {xyz, flow: -2});
    }


}