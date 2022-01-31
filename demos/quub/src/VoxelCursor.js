import { v3_multiply, m4_translation, v3_floor, ViewService } from "@croquet/worldcore-kernel";
import { DrawCall, Material, Triangles } from "@croquet/worldcore-webgl";
import { PickEmptyVoxel, PickSolidVoxel, PickBase } from "./VoxelRaycast";
import { Voxels } from "./Voxels";
import { Colors } from "./Colors";

// The voxel cursor tracks the mouse to show where you're editing. (It's not shown on touch devices.)
// It also listens for clicks and initiates edit commands.
//
// (Note that the cursor also listens for drag or rotate event so it can hide itself when the camera is moving.)

export class VoxelCursor extends ViewService {
    constructor() {
        super("VoxelCursor");

        this.mesh = this.buildCube();
        this.setColor(12);

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;
        this.isHidden = false;

        const noShow = 'ontouchstart' in document.documentElement; // Don't show the cursor on touch devices

        this.call = new DrawCall(this.mesh, this.material);
        this.call.isHidden = true;

        const render = this.service("WebGLRenderManager");
        if (!noShow) render.scene.addDrawCall(this.call);

        this.subscribe("hud", "editColor", this.setColor);
        this.subscribe("ui", "pointerMove", this.onPointerMove);
        this.subscribe("ui", "pointerDown", this.onPointerDown);
        this.subscribe("ui", "tap",this.onPointerTap);
        this.subscribe("voxels", "changed", this.onChanged)
        this.subscribe("god", "startDrag", this.onStartDrag);
        this.subscribe("god", "endDrag", this.onEndDrag);
    }

    onPointerMove(event) {
        if (event.type === "mouse" && event.button !== 2) {
            this.updateLocation(event.xy);
        }
    }

    onPointerDown(event) {
        if (event.type === "mouse" && event.button !== 2) {
            this.edit(event.xy);
        }
    }

    onPointerTap(event) {
        if (event.type === "touch") {
            this.tap(event.xy);
        }
    }

    destroy() {
        super.destroy();
        const render = this.service("WebGLRenderManager");
        render.scene.removeDrawCall(this.call);
        this.mesh.destroy();
        this.material.destroy();
    }

    setColor(c) {
        this.color = c;
        if (c === 0) {
            this.mesh.setColor([0.5, 0, 0, 0.5]);
        } else {
            const cc = Colors[this.color];
            this.mesh.setColor([cc[0]/2, cc[1]/2, cc[2]/2, 0.5]);
        }
        this.mesh.load();
        this.updateLocation(this.xy);
    }

    onChanged() {
        this.updateLocation(this.xy);
    }

    onStartDrag() {
        this.isHidden = true;
        this.updateLocation(this.xy);
    }

    onEndDrag() {
        this.isHidden = false;
        this.updateLocation(this.xy);
    }

    updateLocation(xy) {
        if (!xy) return;
        this.xy = xy;
        if (this.color) {
            this.updateFill(xy);
        } else {
            this.updateDelete(xy);
        }
    }

    updateDelete(xy) {
        const xyz = PickSolidVoxel(xy);
        this.xyz = xyz;
        if (xyz) {
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.call.isHidden = this.isHidden;
            this.call.transform.set(m4_translation(location));
        } else {
            this.call.isHidden = true;
        }
    }

    updateFill(xy) {
        const xyz = this.pickFill(xy);
        this.xyz = xyz;
        if (xyz) {
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.call.isHidden = this.isHidden;
            this.call.transform.set(m4_translation(location));
        } else {
            this.call.isHidden = true;
        }
    }

    pickFill(xy) {
        const pick = PickEmptyVoxel(xy);
        let xyz;
        if (pick) {
            xyz = pick.xyz;
        } else {
            xyz = PickBase(xy);
        }
        if (!xyz) return null;
        xyz = v3_floor(xyz);
        if (xyz[0] < 1 || xyz[0] > Voxels.sizeX-2) return null;
        if (xyz[1] < 1 || xyz[1] > Voxels.sizeY-2) return null;
        if (xyz[2] < 0 || xyz[2] > Voxels.sizeZ-2) return null;
        return xyz;
    }

    tap(xy) {
        this.updateLocation(xy);
        this.edit(xy);
    }

    edit(xy) {
        if (this.color) {
            this.fill(xy);
        } else {
            this.delete(xy);
        }
    }

    fill(xy) {
        if (!this.xyz) return;
        this.publish("edit", "setVoxel", {xyz: this.xyz, type: this.color});
    }

    delete(xy) {
        if (!this.xyz) return;
        this.publish("edit", "setVoxel", {xyz: this.xyz, type: 0});
    }

    buildCube() {
        const triangles = new Triangles();
        const color = [0.8, 0.8, 0.8, 0.8];
        const colors = [color,color,color,color];
        const coordinates = [[0,0], [1,0], [1,1], [0,1]];
        const x = Voxels.scaleX;
        const y = Voxels.scaleY;
        const z = Voxels.scaleZ;
        triangles.addFace([[0,0,0], [0,y,0], [x,y,0], [x,0,0]], colors, coordinates);
        triangles.addFace([[0,0,0], [0,0,z], [0,y,z], [0,y,0]], colors, coordinates);
        triangles.addFace([[0,0,0], [x,0,0], [x,0,z], [0,0,z]], colors, coordinates);
        triangles.addFace([[x,y,z], [x,y,0], [0,y,0], [0,y,z]], colors, coordinates);
        triangles.addFace([[x,y,z], [0,y,z], [0,0,z], [x,0,z]], colors, coordinates);
        triangles.addFace([[x,y,z], [x,0,z], [x,0,0], [x,y,0]], colors, coordinates);
        return triangles;
    }

}

