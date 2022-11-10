

import { ViewService, Constants, THREE, m4_THREE, toRad} from "@croquet/worldcore";
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { setGeometryColor } from "./Tools";

//------------------------------------------------------------------------------------------
//-- Materials -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const instanceMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
instanceMaterial.side = THREE.DoubleSide;
instanceMaterial.shadowSide = THREE.DoubleSide;
instanceMaterial.vertexColors = true;

//------------------------------------------------------------------------------------------
//-- InstancedMesh --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------------------
//-- InstanceManager --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class InstanceManager extends ViewService {
    constructor() {
        super("InstanceManager");
        console.log("InstanceManager");
        this.instances = new Map();

        this.buildAll();
    }

    destroy() {
        super.destroy();
    }

    get(name) {
        return this.instances.get(name);
    }

    build(name, geometry, material, count=1000) {
        const render = this.service("ThreeRenderManager");
        if(this.instances.has(name)) {console.warn("Instanced Mesh " + name + "already exists"); return;}
        const instance = new InstancedMesh(geometry, material, count);
        this.instances.set(name, instance);
        render.scene.add(instance.mesh);
        return instance.mesh;
    }

    buildAll() {
        this.buildRubble();
        this.buildBase();
        this.buildTree()
        this.buildLog()
        this.buildSheep()
        this.buildPerson()
    }

    buildRubble() {
        const dirt = new THREE.BoxGeometry( 1, 1, 1 );
        setGeometryColor(dirt, Constants.color.dirt);
        const dirtMesh = this.build("dirtRubble", dirt, instanceMaterial);
        dirtMesh.receiveShadow = true;
        dirtMesh.castShadow = true;

        const rock = new THREE.BoxGeometry( 1, 1, 1 );
        setGeometryColor(rock, Constants.color.rock);
        const rockMesh = this.build("rockRubble", rock, instanceMaterial);
        rockMesh.receiveShadow = true;
        rockMesh.castShadow = true;
    }

    buildBase() {
        const base = new THREE.BoxGeometry( 5, 5, 0.5 );
        base.translate(0,0,0.25);
        const column0 = new THREE.CylinderGeometry( 0.5,0.5, 3, 7);
        const column1 = new THREE.CylinderGeometry( 0.5,0.5, 3, 7);
        const column2 = new THREE.CylinderGeometry( 0.5,0.5, 3, 7);
        const column3 = new THREE.CylinderGeometry( 0.5,0.5, 3, 7);
        column0.rotateX(toRad(90));
        column1.rotateX(toRad(90));
        column2.rotateX(toRad(90));
        column3.rotateX(toRad(90));
        column0.translate(-1.5,-1.5,-1.5);
        column1.translate(1.5,-1.5,-1.5);
        column2.translate(-1.5,1.5,-1.5);
        column3.translate(1.5,1.5,-1.5);

        const geometry = mergeBufferGeometries([base, column0, column1, column2, column3]);

        setGeometryColor(geometry, Constants.color.rock);

        const mesh = this.build("base", geometry, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
    }

    buildTree() {
        const trunk = new THREE.CylinderGeometry( 0.5,0.5, 10, 7);
        setGeometryColor(trunk, [0.7, 0.5, 0.3]);
        const top = new THREE.ConeGeometry( 2,15, 8);
        setGeometryColor(top, [0.4, 0.8, 0.4]);
        top.translate(0,10,0);

        const geometry = mergeBufferGeometries([trunk, top]);
        geometry.rotateX(toRad(90));
        geometry.translate(0,0,-1); // Extend below surface.

        const mesh = this.build("pineTree", geometry, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
    }

    buildLog() {
        const geometry = new THREE.CylinderGeometry(0.5,0.5, 3, 7);
        setGeometryColor(geometry, [0.7, 0.5, 0.3]);
        geometry.rotateX(toRad(90));

        const mesh = this.build("log", geometry, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
    }

    buildSheep() {
        // const geometry = new THREE.BoxGeometry( 0.5, 0.5, 2 );
        // setGeometryColor(geometry, [1, 1, 0]);
        // geometry.translate(0,0,1);

        const geometry = new THREE.BoxGeometry( 1, 2, 1 );
        setGeometryColor(geometry, [1, 1, 1]);
        geometry.translate(0,0,0.5);

        const mesh = this.build("sheep", geometry, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
    }

    buildPerson() {
        const geometry = new THREE.BoxGeometry( 0.5, 0.5, 2 );
        setGeometryColor(geometry, [1, 1, 0]);
        geometry.translate(0,0,1);

        // const geometry = new THREE.BoxGeometry( 1, 2, 1 );
        // setGeometryColor(geometry, [1, 1, 1]);
        // geometry.translate(0,0,0.5);

        const mesh = this.build("person", geometry, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
    }

}