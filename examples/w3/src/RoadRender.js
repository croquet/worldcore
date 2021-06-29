import { View} from "@croquet/croquet";
import { Triangles, GetNamedView, Lines, v4_max, v4_sub, v3_add, v3_multiply, Material, DrawCall, NamedView, UnitCube, m4_translation, GetViewRoot, viewRoot, ViewService, WCView, WorldCoreView } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { GetTopLayer } from "./Globals";

import paper from "../assets/paper.jpg";

//--------------------------------------------------------------------------------
//-- RoadRender ------------------------------------------------------------------
//--------------------------------------------------------------------------------

// Top level class that manages the exterior and interior terrain meshes and their
// corresponding draw calls.

export class RoadRender extends ViewService {
    constructor() {
        super("RoadRender");
        const render = this.service("RenderManager");
        console.log("Road render start");
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = new RoadLayer(this.model, z);
    }

    destroy() {
        super.destroy();
        this.layers.forEach(layer => layer.destroy);
    }

    add(key) {
        const xyz = Voxels.unpackKey(key);

    }

    remove(key) {
        const xyz = Voxels.unpackKey(key);
    }
}


//--------------------------------------------------------------------------------
//-- RoadLayer -------------------------------------------------------------------
//--------------------------------------------------------------------------------

class RoadLayer extends WorldCoreView {
    constructor(model,z) {
        super(model);
        this.z = z;
        this.triangles = new Triangles();
        this.triangles = UnitCube();
        this.triangles.transform(m4_translation([0,0,this.z * Voxels.scaleZ]));
        this.triangles.load();

        const render = this.service("RenderManager");

        this.material = new Material();
        this.drawCall = new DrawCall(this.triangles, this.material);
        render.scene.addDrawCall(this.drawCall);
    }

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        render.scene.removeDrawCall(this.drawCall);
        this.triangles.destroy();
    }

    add(key) {

    }

    remove(key) {

    }
}