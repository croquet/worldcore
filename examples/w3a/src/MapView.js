import { viewRoot, WorldcoreView, Constants, THREE, v3_add, v3_multiply, ThreeRenderManager } from "@croquet/worldcore";

import { LineBuilder, TriangleBuilder, TriBuilder } from "./Tools";
import paper from ".././assets/paper.jpg";;

const e = 0.00001; // Offset to prevent floor error at voxel edges
const a = e;
const b = 1-e;

export class MapView extends WorldcoreView {
    constructor() {
        super(viewRoot.model)

        this.tb = new TriangleBuilder();
        this.lb = new LineBuilder();

        this.buildMaterial();
        this.buildGeometry();

        this.subscribe("surfaces", "rebuildAll", this.buildGeometry);
        this.subscribe("input", "pDown", this.buildGeometry);
    }

    destroy() {
        super.destroy();
        this.disposeFrame();
        this.disposeGeometry();
        this.disposeMaterial();
    }

    disposeGeometry(){
        if (this.triangleGeometry) this.triangleGeometry.dispose();
        if (this.lineGeometry) this.lineGeometry.dispose();
    }

    disposeFrame() {
        if (this.frameGeometry) this.frameGeometry.dispose();
        if (this.frameLinesGeometry) this.frameLinesGeometry.dispose();
    }

    disposeMaterial(){
        if (this.frameMaterial) this.frameMaterial.dispose();
        if (this.lineMaterial) this.lineMaterial.dispose();
        if (this.triangleMaterial)  {
            if (this.triangleMaterial.map) this.triangleMaterial.map.dispose();
            this.triangleMaterial.dispose();
        }
    }

    get collider() {
        return [this.mesh];
    }

    color(type) {
        switch (type) {
            case Constants.lava: return Constants.lavaColor;
            case Constants.rock: return Constants.rockColor;
            case Constants.dirt: return Constants.dirtColor;
            default: return [1,0,1]; // Magenta for error
        }
    }

    topColor(type) {
        switch (type) {
            case Constants.lava: return Constants.lavaColor;
            case Constants.rock: return Constants.rockColor;
            case Constants.dirt: return Constants.grassColor;
            default: return [1,0,1]; // Magenta for error
        }
    }

    buildMaterial() {
        this.disposeMaterial();

        this.frameMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.49,0.40,0.03)});
        this.frameMaterial.side = THREE.DoubleSide;
        this.frameMaterial.shadowSide = THREE.DoubleSide;

        this.triangleMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(1,1,1)});
        this.triangleMaterial.polygonOffset = true;
        this.triangleMaterial.polygonOffsetFactor = 1;
        this.triangleMaterial.polygonOffsetUnits = 1;
        this.triangleMaterial.side = THREE.DoubleSide;
        this.triangleMaterial.shadowSide = THREE.DoubleSide;
        this.triangleMaterial.vertexColors = true;

        this.lineMaterial = new THREE.LineBasicMaterial( {color: new THREE.Color(0.9,0.9,0.9)} );
        this.lineMaterial.blending = THREE.MultiplyBlending;
        this.lineMaterial.blendSrc = THREE.OneMinusSrcColorFactor;
        this.lineMaterial.blendDst = THREE.DstColorFactor;
        this.lineMaterial.polygonOffset = true;
        this.lineMaterial.polygonOffsetFactor = -1;
        this.lineMaterial.polygonOffsetUnits = -1;

        this.image = new Image();
        this.image.onload = () => {
            if (this.triangleMaterial.map) this.triangleMaterial.map.dispose();
            this.triangleMaterial.map = new THREE.CanvasTexture(this.image);
            this.triangleMaterial.needsUpdate = true;
        }
        this.image.src = paper;

    }

    buildGeometry() {
        const render = this.service("ThreeRenderManager");
        const surfaces = this.modelService("Surfaces");

        if (!render) return

        if (this.mesh) render.scene.remove(this.mesh);
        if (this.lines) render.scene.remove(this.lines);
        this.disposeGeometry();

        this.tb.clear();
        this.lb.clear();
        this.buildFrame();
        surfaces.surfaces.forEach(surface => {
            this.buildFloor(surface);
            this.buildCeiling(surface);
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

    buildFrame() {
        const render = this.service("ThreeRenderManager");
        const voxels = this.modelService("Voxels");
        const h = voxels.edgeSummit();
        const t = 0.5
        const tb = new TriBuilder();
        const lb = new LineBuilder();

        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (this.frameMesh) render.scene.remove(this.frameMesh);
        if (this.frameLines) render.scene.remove(this.frameLines);
        this.disposeFrame();

        const x = Constants.sizeX;
        const y = Constants.sizeY;

        // -- South --

        tb.addFace([
            v3_multiply([-t,0,0],s),
            v3_multiply([x+t,0,0],s),
            v3_multiply([x+t,0,h],s),
            v3_multiply([-t,0,h],s)
        ]);

        tb.addFace([
            v3_multiply([-t,-t,0],s),
            v3_multiply([x+t,-t,0],s),
            v3_multiply([x+t,-t,h],s),
            v3_multiply([-t,-t,h],s)
        ]);

        tb.addFace([
            v3_multiply([-t,-t,h],s),
            v3_multiply([x+t,-t,h],s),
            v3_multiply([x+t,0,h],s),
            v3_multiply([-t,0,h],s)
        ]);



        // -- West --

        tb.addFace([
            v3_multiply([0,-t,0],s),
            v3_multiply([0,-t,h],s),
            v3_multiply([0,y+t,h],s),
            v3_multiply([0,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([-t,-t,0],s),
            v3_multiply([-t,-t,h],s),
            v3_multiply([-t,y+t,h],s),
            v3_multiply([-t,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([-t,-t,h],s),
            v3_multiply([0,-t,h],s),
            v3_multiply([0,y+t,h],s),
            v3_multiply([-t,y+t,h],s)
        ]);

            // -- East --

            tb.addFace([
                v3_multiply([x,-t,0],s),
                v3_multiply([x,-t,h],s),
                v3_multiply([x,y+t,h],s),
                v3_multiply([x,y+t,0],s)
            ]);

            tb.addFace([
                v3_multiply([x+t,-t,0],s),
                v3_multiply([x+t,-t,h],s),
                v3_multiply([x+t,y+t,h],s),
                v3_multiply([x+t,y+t,0],s)
            ]);

            tb.addFace([
                v3_multiply([x+t,-t,h],s),
                v3_multiply([x,-t,h],s),
                v3_multiply([x,y+t,h],s),
                v3_multiply([x+t,y+t,h],s)
            ]);


        // -- North --

        tb.addFace([
            v3_multiply([-t,y,0],s),
            v3_multiply([x+t,y,0],s),
            v3_multiply([x+t,y,h],s),
            v3_multiply([-t,y,h],s)
        ]);

        tb.addFace([
            v3_multiply([-t,y+t,0],s),
            v3_multiply([x+t,y+t,0],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([-t,y+t,h],s)
        ]);

        tb.addFace([
            v3_multiply([-t,y,h],s),
            v3_multiply([x+t,y,h],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([-t,y+t,h],s)
        ]);

        // -- Lines --

        lb.addLoop([
            v3_multiply([0,0,h],s),
            v3_multiply([x,0,h],s),
            v3_multiply([x,y,h],s),
            v3_multiply([0,y,h],s)
        ])

        lb.addLoop([
            v3_multiply([-t,-t,h],s),
            v3_multiply([x+t,-t,h],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([-t,y+t,h],s)
        ])

        this.frameGeometry = tb.build();
        this.frameLinesGeometry = lb.build();

        this.frameMesh = new THREE.Mesh( this.frameGeometry, this.frameMaterial );
        this.frameLines = new THREE.LineSegments(this.frameLinesGeometry, this.lineMaterial);
        this.frameMesh.receiveShadow = true;

        render.scene.add(this.frameMesh);
        render.scene.add( this.frameLines);
    }

    buildFloor(surface) {
        if (!surface.floor) return;
        const xyz = surface.xyz;
        const color = this.topColor(surface.floor);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
        vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
        vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
        vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildCeiling(surface) {
        if (!surface.ceiling) return;
        const xyz = surface.xyz;
        const color = this.color(surface.ceiling);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
        vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
        vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
        vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildRamps(surface) {
        const xyz = surface.xyz;
        const color = this.topColor(surface.below);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.ramps[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
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
            vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,b,a]),s));
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
            vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
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
            vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
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
        const color = this.topColor(surface.below);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.doubles[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s)); // xxx
            vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[0,b,b]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };
    }

    buildCaps(surface) {
        const xyz = surface.xyz;
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.caps[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.caps[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.caps[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.caps[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.caps[3]));
            this.lb.addLoop(vertices);
        }

    }

    buildSides(surface) {
        const xyz = surface.xyz;
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.sides[0]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[0] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.sides[0] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, this.color(surface.faces[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.sides[1]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[1] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.sides[1] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, this.color(surface.faces[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.sides[2]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[2] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.sides[2] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, this.color(surface.faces[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.sides[3]) {
            const vertices = [];
            const uvs = [];
            if (surface.sides[3] === 1 ) {
                vertices.push(v3_multiply(v3_add(xyz,[0,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.sides[3] === 2 ) {
                vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
                vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
                vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, this.color(surface.faces[3]));
            this.lb.addLoop(vertices);
        }


    }

    buildShims(surface) {
        const xyz = surface.xyz;
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.shims[0]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[a,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.shims[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[1]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[b,a,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.shims[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[2]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[b,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,b,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,a,a]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.shims[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[3]) {
            const vertices = [];
            const uvs = [];

            vertices.push(v3_multiply(v3_add(xyz,[a,b,b]),s));
            vertices.push(v3_multiply(v3_add(xyz,[a,a,a]),s));
            vertices.push(v3_multiply(v3_add(xyz,[b,b,a]),s));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, this.topColor(surface.shims[3]));
            this.lb.addLoop(vertices);
        }



    }




}