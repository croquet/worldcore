import { ViewService, Constants, THREE, m4_THREE, toRad, ModelRoot, viewRoot} from "@croquet/worldcore";

function setGeometryColor(geometry, color) {

    const count = geometry.getAttribute("position").count;
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(...color);
    }
    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
}

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
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
        this.instances = new Map();
        this.seedColors();
        this.buildAll();
    }

    seedColors() {

        this.colors = [
            rgb(242, 215, 213),        // Red 0
            rgb(217, 136, 128),        // Red 1
            rgb(192, 57, 43),        // Red 2
        
            rgb(240, 178, 122),        // Orange 3
            rgb(230, 126, 34),        // Orange 4
            rgb(175, 96, 26),        // Orange 5
        
            rgb(247, 220, 111),        // Yellow 6
            rgb(241, 196, 15),        // Yellow 7
            rgb(183, 149, 11),        // Yellow 8
        
            rgb(125, 206, 160),        // Green 9
            rgb(39, 174, 96),        // Green 10
            rgb(30, 132, 73),        // Green 11
        
            rgb(133, 193, 233),         // Blue 12
            rgb(52, 152, 219),        // Blue 13
            rgb(40, 116, 166),        // Blue 14
        
            rgb(195, 155, 211),        // Purple 15
            rgb(155, 89, 182),         // Purple 16
            rgb(118, 68, 138),        // Purple 17

            [0.9, 0.9, 0.9],        // White 18
            [0.5, 0.5, 0.5],        // Gray 90
            [0.2, 0.2, 0.2]        // Black 20
        ];

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
        this.buildBalls();
        this.buildBlocks();
        this.buildBarrels();
        this.buildPillars();
    }

    buildBalls() {
        const geo = new THREE.SphereGeometry( 0.5, 10, 10);
        setGeometryColor(geo, [0.2,0.2,0.2]);
        const mesh = this.build("ball", geo, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    buildBlocks() {
        const geo111 = new THREE.BoxGeometry( 1, 1, 1 );
        setGeometryColor(geo111, [0.5,0.5,0.5]);
        const mesh111 = this.build("111", geo111, instanceMaterial);
        mesh111.receiveShadow = true;
        mesh111.castShadow = true;
        mesh111.receiveShadow = true;

        const geo121 = new THREE.BoxGeometry( 1, 2, 1 );
        setGeometryColor(geo121, this.colors[6]);
        const mesh121 = this.build("121", geo121, instanceMaterial);
        mesh121.receiveShadow = true;
        mesh121.castShadow = true;
        mesh121.receiveShadow = true;

        const geo414 = new THREE.BoxGeometry( 4, 1, 4 );
        setGeometryColor(geo414, this.colors[5]);
        const mesh414 = this.build("414", geo414, instanceMaterial);
        mesh414.receiveShadow = true;
        mesh414.castShadow = true;
        mesh414.receiveShadow = true;
    }

    buildBarrels() {
        const geo = new THREE.CylinderGeometry( 0.5, 0.5, 1, 10);
        setGeometryColor(geo, [0.9,0,0]);
        const mesh = this.build("barrel", geo, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    buildPillars() {
        const geo = new THREE.CylinderGeometry( 0.5, 0.5, 4, 10);
        setGeometryColor(geo, [0.4,0.4,0.6]);
        const mesh = this.build("pillar", geo, instanceMaterial);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    
}