import { NamedView, GetNamedView, v3_divide, Cube, Triangles, Material, DrawCall, m4_translation, v3_multiply, Lines, Cone, m4_rotationX, toRad } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { PickFloorSurface, PickDigVoxel, PickFillSurface, PickPlantSurface } from "./VoxelRaycast";
import { GetTopLayer } from "./Globals";

export class VoxelCursor extends NamedView {
    constructor(model) {
        super("VoxelCursor", model);
        this.viewRoot =  GetNamedView("ViewRoot");
        this.xy = [0,0];
        this.mode = 'dig';

        this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [0.2, 0.2, 0, 0.2]);
        // this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [1, 0, 0, 1]);
        // this.mesh = this.buildCube();
        this.mesh.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ/2]));
        this.mesh.load();

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;

        this.drawCall = new DrawCall(this.mesh, this.material);
        this.drawCall.isHidden = false;

        this.viewRoot.render.scene.addDrawCall(this.drawCall);

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

        if (xyz && Voxels.canEdit(...xyz)) {
            this.drawCall.isHidden = false;
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.drawCall.transform.set(m4_translation(location));
        } else {
            this.drawCall.isHidden = true;
        }

    }

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

// function ShadedCube(x, y, z, bottom = [1,1,1,1], top = [1,1,1,1]) {
//     const cube = new Triangles();
//     x /= 2;
//     y /= 2;
//     z /= 2;

//     cube.addFace([[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], ], [bottom, bottom, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);

//     cube.addFace([[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [bottom, top, top, bottom], [[0,0], [1,0], [1,1], [0,1]]);
//     cube.addFace([[-x, -y, -z], [-x, y, -z], [-x, y, z], [-x, -y, z]], [bottom, bottom, top, top], [[0,0], [1,0], [1,1], [0,1]]);

//     cube.addFace([[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [bottom, bottom, top, top], [[0,0], [1,0], [1,1], [0,1]]);
//     cube.addFace([[-x, -y, -z], [-x, -y, z], [x, -y, z], [x, -y, -z]], [bottom, top, top, bottom], [[0,0], [1,0], [1,1], [0,1]]);

//     cube.addFace([[x, y, z], [x, y, -z], [-x, y, -z], [-x, y, z]], [top, bottom, bottom, top], [[0,0], [1,0], [1,1], [0,1]]);
//     cube.addFace([[x, y, z], [-x, y, z], [-x, y, -z], [x, y, -z]], [top, top, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);

//     cube.addFace([[x, y, z], [x, -y, z], [x, -y, -z], [x, y, -z]], [top, top, bottom, bottom], [[0,0], [1,0], [1,1], [0,1]]);
//     cube.addFace([[x, y, z], [x, y, -z], [x, -y, -z], [x, -y, z]], [top, bottom, bottom, top], [[0,0], [1,0], [1,1], [0,1]]);

//     return cube;
// }