import { ViewService, m4_multiply } from "@croquet/worldcore-kernel";
import * as THREE from "three";

function m4_THREE(m) { return m?(new THREE.Matrix4()).fromArray(m):new THREE.Matrix4() }

//------------------------------------------------------------------------------------------
//-- InstancedMesh --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class InstancedMesh {
    constructor(geometry, material, count = 1000) {
        this.mesh = new THREE.InstancedMesh( geometry, material, count);
        this.mesh.instance = this;
        this.pawns = [];
        this.free = [];
        for (let n = count-1; n>= 0; n--) {
            this.free.push(n);
        }
        this.limbo = [0,0,0];
    }

    use(pawn) {
        let index = this.free.pop();
        if (index === undefined) console.error("InstancedMesh exceeded max instance count!");
        this.pawns[index] = pawn;
        return index;
    }

    release(index) {
        const limbo = new THREE.Matrix4();
        limbo.makeTranslation(...this.limbo);
        this.pawns[index] = null;
        this.updateMatrix(index, limbo);
        this.free.push(index);
    }

    updateMatrix(index, m) {
        this.mesh.setMatrixAt(index, m4_THREE(m));
        this.mesh.instanceMatrix.needsUpdate = true;
    }

}

//------------------------------------------------------------------------------------------
//-- PM_ThreeInstanced ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeInstanced = superclass => class extends superclass {

    destroy() {
        super.destroy();
        if (this.instance) this.releaseInstance();
    }

    useInstance(name) {
        const im = this.service("ThreeInstanceManager");
        this.instance = im.mesh(name);
        if (this.instance) {
            this.renderObject = this.instance.mesh;
            this.meshIndex = this.instance.use(this);
            this.updateMatrix();
        }
        return this.instance;
    }

    releaseInstance() {
        if (this.instance) this.instance.release(this.meshIndex);
        this.instance = undefined;
        this.meshIndex = undefined;
    }

    refreshDrawTransform() {
        super.refreshDrawTransform();
        this.updateMatrix();
    }

    updateMatrix() {
        if (this.meshIndex === undefined) return;
        let matrix = this.global;
        // if (this.localTransform) matrix = m4_multiply(this.localTransform, this.global);
        this.instance.updateMatrix(this.meshIndex, matrix);
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeInstanceManager ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ThreeInstanceManager extends ViewService {
    constructor() {
        super("ThreeInstanceManager");
        this.meshes = new Map();
        this.materials = new Map();
        this.geometries = new Map();
        this.limbo = [0,0,0];
    }

    destroy() {
        super.destroy();
        this.materials.forEach( m => m.dispose());
        this.geometries.forEach( g => g.dispose());
    }

    material(name) {
        if (!this.materials.has(name)) {
            // console.error("No material named " + name);
            return null;
        }
        return this.materials.get(name);
    }

    geometry(name) {
        if (!this.geometries.has(name)) {
            // console.error("No geometry named " + name);
            return null;
        }
        return this.geometries.get(name);
    }

    mesh(name) {
        if (!this.meshes.has(name)) {
            // console.error("No mesh named " + name);
            return null;
        }
        return this.meshes.get(name);
    }

    addMaterial(name, material) {
        if (this.materials.has(name)) {
            console.error("duplicate material: " + name);
            return;
        }
        this.materials.set(name,material);
    }

    addGeometry(name, geometry) {
        if (this.geometries.has(name)) {
            console.error("duplicate geometry: " + name);
            return;
        }
        this.geometries.set(name,geometry);
    }

    addMesh(meshName, geometryName, materialName, count=1000) {
        const rm = this.service("ThreeRenderManager");
        if (this.meshes.has(meshName)) {
            console.error("duplicate mesh: " + meshName);
            return this.mesh(meshName);
        }
        const mesh = new InstancedMesh(this.geometry(geometryName), this.material(materialName), count);
        mesh.limbo = this.limbo;
        this.meshes.set(meshName, mesh);
        rm.scene.add(mesh.mesh);
        return mesh.mesh;
    }

}
