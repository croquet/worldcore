import { TAU, toRad, v3_add, v2_rotate, viewRoot, ViewService, WorldcoreView } from "@croquet/worldcore-kernel";
import { Triangles, Material, DrawCall, UnitCube  } from "@croquet/worldcore-webgl"
import { Voxels } from "./Voxels";

import paper from "../assets/paper.jpg";

//--------------------------------------------------------------------------------
//-- RoadRender ------------------------------------------------------------------
//--------------------------------------------------------------------------------

export class RoadRender extends ViewService {
    constructor() {
        super("RoadRender");
        const render = this.service("RenderManager");
        console.log("Road render start");
        this.layers = [];
        for (let z = 0; z < Voxels.sizeZ; z++) this.layers[z] = new RoadLayer(z);
        this.subscribe("road", "add", this.add)
        this.subscribe("road", "delete", this.delete)
    }

    destroy() {
        super.destroy();
        this.layers.forEach(layer => layer.destroy);
    }

    add(xyz) {
        this.layers[xyz[2]].add(xyz);
    }

    delete(xyz) {
        this.layers[xyz[2]].delete(xyz);
    }

}


//--------------------------------------------------------------------------------
//-- RoadLayer -------------------------------------------------------------------
//--------------------------------------------------------------------------------

class RoadLayer extends WorldcoreView {
    constructor(z) {
        super(viewRoot.model);
        this.z = z;
        this.keys = new Set();

        this.triangles = new Triangles();
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

    add(xyz) {
        console.log(xyz);
        const key = Voxels.packKey(xyz);
        this.keys.add(key);
        this.rebuild();
    }

    delete(xyz) {
        const key = Voxels.packKey(xyz);
        this.keys.delete(key);
    }

    rebuild() {
        this.triangles.clear();
        const props = this.modelService("Props");
        this.keys.forEach( key => {
            console.log(key);
            // const prop = props.get(key);
            // const xyz = prop.xyz;
            // this.build0(xyz);
        })
        this.triangles.load();
    }

    build0(xyz) {
        const center = v3_add(xyz, [0.5, 0.5, 0]);
        const steps = 32;
        const angle = TAU / steps;
        const rotor = [OCTAGON_SIDE * 0.5, 0];

        const circle =[];
        circle.push([...center])
        for (let i = 0; i < steps; i++) {
            const p = v2_rotate(rotor, angle*i);
            circle.push([center[0] + p[0], center[1] + p[1], center[2]]);
        }
        circle.push([...circle[1]]);
        this.scale(circle);
        console.log(circle);
    }

    scale(vertices) {
        vertices.forEach( xyz => {
            xyz[0] *= Voxels.scaleX;
            xyz[1] *= Voxels.scaleY;
            xyz[2] *= Voxels.scaleZ;
        });
    }
}

// Helper Functions


const OCTAGON_INSET = (1 - 1/Math.tan(toRad(67.5))) / 2;
const OCTAGON_SIDE = 1 - 2 * OCTAGON_INSET;
