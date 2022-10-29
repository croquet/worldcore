import { viewRoot, WorldcoreView, Constants, THREE, v3_add, v3_multiply, ThreeRenderManager } from "@croquet/worldcore";

import { LineBuilder, TriangleBuilder, TriBuilder } from "./Tools";
import paper from ".././assets/paper.jpg";
import { toWorld } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- Globals -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const frameMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.49,0.40,0.03)});
frameMaterial.side = THREE.DoubleSide;

const triangleMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(1,1,1)});
triangleMaterial.polygonOffset = true;
triangleMaterial.polygonOffsetFactor = 1;
triangleMaterial.polygonOffsetUnits = 1;
triangleMaterial.side = THREE.DoubleSide;
triangleMaterial.shadowSide = THREE.DoubleSide;
triangleMaterial.vertexColors = true;

const ghostMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.8,0.8,0)});
ghostMaterial.polygonOffset = true;
ghostMaterial.polygonOffsetFactor = 1;
ghostMaterial.polygonOffsetUnits = 1;
ghostMaterial.side = THREE.FrontSide;
ghostMaterial.shadowSide = THREE.FrontSide;
// ghostMaterial.vertexColors = true;
ghostMaterial.transparent = true;
ghostMaterial.opacity = 0.3;

const texture = new Image();
texture.onload = () => {
    if (triangleMaterial.map) this.triangleMaterial.map.dispose();
    if (ghostMaterial.map) this.triangleMaterial.map.dispose();
    ghostMaterial.map = new THREE.CanvasTexture(texture);
    ghostMaterial.needsUpdate = true;
}
texture.src = paper;

const lineMaterial = new THREE.LineBasicMaterial( {color: new THREE.Color(0.3,0.3,0.3)} );
lineMaterial.opacity = 0.1;
lineMaterial.transparent = true;
lineMaterial.polygonOffset = true;
lineMaterial.polygonOffsetFactor = -1;
lineMaterial.polygonOffsetUnits = -1;

//------------------------------------------------------------------------------------------
//-- Helper Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const e = 0.00001; // Offset to prevent floor error at voxel edges
const a = e;
const b = 1-e;

Constants.color = {};
Constants.color.lava = [1.0, 0.0, 0.0];
Constants.color.rock = [0.7, 0.7, 0.7];
Constants.color.dirt = [0.8, 0.4, 0.2];
Constants.color.grass = [0.4, 0.8, 0.2];

export function sideColor(type) {
    switch (type) {
        case Constants.voxel.lava: return Constants.color.lava;
        case Constants.voxel.rock: return Constants.color.rock;
        case Constants.voxel.dirt: return Constants.color.dirt;
        default: return [1,0,1]; // Magenta for error
    }
}

function topColor(type) {
    switch (type) {
        case Constants.voxel.lava: return Constants.color.lava;
        case Constants.voxel.rock: return Constants.color.rock;
        case Constants.voxel.dirt: return Constants.color.grass;
        default: return [1,0,1]; // Magenta for error
    }
}

//------------------------------------------------------------------------------------------
//-- MapLayer ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MapLayer extends WorldcoreView {
    constructor(z) {
        super(viewRoot.model)
        this.z = z;
        this.keys = new Set();

        this.tb = new TriangleBuilder();
        this.lb = new LineBuilder();
    }

    destroy() {
        super.destroy();
        this.disposeMesh();
    }

    clear() {
        this.keys = new Set();
        this.disposeMesh();
    }

    addKey(key) {
        this.keys.add(key);
        this.dirty = true;
    }

    removeKey(key) {
        this.keys.delete(key);
        this.dirty = true;
    }

    rebuild() {
        if (!this.dirty) return;
        this.build();
        this.dirty = false;
    }

    disposeMesh(){
        const render = this.service("ThreeRenderManager");
        if (!render) return;

        if (this.mesh) render.scene.remove(this.mesh);
        if (this.lines) render.scene.remove(this.lines);
        this.mesh = null;
        this.lines = null;

        if (this.triangleGeometry) this.triangleGeometry.dispose();
        if (this.lineGeometry) this.lineGeometry.dispose();
        this.triangleGeometry = null;
        this.lineGeometry = null;
    }

    build() {
        const surfaces = this.modelService("Surfaces");
        const render = this.service("ThreeRenderManager");

        if (!render) return

        this.disposeMesh();

        if (!this.keys.size) return;

        this.tb.clear();
        this.lb.clear();

        this.keys.forEach(key=>{
            const surface = surfaces.get(key)
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


        if (this.z == 50) {
            this.mesh = new THREE.Mesh( this.triangleGeometry, ghostMaterial );
            render.scene.add(this.mesh);
        } else {
            this.mesh = new THREE.Mesh( this.triangleGeometry, triangleMaterial );
            this.mesh.receiveShadow = true;
            this.mesh.castShadow = true;
            this.lines  = new THREE.LineSegments(this.lineGeometry, lineMaterial);

            render.scene.add(this.mesh);
            render.scene.add(this.lines);
        }


            // this.mesh = new THREE.Mesh( this.triangleGeometry, triangleMaterial );
            // this.mesh.receiveShadow = true;
            // this.mesh.castShadow = true;
            // this.lines  = new THREE.LineSegments(this.lineGeometry, lineMaterial);

            // render.scene.add(this.mesh);
            // render.scene.add(this.lines);


    }

    buildFloor(surface) {
        if (!surface.floor) return;
        const xyz = surface.xyz;
        const color = topColor(surface.floor);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(toWorld(v3_add(xyz,[a,a,a])));
        vertices.push(toWorld(v3_add(xyz,[b,a,a])));
        vertices.push(toWorld(v3_add(xyz,[b,b,a])));
        vertices.push(toWorld(v3_add(xyz,[a,b,a])));
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
        const color = sideColor(surface.ceiling);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];
        const vertices = [];
        const uvs = [];
        vertices.push(toWorld(v3_add(xyz,[a,a,b])));
        vertices.push(toWorld(v3_add(xyz,[a,b,b])));
        vertices.push(toWorld(v3_add(xyz,[b,b,b])));
        vertices.push(toWorld(v3_add(xyz,[b,a,b])));
        uvs.push([0,0]);
        uvs.push([1,0]);
        uvs.push([1,1]);
        uvs.push([0,1]);
        this.tb.addFace(vertices, uvs, color);
        this.lb.addLoop(vertices);
    }

    buildRamps(surface) {
        const xyz = surface.xyz;
        const color = topColor(surface.below);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.ramps[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[a,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,b,b])));
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
            vertices.push(toWorld(v3_add(xyz,[a,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[0,b,a])));
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
            vertices.push(toWorld(v3_add(xyz,[b,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
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
            vertices.push(toWorld(v3_add(xyz,[b,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
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
        const color = topColor(surface.below);
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.doubles[0]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,b,b])));
            vertices.push(toWorld(v3_add(xyz,[b,a,b])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,b,b])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,a,b])));
            vertices.push(toWorld(v3_add(xyz,[0,b,b])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, color);
            this.lb.addLoop(vertices);
        };

        if (surface.doubles[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,a,b])));
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
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.caps[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[1]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.caps[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[2]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.caps[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.caps[3]) {
            const vertices = [];
            const uvs = [];
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.caps[3]));
            this.lb.addLoop(vertices);
        }

    }

    buildSides(surface) {
        const xyz = surface.xyz;
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.shapes[0]) {
            const vertices = [];
            const uvs = [];
            if (surface.shapes[0] === 1 ) {
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,a])));
                vertices.push(toWorld(v3_add(xyz,[a,a,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.shapes[0] === 2 ) {
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,b])));
                vertices.push(toWorld(v3_add(xyz,[a,a,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, sideColor(surface.sides[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.shapes[1]) {
            const vertices = [];
            const uvs = [];
            if (surface.shapes[1] === 1 ) {
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.shapes[1] === 2 ) {
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,a,b])));
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,a,a])));
                vertices.push(toWorld(v3_add(xyz,[a,a,b])));
                vertices.push(toWorld(v3_add(xyz,[b,a,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, sideColor(surface.sides[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.shapes[2]) {
            const vertices = [];
            const uvs = [];
            if (surface.shapes[2] === 1 ) {
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.shapes[2] === 2 ) {
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,a])));
                vertices.push(toWorld(v3_add(xyz,[b,a,b])));
                vertices.push(toWorld(v3_add(xyz,[b,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, sideColor(surface.sides[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.shapes[3]) {
            const vertices = [];
            const uvs = [];
            if (surface.shapes[3] === 1 ) {
                vertices.push(toWorld(v3_add(xyz,[0,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[a,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else if (surface.shapes[3] === 2 ) {
                vertices.push(toWorld(v3_add(xyz,[a,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([0,1]);
            } else {
                vertices.push(toWorld(v3_add(xyz,[a,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,a])));
                vertices.push(toWorld(v3_add(xyz,[b,b,b])));
                vertices.push(toWorld(v3_add(xyz,[a,b,b])));
                uvs.push([0,0]);
                uvs.push([1,0]);
                uvs.push([1,1]);
                uvs.push([0,1]);
            }
            this.tb.addFace(vertices, uvs, sideColor(surface.sides[3]));
            this.lb.addLoop(vertices);
        }

    }

    buildShims(surface) {
        const xyz = surface.xyz;
        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (surface.shims[0]) {
            const vertices = [];
            const uvs = [];

            vertices.push(toWorld(v3_add(xyz,[a,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.shims[0]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[1]) {
            const vertices = [];
            const uvs = [];

            vertices.push(toWorld(v3_add(xyz,[b,a,b])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.shims[1]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[2]) {
            const vertices = [];
            const uvs = [];

            vertices.push(toWorld(v3_add(xyz,[b,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,b,a])));
            vertices.push(toWorld(v3_add(xyz,[b,a,a])));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.shims[2]));
            this.lb.addLoop(vertices);
        }

        if (surface.shims[3]) {
            const vertices = [];
            const uvs = [];

            vertices.push(toWorld(v3_add(xyz,[a,b,b])));
            vertices.push(toWorld(v3_add(xyz,[a,a,a])));
            vertices.push(toWorld(v3_add(xyz,[b,b,a])));

            uvs.push([0,0]);
            uvs.push([1,0]);
            uvs.push([0,1]);
            this.tb.addFace(vertices, uvs, topColor(surface.shims[3]));
            this.lb.addLoop(vertices);
        }

    }

}

//------------------------------------------------------------------------------------------
//-- MapView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MapView extends WorldcoreView {
    constructor() {
        super(viewRoot.model)
        this.layers = [Constants.sizeZ];
        for (let z = 0; z < Constants.sizeZ; z++) {
            this.layers[z] = new MapLayer(z);
        }

        this.buildAll();

        this.subscribe("surfaces", "rebuildAll", this.buildAll);
        this.subscribe("surfaces", "rebuildSome", this.buildSome);
    }

    destroy() {
        super.destroy()
        this.layers.forEach(layer => layer.destroy());
    }

    clear() {
        this.layers.forEach(layer => layer.clear());
    }

    get collider() {
        const out = []
        this.layers.forEach(layer => {
            if (layer.mesh) out.push(layer.mesh);
        });
        return out;
    }

    layerZ(key) { return key & 0x3FF }

    buildSome(data) {
        const add = data.add;
        const remove = data.remove;
        add.forEach(key => {
            this.layers[this.layerZ(key)].addKey(key);
        });

        remove.forEach(key => {
            this.layers[this.layerZ(key)].removeKey(key);
        });

        this.layers.forEach(layer => layer.rebuild());
    }

    buildAll() {
        // console.log("Building map view ... ");
        const surfaces = this.modelService("Surfaces");
        this.clear();
        surfaces.surfaces.forEach((surface, key) => {
            this.layers[this.layerZ(key)].addKey(key)
        });
        this.layers.forEach(layer => layer.build());
        this.buildFrame();
        // console.log("Building map view done");
    }

    buildFrame() {
        const render = this.service("ThreeRenderManager");
        if (!render) return;
        const voxels = this.modelService("Voxels");
        // const h = voxels.edgeSummit();
        const h = 2;
        const t = 0.5
        const tb = new TriBuilder();
        const lb = new LineBuilder();

        const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

        if (this.frameMesh) render.scene.remove(this.frameMesh);
        if (this.frameLines) render.scene.remove(this.frameLines);

        const x = Constants.sizeX-1;
        const y = Constants.sizeY-1;

        // -- South --

        tb.addFace([
            v3_multiply([1-t,1,0],s),
            v3_multiply([x+t,1,0],s),
            v3_multiply([x+t,1,h],s),
            v3_multiply([1-t,1,h],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,1-t,0],s),
            v3_multiply([x+t,1-t,0],s),
            v3_multiply([x+t,1-t,h],s),
            v3_multiply([1-t,1-t,h],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,1-t,h],s),
            v3_multiply([x+t,1-t,h],s),
            v3_multiply([x+t,1,h],s),
            v3_multiply([1-t,1,h],s)
        ]);

        // -- West --

        tb.addFace([
            v3_multiply([1,1-t,0],s),
            v3_multiply([1,1-t,h],s),
            v3_multiply([1,y+t,h],s),
            v3_multiply([1,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,1-t,0],s),
            v3_multiply([1-t,1-t,h],s),
            v3_multiply([1-t,y+t,h],s),
            v3_multiply([1-t,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,1-t,h],s),
            v3_multiply([1,1-t,h],s),
            v3_multiply([1,y+t,h],s),
            v3_multiply([1-t,y+t,h],s)
        ]);

        // -- East --

        tb.addFace([
            v3_multiply([x,1-t,0],s),
            v3_multiply([x,1-t,h],s),
            v3_multiply([x,y+t,h],s),
            v3_multiply([x,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([x+t,1-t,0],s),
            v3_multiply([x+t,1-t,h],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([x+t,y+t,0],s)
        ]);

        tb.addFace([
            v3_multiply([x+t,1-t,h],s),
            v3_multiply([x,1-t,h],s),
            v3_multiply([x,y+t,h],s),
            v3_multiply([x+t,y+t,h],s)
        ]);


        // -- North --

        tb.addFace([
            v3_multiply([1-t,y,0],s),
            v3_multiply([x+t,y,0],s),
            v3_multiply([x+t,y,h],s),
            v3_multiply([1-t,y,h],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,y+t,0],s),
            v3_multiply([x+t,y+t,0],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([1-t,y+t,h],s)
        ]);

        tb.addFace([
            v3_multiply([1-t,y,h],s),
            v3_multiply([x+t,y,h],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([1-t,y+t,h],s)
        ]);

        // -- Lines --

        lb.addLoop([
            v3_multiply([1,1,h],s),
            v3_multiply([x,1,h],s),
            v3_multiply([x,y,h],s),
            v3_multiply([1,y,h],s)
        ])

        lb.addLoop([
            v3_multiply([1-t,1-t,h],s),
            v3_multiply([x+t,1-t,h],s),
            v3_multiply([x+t,y+t,h],s),
            v3_multiply([1-t,y+t,h],s)
        ])

        this.frameGeometry = tb.build();
        this.frameLinesGeometry = lb.build();

        this.frameMesh = new THREE.Mesh( this.frameGeometry, frameMaterial );
        this.frameLines = new THREE.LineSegments(this.frameLinesGeometry, lineMaterial);
        // this.frameMesh.receiveShadow = true;

        render.scene.add(this.frameMesh);
        render.scene.add( this.frameLines);
    }
}

