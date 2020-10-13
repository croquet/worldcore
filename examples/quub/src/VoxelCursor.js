import { GetNamedView, DrawCall, Material, v3_multiply, m4_translation, NamedView, Triangles, GetNamedModel, v3_floor, UnitCube } from "@croquet/worldcore";
import { PickEmptyVoxel, PickSolidVoxel, PickBase } from "./VoxelRaycast";
import { Voxels } from "./Voxels";
import { Colors } from "./Colors";

export class VoxelCursor extends NamedView {
    constructor() {
        super("VoxelCursor");

        this.mesh = this.buildCube();
        this.setColor(12);
        this.setMode('delete');

        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;

        this.call = new DrawCall(this.mesh, this.material);
        this.call.isHidden = true;

        const render = GetNamedView("ViewRoot").render;
        render.scene.addDrawCall(this.call);

        this.subscribe("hud", "editMode", this.setMode);
        this.subscribe("hud", "editColor", this.setColor);
        this.subscribe("input", "mouseXY", this.updateLocation);
        this.subscribe("ui", "mouse0Down", this.edit);
        this.subscribe("voxels", "changed", this.onChanged)
    }

    destroy() {
        super.destroy();
        GetNamedView("ViewRoot").render.scene.removeDrawCall(this.call);
        this.mesh.destroy();
        this.material.destroy();
    }

    setMode(m) {
        this.mode = m;
        if (m === 'fill') {
            this.setColor(this.color);
        } else {
            this.mesh.setColor([0.5, 0, 0, 0.5]);
            this.mesh.load();
        }
    }

    setColor(c) {
        this.color = c;
        const cc = Colors[this.color];
        const color = [cc[0]/2, cc[1]/2, cc[2]/2, 0.5];
        this.mesh.setColor(color);
        this.mesh.load();
    }

    onChanged() {
        this.updateLocation(this.xy);
    }

    updateLocation(xy) {
        if (!xy) return;
        this.xy = xy;
        switch(this.mode) {
            case 'fill':
                this.updateFill(xy);
                break;
            case 'delete':
                this.updateDelete(xy);
                break;
        }
    }

    updateDelete(xy) {
        const xyz = PickSolidVoxel(xy);
        this.xyz = xyz;
        if (xyz) {
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.call.isHidden = false;
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
            this.call.isHidden = false;
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
        if (xyz[0] < 1 || xyz[0] > Voxels.sizeX-1) return null;
        if (xyz[1] < 1 || xyz[1] > Voxels.sizeY-1) return null;
        if (xyz[2] < 0 || xyz[2] > Voxels.sizeZ) return null;
        return xyz;
    }

    edit(xy) {
        switch(this.mode) {
            case 'fill':
                this.fill(xy);
                break;
            case 'delete':
                this.delete(xy);
                break;
        }
    }

    fill(xy) {
        if (!this.xyz) return;
        this.publish("edit", "setVoxel", {xyz: this.xyz, type: this.color});
        // this.call.isHidden = true;
    }

    delete(xy) {
        if (!this.xyz) return;
        this.publish("edit", "setVoxel", {xyz: this.xyz, type: 0});
        // this.call.isHidden = true;
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

