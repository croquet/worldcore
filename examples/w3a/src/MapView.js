import { viewRoot, WorldcoreView, Constants, THREE, v3_add, v3_multiply, ThreeRenderManager } from "@croquet/worldcore";

import { LineBuilder, TriangleBuilder } from "./Tools";
import paper from ".././assets/paper.jpg";
import { unpackKey } from "./Voxels";

export class MapView extends WorldcoreView {
    constructor() {
        super(viewRoot.model)

        this.tb = new TriangleBuilder();
        this.lb = new LineBuilder();

        this.triangleMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(1,1,1)});
        this.triangleMaterial.polygonOffset = true;
        this.triangleMaterial.polygonOffsetFactor = 1;
        this.triangleMaterial.polygonOffsetUnits = 1;
        this.triangleMaterial.shadowSide = THREE.DoubleSide;
        this.triangleMaterial.vertexColors = true;

        this.image = new Image();
        this.image.onload = () => {
            if (this.triangleMaterial.map) this.triangleMaterial.map.dispose();
            this.triangleMaterial.map = new THREE.CanvasTexture(this.image);
            this.triangleMaterial.needsUpdate = true;
        }
        this.image.src = paper;

        this.lineMaterial = new THREE.LineBasicMaterial( {color: new THREE.Color(0.9,0.9,0.9)} );
        this.lineMaterial.blending = THREE.MultiplyBlending;
        this.lineMaterial.blendSrc = THREE.OneMinusSrcColorFactor;
        this.lineMaterial.blendDst = THREE.DstColorFactor;
        this.lineMaterial.polygonOffset = true;
        this.lineMaterial.polygonOffsetFactor = -1;
        this.lineMaterial.polygonOffsetUnits = -1;

        this.buildGeometry();

        // this.subscribe("input", "pointerDown", this.ttt);
    }

    get collider() {
        return [this.mesh];
    }

    ttt(e) {
        console.log (e);
        const x = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( e.xy[1] / window.innerHeight ) * 2 + 1;
        const render = this.service("ThreeRenderManager");
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x: x, y: y}, render.camera);
        const colliders = [this.mesh];
        let hits = raycaster.intersectObjects( colliders );
        console.log(hits[0].point.x/5);
    }

    buildGeometry() {
        const render = this.service("ThreeRenderManager");
        const surfaces = this.modelService("Surfaces");

        if (this.triangleGeometry) this.triangleGeometry.dispose();
        if (this.lineGeometry) this.lineGeometry.dispose();

        this.tb.clear();
        this.lb.clear();
        surfaces.surfaces.forEach(surface => {
            this.buildFaces(surface);
            this.buildRamps(surface);
            this.buildDoubles(surface);
            this.buildCaps(surface);
            this.buildSides(surface);
            this.buildShims(surface);
        });

        this.triangleGeometry = this.tb.build();
        this.lineGeometry = this.lb.build();

        this.mesh = new THREE.Mesh( this.triangleGeometry, this.triangleMaterial );
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;

        this.lines  = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);

        render.scene.add(this.mesh);
        render.scene.add(this.lines);
    }

    buildFaces(surface) {
        const xyz = surface.xyz;
        const color = [0.5,0.5,0.5];
        if (surface.faces[4]) this.buildFloor(xyz,color);
        if (surface.faces[3]) this.buildNorth(xyz,color);
        if (surface.faces[2]) this.buildEast(xyz,color);
        if (surface.faces[1]) this.buildSouth(xyz,color);
        if (surface.faces[0]) this.buildWest(xyz,color);
    }

    buildFloor(xyz,color) {
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildNorth(xyz,color) {
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildSouth(xyz,color) {
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildWest(xyz,color) {
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildEast(xyz,color) {
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
        vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildRamps(surface) {
        const xyz = surface.xyz;
        const color = [1,0,1];
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.ramps[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([1,1]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
        if (surface.ramps[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([1,1]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
        if (surface.ramps[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([1,1]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
        if (surface.ramps[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([1,1]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
    }

    buildDoubles(surface) {
        const xyz = surface.xyz;
        const color = [0,1,1];
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.doubles[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
    }

    buildCaps(surface) {
        const xyz = surface.xyz;
        const color = [0,0,1];
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.caps[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.caps[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.caps[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.caps[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

    }

    buildSides(surface) {
        const xyz = surface.xyz;
        const color = [1,0,0];
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.sides[0]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[0] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            }
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.sides[1]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[1] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            }
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.sides[2]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[2] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            }
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.sides[3]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[3] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
                vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            }
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

    }

    buildShims(surface) {
        const xyz = surface.xyz;
        const color = [0,1,0];
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.shims[0]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[0,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.shims[1]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[1,0,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.shims[2]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[1,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,1,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,0,0]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }

        if (surface.shims[3]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[0,1,1]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,0,0]),s));
            vertices.push(v3_multiply(v3_add(xyz,[1,1,0]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        }



    }

    destroy() {
        super.destroy();
        if (this.triangleMaterial)  {
            if (this.triangleMaterial.map) this.triangleMaterial.map.dispose();
            this.triangleMaterial.dispose();
        }
        if (this.lineMaterial) this.lineMaterial.dispose();
        if (this.triangleGeometry) this.triangleGeometry.dispose();
        if (this.lineGeometry) this.lineGeometry.dispose();
    }


}