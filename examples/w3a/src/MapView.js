import { viewRoot, WorldcoreView, Constants, THREE, v3_add, v3_multiply } from "@croquet/worldcore";

import { MeshBuilder } from "./Tools";
import paper from ".././assets/paper.jpg";
import { unpackKey } from "./Voxels";

export class MapView extends WorldcoreView {
    constructor() {
        super(viewRoot.model)

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        this.material.shadowSide = THREE.FrontSide;
        // this.material.shadowSide = THREE.DoubleSide;
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
        const mb  = new MeshBuilder();
        const render = this.service("ThreeRenderManager");
        const surfaces = this.modelService("Surfaces");
        for (const key of surfaces.surfaces.keys()) {
            const xyz = unpackKey(key);
            const s = [Constants.scaleX, Constants.scaleY, Constants.scaleZ];

            console.log(s);
            const surface = surfaces.get(key);
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
            mb.addFace(vertices, uvs, [1,0,1]);
        };

        const mesh =  mb.build(this.material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        render.scene.add(mesh);

    }

    destroy() {
        super.destroy();
    }


}