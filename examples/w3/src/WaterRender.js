import { View } from "@croquet/croquet";
import { Triangles, Material, DrawCall, GetNamedView, NamedView, v3_add } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

export class WaterRender extends NamedView {
    constructor(model) {
        super("WaterRender", model);

        this.mesh = new Triangles();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;
        this.call = new DrawCall(this.mesh, this.material);

        const render = GetNamedView("ViewRoot").render;
        render.scene.addDrawCall(this.call);

        this.rebuildMesh();

        this.subscribe("water", "changed", this.rebuildMesh);
    }

    rebuildMesh() {
        const c = [0, 0, 0.8, 0.2];
        this.mesh.clear();
        const water = this.wellKnownModel("Water");
        water.volume.forEach( (v,key) => {
            const xyz = Voxels.unpackKey(key);

            const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,v]));
            const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,v]));
            const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,v]));
            const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,v]));
            this.mesh.addFace([v0, v1, v2, v3], [c, c, c, c]);
        })
        this.mesh.load();
        this.mesh.clear();
    }
}

