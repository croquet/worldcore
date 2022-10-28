

import { ViewService, Constants, THREE, m4_THREE, toRad} from "@croquet/worldcore";
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { setGeometryColor } from "./Tools";

class InstancedMesh {
    constructor(geometry, material, count=10){
        this.mesh = new THREE.InstancedMesh( geometry, material, count );
        this.pawns = [];
        this.free = [];
        for (let n = count-1; n>= 0; n--) {
            this.free.push(n);
        }
    }

    use(pawn) {
        const index = this.free.pop();
        this.pawns[index] = pawn;
        return index;
    }

    release(index) {
        this.pawns[index] = null;
        this.updateMatrix(index, null);
        this.free.push(index);
    }

    updateMatrix(index, m) {
        this.mesh.setMatrixAt(index, m4_THREE(m));
        this.mesh.instanceMatrix.needsUpdate = true;
    }

}

export class InstanceManager extends ViewService {
    constructor() {
        super("InstanceManager");
        console.log("InstanceManager");
        this.instances = new Map();

        this.buildAll();

        // console.log(this.instances.get("yellow"));
    }

    destroy() {
        super.destroy();
    }

    get(name) {
        return this.instances.get(name);
    }

    build(name, geometry, material, count=10) {
        const render = this.service("ThreeRenderManager");
        if(this.instances.has(name)) {console.warn("Instanced Mesh " + name + "already exists"); return;}
        const instance = new InstancedMesh(geometry, material, count);
        this.instances.set(name, instance);
        render.scene.add(instance.mesh);
        return instance.mesh;
    }

    buildAll() {

        const trunk = new THREE.CylinderGeometry( 0.5,0.5, 10, 7);
        setGeometryColor(trunk, [0.7, 0.5, 0.3]);
        const top = new THREE.ConeGeometry( 2,15, 8);
        setGeometryColor(top, [0.4, 0.8, 0.4]);
        top.translate(0,10,0);

        let  geometry;
        geometry = mergeBufferGeometries([trunk, top]);
        // geometry = trunk;
        geometry.rotateX(toRad(90));
        geometry.translate(0,0,5-1); // Extend below surface.

        const material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );

        material.side = THREE.DoubleSide;
        material.shadowSide = THREE.DoubleSide;
        material.vertexColors = true;

        const m = this.build("yellow", geometry, material, 100);
        m.receiveShadow = true;
        m.castShadow = true;
    }

}