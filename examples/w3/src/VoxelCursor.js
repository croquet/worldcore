import { NamedView, GetNamedView, v3_divide, Cube, Triangles, Material, DrawCall, m4_translation, v3_multiply, Lines, Cone, m4_rotationX, toRad, GetViewRoot, viewRoot, ViewService } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { PickFloorSurface, PickDigVoxel, PickFillSurface, PickPlantSurface } from "./VoxelRaycast";
import { GetTopLayer } from "./Globals";

export class VoxelCursor extends ViewService {
    constructor() {
        super("VoxelCursor");
        // this.viewRoot =  GetNamedView("ViewRoot");
        // this.viewRoot =  GetViewRoot();
        this.xy = [0,0];
        this.mode = 'dig';

        this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [0.2, 0.2, 0, 0.2]);
        this.double = Cube(Voxels.scaleX, Voxels.scaleY, 2*Voxels.scaleZ, [0.2, 0.2, 0, 0.2]);
        // this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [1, 0, 0, 1]);
        // this.mesh = this.buildCube();
        this.mesh.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ/2]));
        this.double.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ]));
        this.mesh.load();
        this.double.load();

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;

        this.drawCall = new DrawCall(this.mesh, this.material);
        this.drawCall.isHidden = false;

        this.doubleCall = new DrawCall(this.double, this.material);
        this.doubleCall.isHidden = false;

        GetViewRoot().render.scene.addDrawCall(this.drawCall);
        GetViewRoot().render.scene.addDrawCall(this.doubleCall);

        this.subscribe("ui", "pointerMove", this.onPointerMove);
        this.subscribe("hud", "editMode", this.onEditMode);
    }

    onPointerMove(d) {
        this.xy = d.xy;
        this.hasMouse = (d.type === 'mouse');
    }

    onEditMode(mode) {
        this.mode = mode;
    }

    update(time, delta) {
        let xyz;

        if (!this.hasMouse) {
            this.drawCall.isHidden = true;
            return;
        }
        switch(this.mode) {
            case 'dig':
                xyz = PickDigVoxel(this.xy, GetTopLayer());
                break;
            case 'fill':
                xyz = PickFillSurface(this.xy, GetTopLayer()).xyz;
                break;
            case 'spawn':
            case 'road':
                xyz = PickFloorSurface(this.xy, GetTopLayer()).xyz;
                break;
            case 'tree':
                xyz = PickPlantSurface(this.xy, GetTopLayer()).xyz;
                break;
            case 'water':
            case 'source':
            case 'sink':
                xyz = PickFillSurface(this.xy, GetTopLayer()).xyz;
                break;
            default:
        }

        this.drawCall.isHidden = true;
        this.doubleCall.isHidden = true;
        let call = this.drawCall;

        if (xyz && Voxels.canEdit(...xyz)) { // If the picked voxel is hidden by surfaces above it, draw the double-height cursor
            const surfaces = this.wellKnownModel('Surfaces');
            const above = Voxels.adjacent(...xyz, Voxels.above);
            const aboveKey = Voxels.packKey(...above);
            const aboveSurface = surfaces.get(aboveKey);
            if (xyz[2] < GetTopLayer()-1 && aboveSurface && aboveSurface.hidesBelow()) call = this.doubleCall;
            call.isHidden = false;
            const translation = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            call.transform.set(m4_translation(translation));
        }

    }

    // digXYZ() {
    //     const surfaces = this.wellKnownModel('Surfaces');
    //     const xyz = PickDigVoxel(this.xy, GetTopLayer());
    //     if (!xyz) return xyz;
    //     const above = Voxels.adjacent(...xyz, Voxels.above);
    //     const aboveKey = Voxels.packKey(...above);
    //     const aboveSurface = surfaces.get(aboveKey);
    //     if (aboveSurface && aboveSurface.hidesBelow()) {};
    //     return xyz;
    // }

    buildCube() {
        const lines = new Triangles();
        const x = Voxels.scaleX;
        const y = Voxels.scaleY;
        const z = Voxels.scaleZ;
        const c = [1,1,1,1];
        lines.addFace([[0,0,z],[x,0,z],[x,y,z],[0,y,z]],[c,c,c,c]);
        return lines;
    }

}
