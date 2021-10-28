import { TAU, toRad, v3_add, v2_rotate, viewRoot, ViewService, WorldcoreView } from "@croquet/worldcore-kernel";
import { Triangles, Material, DrawCall, UnitCube  } from "@croquet/worldcore-webgl"
import { Voxels } from "./Voxels";
import { RoadActor } from "./Props";

import paper from "../assets/paper.jpg";
import { straightThroughStringTask } from "simple-git/src/lib/tasks/task";

const roadColor = [0.6, 0.6, 0.6, 1];

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
        this.rebuild();
        this.subscribe("road", "add", this.add)
        this.subscribe("road", "delete", this.delete)
        this.subscribe("road", "change", this.change)
    }

    destroy() {
        super.destroy();
        this.layers.forEach(layer => layer.destroy);
    }

    rebuild() {
        const props = this.modelService("Props");
        props.props.forEach( prop => {
            if (!(prop instanceof RoadActor)) return;
            this.add(prop.xyz);
        })
    }

    add(xyz) {
        this.layers[xyz[2]].add(xyz);
    }

    delete(xyz) {
        this.layers[xyz[2]].delete(xyz);
    }

    change(xyz) {
        this.layers[xyz[2]].change(xyz);
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
        this.material.zOffset = -1;
        this.material.texture.loadFromURL(paper);
        this.drawCall = new DrawCall(this.triangles, this.material);
        render.scene.addDrawCall(this.drawCall);
        this.build();
    }

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        render.scene.removeDrawCall(this.drawCall);
        this.triangles.destroy();
    }

    add(xyz) {
        const key = Voxels.packKey(...xyz);
        this.keys.add(key);
        this.build();
    }

    delete(xyz) {
        const key = Voxels.packKey(...xyz);
        this.keys.delete(key);
        this.build();
    }

    change(xyz) {
        this.build();
    }

    build() {
        this.triangles.clear();
        const props = this.modelService("Props");
        this.keys.forEach( key => {
            const prop = props.get(key);
            switch(prop.exitCount) {
                case 1:
                    this.build1(prop);
                    break;
                case 2:
                case 3:
                case 4:
                    this.build234(prop);
                    break;
                default:
                    this.build0(prop);
            }
        })

        this.triangles.load();
    }

    build0(prop) {
        const xyz = prop.xyz;
        const center = [0.5, 0.5, 0];
        const steps = 32;
        const angle = TAU / steps;
        const rotor = [OCTAGON_SIDE * 0.5, 0];

        const circle = [];
        circle.push([...center])
        for (let i = 0; i < steps; i++) {
            const p = v2_rotate(rotor, angle*i);
            circle.push([center[0] + p[0], center[1] + p[1], 0]);
        }
        circle.push([...circle[1]]);
        this.addVertices(circle, xyz);
    }

    build1(prop) {
        const xyz = prop.xyz;
        const center = [0.5, 0.5, 0];
        const steps = 17;
        const angle = Math.PI / (steps-1);
        const rotor = [OCTAGON_SIDE * 0.5, 0];

        let side = 0;
        prop.ccwExits.forEach((exit,i)=> { if (exit) side = i; });

        const perimeter = [];
        perimeter.push([...center])
        for (let i = 0; i < steps; i++) {
            const p = v2_rotate(rotor, angle*i);
            perimeter.push([center[0] + p[0], center[1] + p[1], center[2]]);
        }
        perimeter.push([center[0] - OCTAGON_SIDE  * 0.5, center[1] - 0.5*OCTAGON_SIDE, center[2]]);
        perimeter.push([center[0] - OCTAGON_SIDE * 0.5, center[1] - 0.5, center[2]]);
        perimeter.push([center[0] + OCTAGON_SIDE * 0.5, center[1] - 0.5, center[2]]);
        perimeter.push([center[0] + OCTAGON_SIDE * 0.5, center[1] - 0.5*OCTAGON_SIDE, center[2]]);
        perimeter.push([...perimeter[1]]);

        rotate(perimeter, toRad(45) * (side+4), center);

        this.addVertices(perimeter, xyz);
    }

    buildTest(prop) {
        const xyz = prop.xyz;
        const center =  [0.5, 0.5, 0];

        const perimeter = [];
        perimeter.push([...center])
        const arc0 = arc4();
        arc0.forEach(v=> { perimeter.push([v[0], v[1], center[2]]); });

        const arc1 = arc4();
        rotate(arc1, 4 * toRad(45), [0.5,0.5]);
        arc1.forEach(v=> { perimeter.push([v[0], v[1], center[2]]); });
        perimeter.push([...perimeter[1]]);

        this.addVertices(perimeter, xyz);
    }

    build234(prop) {
        const xyz = prop.xyz;
        const center =  [0.5, 0.5, 0];
        const gaps = prop.exitGaps;

        const perimeter = [];
        perimeter.push([...center])
        gaps.forEach(gap => {
            const arc = findArc(gap.size);
            rotate(arc, gap.start*toRad(45), [0.5,0.5]);
            arc.forEach(v=> { perimeter.push([v[0],v[1], center[2]]); });
        })
        perimeter.push([...perimeter[1]]);

        this.addVertices(perimeter, xyz);
    }

    addVertices(vertices, xyz) {
        const surfaces = this.modelService("Surfaces");
        const uvs = [];
        const colors = [];
        vertices.forEach( v => {
            uvs.push([v[0], v[1]]);
            v[0] = xyz[0] + Math.min(0.9999, Math.max(0.0001, v[0]));
            v[1] = xyz[1] + Math.min(0.9999, Math.max(0.0001, v[1]));
            v[2] = xyz[2];
            colors.push(roadColor);
            const elevation = surfaces.elevation(v);
            v[2] += elevation;

        });

        vertices.forEach( v => {
            v[0] *= Voxels.scaleX;
            v[1] *= Voxels.scaleY;
            v[2] *= Voxels.scaleZ;
        });

        this.triangles.addFace(vertices, colors, uvs);

    }
}

// Helper Functions


const OCTAGON_INSET = (1 - 1/Math.tan(toRad(67.5))) / 2;
const OCTAGON_SIDE = 1 - 2 * OCTAGON_INSET;

// function octagon() {
//     const a = OCTAGON_INSET;
//     const b = 1-OCTAGON_INSET;
//     return [
//         [a, 1], [b, 1],
//         [1, b], [1, a],
//         [b, 0], [a, 0],
//         [0, a], [0, b]
//     ];
// }

// function frac(x) {
//     return x - Math.floor(x);
// }

function clip(v) {
    v[0] = Math.min(0.9999, Math.max(0.0001, v[0]));
    v[1] = Math.min(0.9999, Math.max(0.0001, v[1]));
}

function rotate(xyzs, angle, center) {
    xyzs.forEach( xyz => {
        const xy = [xyz[0] - center[0], xyz[1] - center[1]]
        const p = v2_rotate([xy[0], xy[1]], angle);
        xyz[0] = p[0] + center[0];
        xyz[1] = p[1] + center[1];
    });
}

function findArc(gapSize) {
    switch(gapSize) {
        case 2: return arc2();
        case 3: return arc3();
        case 4: return arc4();
        case 5: return arc5();
        case 6: return arc6();
        default:
    }
    return [];
}

function arc2 () {
    const rotor = [OCTAGON_INSET, 0];
    const out = [];
    const steps = 16;
    const angle = toRad(90) / (steps-1);
    for (let i = 0; i < steps; i++) {
        const p = v2_rotate(rotor, -i * angle);
        out.push([p[0], p[1]+1]);
    }
    return out;
}

function arc3 () {
    const rotor = [1, 0];
    const out = [];
    const steps = 16;
    const angle = toRad(45) / (steps-1);
    for (let i = 0; i < steps; i++) {
        const p = v2_rotate(rotor, -i * angle);
        out.push([p[0]-(OCTAGON_INSET + OCTAGON_SIDE), p[1]+1]);
    }
    return out;
}

function arc4() {
    return [[OCTAGON_INSET, 1], [OCTAGON_INSET, 0]]
}

function arc5 () {
    const rotor = [-(1+OCTAGON_SIDE), 0];
    const out = [];
    const steps = 16;
    const angle = toRad(45) / (steps-1);
    for (let i = 0; i < steps; i++) {
        const p = v2_rotate(rotor, i * angle);
        // out.push([...p]);
        out.push([p[0]+(OCTAGON_INSET+OCTAGON_SIDE+1), p[1]+1]);
    }
    return out;
}

function arc6 () {
    const rotor = [-(OCTAGON_INSET+ OCTAGON_SIDE), 0];
    const out = [];
    const steps = 16;
    const angle = toRad(90) / (steps-1);
    for (let i = 0; i < steps; i++) {
        const p = v2_rotate(rotor, i * angle);
        out.push([p[0]+((2*OCTAGON_INSET+ OCTAGON_SIDE)), p[1]+1]);
    }
    return out;
}


