import { Triangles, Material, DrawCall, GetNamedView, NamedView, v3_add } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

export class WaterRender extends NamedView {
    constructor(model) {
        super("WaterRender", model);

        this.sums = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));
        this.counts = Array.from(Array(Voxels.sizeX+1), () => new Array(Voxels.sizeY+1));

        this.clearGrid();

        this.mesh = new Triangles();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;
        this.call = new DrawCall(this.mesh, this.material);

        const render = GetNamedView("ViewRoot").render;
        render.scene.addDrawCall(this.call);

        this.rebuildMesh2();

        this.subscribe("water", "changed", this.rebuildMesh2);
    }

    clearGrid() {
        this.sums.forEach( c => c.fill(0) );
        this.counts.forEach( c => c.fill(0) );
    }

    rebuildMesh() {
        const color = [0, 0, 0.8, 0.2];
        this.mesh.clear();
        const water = this.wellKnownModel("Water");

        water.layers.forEach( layer => {

            layer.volume.forEach( (v,key) => {
                let c = color;
                if (v < 0.2) {
                    const scale = v / 0.2;
                    c = [0, 0, 0.8* scale, 0.2 * scale];
                }
                const xyz = Voxels.unpackKey(key);
                const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,v]));
                const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,v]));
                const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,v]));
                const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,v]));
                this.mesh.addFace([v0, v1, v2, v3], [c, c, c, c]);
            })
        })

        this.mesh.load();
        this.mesh.clear();
    }

    rebuildMesh2() {
        const water = this.wellKnownModel("Water");
        this.mesh.clear();

        water.layers.forEach( layer => this.rebuildLayerMesh(layer));

        this.mesh.load();
        this.mesh.clear();
    }

    rebuildLayerMesh(layer) {
        if (layer.volume.length === 0) return;
        this.clearGrid();
        layer.volume.forEach( (v,key) =>  {
            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            this.sums[x][y] += v;
            this.sums[x+1][y] += v;
            this.sums[x][y+1] += v;
            this.sums[x+1][y+1] += v;

            this.counts[x][y]++;
            this.counts[x+1][y]++;
            this.counts[x][y+1]++;
            this.counts[x+1][y+1]++;
        });

        layer.volume.forEach( (v,key) =>  {
            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];

            const sw = this.sums[x][y] / this.counts[x][y];
            const se = this.sums[x+1][y] / this.counts[x+1][y];
            const ne = this.sums[x+1][y+1] / this.counts[x+1][y+1];
            const nw = this.sums[x][y+1] / this.counts[x][y+1];

            const c = [0, 0, 0.8, 0.2];

            const v0 = Voxels.toWorldXYZ(...v3_add(xyz, [0.5,0.5,v]));
            const v1 = Voxels.toWorldXYZ(...v3_add(xyz, [0,0,sw]));
            const v2 = Voxels.toWorldXYZ(...v3_add(xyz, [1,0,se]));
            const v3 = Voxels.toWorldXYZ(...v3_add(xyz, [1,1,ne]));
            const v4 = Voxels.toWorldXYZ(...v3_add(xyz, [0,1,nw]));

            const c0 = ScaleColor(c, v);
            const c1 = ScaleColor(c, sw);
            const c2 = ScaleColor(c, se);
            const c3 = ScaleColor(c, ne);
            const c4 = ScaleColor(c, nw);

            this.mesh.addFace([v0, v1, v2, v3, v4, v1], [c0, c1, c2, c3, c4, c1]);
        });

    }
}

function ScaleColor(c, v) {
    if (v > 0.2) return c;
    const scale = v / 0.2;
    return c.map(x => x * scale);
}

