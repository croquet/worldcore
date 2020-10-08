import { GetNamedView, DrawCall, Material, v3_multiply, m4_translation, NamedView, Triangles, GetNamedModel, v3_floor, UnitCube } from "@croquet/worldcore";
import { PickEmptyVoxel, PickSolidVoxel, PickBase } from "./VoxelRaycast";
import { Voxels } from "./Voxels";
import { Colors } from "./Colors";

export class VoxelCursor extends NamedView {
    constructor() {
        super("VoxelCursor");
        this.xyz = [0,0,0];
        this.mode = 'cube';
        this.color = 0;

        // this.subscribe("hud", "editMode", m => this.setMode(m));
        // this.subscribe("hud", "editColor", c => this.setColor(c));
        // this.subscribe("input", "cursorXY", xy => this.updateCursor(xy));
        // this.subscribe("input", "cursorHidden", isHidden => this.isHidden = isHidden);
        // this.subscribe("camera", "move", () => this.moveCamera());

        this.mesh = new UnitCube();
        this.mesh.load();
        this.mesh.clear();

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;

        this.call = new DrawCall(this.mesh, this.material);
        // this.call.isHidden = false;

        this.call.transform.set(m4_translation([0,0,0]));

        const render = GetNamedView("ViewRoot").render;
        render.scene.addDrawCall(this.call);
    }

    // setMode(m) {
    //     this.mode = m;
    // }

    // setColor(c) {
    //     this.color = c;
    // }

    // destroy() {
    //     super.destroy();
    //     GetNamedView("ViewRoot").render.scene.removeDrawCall(this.call);
    //     this.mesh.destroy();
    //     this.material.destroy();
    // }

    // hide() {
    //     this.isHidden = true;
    // }

    // show() {
    //     this.isHidden = false;
    // }

    // moveCamera() {
    //     if (this.cursorXY) this.updateCursor(this.cursorXY);
    // }

    // Checks to see if the cursor is over a visible surface. If so, it sets:
    //
    // * xyz -- the coordinates of the voxel containing the surface
    // * intersect -- the exact point in voxel space that's being picked
    // * direction -- the orientation of the surface selected
    // * isSolid -- whether the selected voxel is solid (only possible during cutaways, direction always down)
    //
    // xyz = null means no voxel is selected.

    // updateCursor(xy) {
    //     this.xyz = null;
    //     this.cursorXY = xy;
    //     this.call.isHidden = true;
    //     if (this.isHidden) return;
    //     // const pick = PickEmptyVoxel(xy);
    //     // let xyz;
    //     // if (pick) {
    //     //     xyz = pick.xyz;
    //     // } else {
    //     //     xyz = PickBase(xy);
    //     // }

    //     // console.log(xyz);
    //     // const pick = PickEmptyVoxel(xy);
    //     // if (pick) console.log(pick.xyz + " " + pick.intersect + " " + pick.direction);
    //     // if (!pick.xyz) return;

    //     switch (this.mode) {
    //         case 'cube':
    //             this.updateCube(xy);
    //             break;
    //         case 'delete':
    //             this.updateDelete(xy);
    //             break;
    //         default:
    //     }

    // }

    // updateCube(xy) {
    //     const pick = PickEmptyVoxel(xy);
    //     let xyz;
    //     if (pick) {
    //         xyz = pick.xyz;
    //     } else {
    //         xyz = PickBase(xy);
    //     }

    //     const viewRoot =  GetNamedView("ViewRoot");
    //     const voxels = viewRoot.model.voxels;

    //     if (!xyz) return;


    //     this.xyz = v3_floor(xyz);

    //     // console.log(this.xyz);
    //     if (!Voxels.isValid(...this.xyz) || voxels.get(...this.xyz)) return;

    //     const cc = Colors[this.color];
    //     const color = [cc[0]/2, cc[1]/2, cc[2]/2, 0.5];

    //     this.mesh.clear();
    //     this.addCube(this.mesh, color, 1);
    //     this.mesh.load();
    //     this.mesh.clear();

    //     const center = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], this.xyz);
    //     this.call.transform.set(m4_translation(center));
    //     this.call.isHidden = false;
    //     if (this.xyz[0] < 1 || this.xyz[0] >= Voxels.sizeX-1) this.call.isHidden = true;
    //     if (this.xyz[1] < 1 || this.xyz[1] >= Voxels.sizeY-1) this.call.isHidden = true;
    // }

    // fillXYZ(pick) {
    //     const xyz = [...pick.xyz];
    //     if (pick.isSolid) return xyz;

    //     const id = Voxels.packID(...xyz);
    //     const surfaces = GetNamedModel('Surfaces');
    //     const surface = surfaces.get(id);

    //     switch (pick.direction) {
    //         case Voxels.north:
    //             if (surface.sides[Voxels.north]) xyz[1] += 1;
    //             break;
    //         case Voxels.south:
    //             if (surface.sides[Voxels.south]) xyz[1] -= 1;
    //             break;
    //         case Voxels.east:
    //             if (surface.sides[Voxels.east]) xyz[0] += 1;
    //             break;
    //         case Voxels.west:
    //             if (surface.sides[Voxels.west]) xyz[0] -= 1;
    //             break;
    //         case Voxels.below:
    //             if (surface && (surface.shape === 4 || surface.shape) === 5) xyz[2] -= 1;
    //             break;
    //         default:
    //     }

    //     return xyz;
    // }

    // updateDelete(xy) {
    //     const xyz = PickSolidVoxel(xy);
    //     // let xyz;
    //     // if (pick) {
    //     //     xyz = pick.xyz;
    //     // } else {
    //     //     xyz = PickBase(xy);
    //     // }
    //     if (!xyz) return;
    //     this.xyz = v3_floor(xyz);
    //     // this.xyz = this.digXYZ(pick);
    //     let color = [0.5,0,0,0.5];
    //     if (!Voxels.canEdit(...this.xyz)) color = [0.2,0.2,0.2,0.5];

    //     // const height = this.digCursorHeight(pick);

    //     this.mesh.clear();
    //     this.addCube(this.mesh, color, 1);
    //     this.mesh.load();
    //     this.mesh.clear();

    //     const center = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], this.xyz);
    //     this.call.transform.set(m4_translation(center));
    //     this.call.isHidden = false;
    // }

    // digXYZ(pick) {
    //     const xyz = [...pick.xyz];

    //     if (pick.isSolid) {
    //         xyz[2] -= 1;
    //         return xyz;
    //     }

    //     switch (pick.direction) {
    //         case Voxels.north:
    //             xyz[1] += 1;
    //             break;
    //         case Voxels.south:
    //             xyz[1] -= 1;
    //             break;
    //         case Voxels.east:
    //             xyz[0] += 1;
    //             break;
    //         case Voxels.west:
    //             xyz[0] -= 1;
    //             break;
    //         case Voxels.above:
    //             xyz[2] += 1;
    //             break;
    //         case Voxels.below:
    //             xyz[2] -= 1;
    //             break;
    //         default:
    //     }

    //     const viewRoot = GetNamedView('ViewRoot');
    //     const voxels = viewRoot.model.voxels;
    //     const type = voxels.get(...xyz);
    //     if (!type) xyz[2] -= 1;

    //     return xyz;
    // }

    // digCursorHeight(pick) {
    //     if (pick.isSolid) return 1;

    //     if (pick.direction === Voxels.below) {
    //         const id = Voxels.packID(...pick.xyz);
    //         const surfaces = GetNamedModel('Surfaces');
    //         const surface = surfaces.get(id);
    //         if (surface.shape === 2) return 1;
    //     }

    //     return pick.xyz[2] - this.xyz[2] + 1;
    // }

    // addCube(triangles, color, height) {
    //     const colors = [color,color,color,color];
    //     const coordinates = [[0,0], [1,0], [1,1], [0,1]];
    //     const x = Voxels.scaleX;
    //     const y = Voxels.scaleY;
    //     const z = Voxels.scaleZ * height;
    //     triangles.addFace([[0,0,0], [0,y,0], [x,y,0], [x,0,0]], colors, coordinates);
    //     triangles.addFace([[0,0,0], [0,0,z], [0,y,z], [0,y,0]], colors, coordinates);
    //     triangles.addFace([[0,0,0], [x,0,0], [x,0,z], [0,0,z]], colors, coordinates);
    //     triangles.addFace([[x,y,z], [x,y,0], [0,y,0], [0,y,z]], colors, coordinates);
    //     triangles.addFace([[x,y,z], [0,y,z], [0,0,z], [x,0,z]], colors, coordinates);
    //     triangles.addFace([[x,y,z], [x,0,z], [x,0,0], [x,y,0]], colors, coordinates);
    // }

}

