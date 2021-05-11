import { NamedView, GetNamedView, v3_divide, Cube, Triangles, Material, DrawCall, m4_translation, v3_multiply } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { PickFloor, PickSolid, PickEmpty, PickSurface, PickVoxel } from "./VoxelRaycast";
import { GetTopLayer } from "./Globals";

export class VoxelCursor extends NamedView {
    constructor(model) {
        super("VoxelCursor", model);
        this.viewRoot =  GetNamedView("ViewRoot");
        this.xy = [0,0];
        this.mode = 'dig';

        this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [0.2, 0.2, 0, 0.2]);
        this.mesh.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ/2]));
        this.mesh.load();

        // this.double = ShadedCube(Voxels.scaleX, Voxels.scaleY, 2*Voxels.scaleZ, [0.5, 0.5, 0.0, 0.5], [0, 0, 0, 0]);
        // this.double = Cube(Voxels.scaleX, Voxels.scaleY, 1.5*Voxels.scaleZ, [0.2, 0.2, 0, 0.2]);
        // this.double.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, 0.75* Voxels.scaleZ]));
        // this.double.load();

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;

        this.drawCall = new DrawCall(this.mesh, this.material);
        this.drawCall.isHidden = false;

        // this.doubleCall = new DrawCall(this.double, this.material);
        // this.doubleCall.isHidden = false;

        this.viewRoot.render.scene.addDrawCall(this.drawCall);
        // this.viewRoot.render.scene.addDrawCall(this.doubleCall);

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
                xyz = PickSolid(this.xy, GetTopLayer());
                break;
            case 'fill':
                xyz = PickEmpty(this.xy, GetTopLayer()).xyz;
                break;
            case 'spawn':
                xyz = PickFloor(this.xy, GetTopLayer()).xyz;
                break;
            default:
        }

        if (xyz && Voxels.canEdit(...xyz)) {
            // this.doubleCall.isHidden = true;
            this.drawCall.isHidden = false;
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.drawCall.transform.set(m4_translation(location));
            // this.doubleCall.transform.set(m4_translation(location));
        } else {
            this.drawCall.isHidden = true;
            // this.doubleCall.isHidden = true;
        }

    }

}

function ShadedCube(x, y, z, bottom = [1,1,1,1], top = [1,1,1,1]) {
    const cube = new Triangles();
    x /= 2;
    y /= 2;
    z /= 2;

    cube.addFace([[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], ], [bottom, bottom, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);

    cube.addFace([[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [bottom, top, top, bottom], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-x, -y, -z], [-x, y, -z], [-x, y, z], [-x, -y, z]], [bottom, bottom, top, top], [[0,0], [1,0], [1,1], [0,1]]);

    cube.addFace([[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [bottom, bottom, top, top], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-x, -y, -z], [-x, -y, z], [x, -y, z], [x, -y, -z]], [bottom, top, top, bottom], [[0,0], [1,0], [1,1], [0,1]]);

    cube.addFace([[x, y, z], [x, y, -z], [-x, y, -z], [-x, y, z]], [top, bottom, bottom, top], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[x, y, z], [-x, y, z], [-x, y, -z], [x, y, -z]], [top, top, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);

    cube.addFace([[x, y, z], [x, -y, z], [x, -y, -z], [x, y, -z]], [top, top, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[x, y, z], [x, y, -z], [x, -y, -z], [x, -y, z]], [top, bottom, bottom, top], [[0,0], [1,0], [1,1], [0,1]]);

    return cube;
}