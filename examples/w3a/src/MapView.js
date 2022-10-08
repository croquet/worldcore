import { viewRoot, WorldcoreView, Constants, THREE, v3_add, v3_multiply, ThreeRenderManager } from "@croquet/worldcore";

import { GeometryBuilder, MeshBuilder } from "./Tools";
import paper from ".././assets/paper.jpg";
import { unpackKey } from "./Voxels";

export class MapView extends WorldcoreView {
    constructor() {
        super(viewRoot.model)

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        this.material.polygonOffset = true;
        this.material.polygonOffsetFactor = 1;
        this.material.polygonOffsetUnits = 1;

        this.lineMaterial = new THREE.LineBasicMaterial( {
            color: 0xffff00,
            linewidth: 1,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
        } );

        this.lineMaterial.polygonOffset = true;
        this.lineMaterial.polygonOffsetFactor = -1;
        this.lineMaterial.polygonOffsetUnits = -1;

        this.material.shadowSide = THREE.FrontSide;
        this.material.shadowSide = THREE.DoubleSide;
        this.material.vertexColors = true;


        this.image = new Image();
        this.image.onload = () => {
            if (this.material.map) this.material.map.dispose();
            this.material.map = new THREE.CanvasTexture(this.image);
            this.material.needsUpdate = true;
        }

        this.image.src = paper;

        this.build();
    }

    build() {
        const gb  = new GeometryBuilder();
        const render = this.service("ThreeRenderManager");
        const surfaces = this.modelService("Surfaces");
        for (const key of surfaces.surfaces.keys()) {
            const xyz = unpackKey(key);
            const surface = surfaces.get(key);
            if (surface.faces[4]) this.buildFloor(gb,xyz,[0.5,0.5,0.5]);
            if (surface.faces[3]) this.buildNorth(gb,xyz,[0.7,0.7,0]);
            if (surface.faces[2]) this.buildEast(gb,xyz,[0.7,0.7,0]);
            if (surface.faces[0]) this.buildWest(gb,xyz,[0.7,0.7,0]);
        };

        const geo = gb.build();
        const mesh = new THREE.Mesh( geo, this.material );
        const lines  = new THREE.LineSegments(geo, this.lineMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        render.scene.add(mesh);
        render.scene.add(lines);

    }

    buildFloor(mb,xyz,color) {
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
        mb.addFace(vertices, uvs, color);
    }

    buildNorth(mb,xyz,color) {
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
        mb.addFace(vertices, uvs, color);
    }

    buildWest(mb,xyz,color) {
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
        mb.addFace(vertices, uvs, color);
    }

    buildEast(mb,xyz,color) {
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
        mb.addFace(vertices, uvs, color);
    }

    destroy() {
        super.destroy();
    }


}