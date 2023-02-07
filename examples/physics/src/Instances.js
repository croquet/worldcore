import { ViewService, Constants, THREE, m4_THREE, toRad, ModelRoot, viewRoot} from "@croquet/worldcore";

function setGeometryColor(geometry, color) {

    const count = geometry.getAttribute("position").count;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
}

//------------------------------------------------------------------------------------------
//-- Materials -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const instanceMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
instanceMaterial.side = THREE.FrontSide;
instanceMaterial.shadowSide = THREE.BackSide;
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
//-- PM_InstancedMesh ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeVisibleInstanced = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("viewGlobalChanged", this.updateMatrix);
    }

    destroy() {
        super.destroy();
        if (this.mesh) this.mesh.release(this.meshIndex);
    }

    useInstance(name) {
        const im = this.service("InstanceManager");
        this.mesh = im.get(name);
        if (!this.mesh) {
            console.warn("no mesh named " + name)
            return;
        }
        this.meshIndex = this.mesh.use(this);
        this.updateMatrix()
    }

    updateMatrix() {
        if (this.meshIndex === undefined) return;
        this.mesh.updateMatrix(this.meshIndex, this.global)
    }

};

//------------------------------------------------------------------------------------------
//-- InstanceManager --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class InstanceManager extends ViewService {
    constructor() {
        super("InstanceManager");
        console.log("InstanceManager!");
        this.instances = new Map();
        this.buildAll();
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
        this.buildCubes();
        this.buildCylinders();
        this.buildBalls();
        this.buildCones();
    }

    buildCubes() {
        for( let n = 0; n <viewRoot.model.colors.length; n++) {
            const color = viewRoot.model.colors[n];
            const geo = new THREE.BoxGeometry( 1, 1, 1 );
            setGeometryColor(geo, color);
            const mesh = this.build("cube" + n, geo, instanceMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildCylinders() {
        for( let n = 0; n <viewRoot.model.colors.length; n++) {
            const color = viewRoot.model.colors[n];
            const geo = new THREE.CylinderGeometry( 0.5, 0.5, 1, 10 );
            setGeometryColor(geo, color);
            const mesh = this.build("cylinder" + n, geo, instanceMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildCubes() {
        for( let n = 0; n <viewRoot.model.colors.length; n++) {
            const color = viewRoot.model.colors[n];
            const geo = new THREE.BoxGeometry( 1, 1, 1 );
            setGeometryColor(geo, color);
            const mesh = this.build("cube" + n, geo, instanceMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildBalls() {
        for( let n = 0; n <viewRoot.model.colors.length; n++) {
            const color = viewRoot.model.colors[n];
            const geo = new THREE.SphereGeometry( 0.5, 10, 10);
            setGeometryColor(geo, color);
            const mesh = this.build("ball" + n, geo, instanceMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    buildCones() {
        for( let n = 0; n <viewRoot.model.colors.length; n++) {
            const color = viewRoot.model.colors[n];
            const geo = new THREE.ConeGeometry( 0.5, 1, 10, 1);
            setGeometryColor(geo, color);
            const mesh = this.build("cone" + n, geo, instanceMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    
}