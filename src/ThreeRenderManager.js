import { NamedView, GetNamedView } from "./NamedView";


//------------------------------------------------------------------------------------------
//-- ThreeVisible Mixin -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This is the interface for a pawn to manage its Three.js render model.

export const PM_ThreeVisible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        // don't need the render object because we may not even be directly in a scene 
        // and we know who our parent is.
        //const render = GetNamedView("ThreeRenderManager");
        // Put code here to destroy the model in the render manager.
        if(this.pawn3D)this.pawn3D.parent.remove(this.pawn3D);
    }

    refresh() {
        super.refresh();
        //const render = GetNamedView("ThreeRenderManager");
        // Put code here to update the 4x4 transform of the model in the render manager.
        // this.global is a 4x4 matrix
        // console.log("PM_ThreeVisible.refresh()", this.global)
        if(this.pawn3D){
            this.pawn3D.matrix.fromArray(this.global); 
            this.pawn3D.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(object3D) {
        //console.log("PM_ThreeVisible.setRenderObject", object3D)
        const render = GetNamedView("ThreeRenderManager");
        if(this.pawn3D){
            this.pawn3D.parent.remove(this.pawn3D);
            disposeObjectTree(this.pawn3D);
        }
        // Put code here to instantiate the model in the three render manager.
        // You probably also want to the set the transform to this.global
        this.pawn3D = object3D;
        this.pawn3D.matrixAutoUpdate = false;
        this.pawn3D.matrix.fromArray(this.global); 
        this.pawn3D.matrixWorldNeedsUpdate = true;
        render.scene.add(this.pawn3D);
    }

};

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);

        if (this.isMyPlayerPawn) {
             const render = GetNamedView("ThreeRenderManager");
            // Put code here to initialize the camera transform to this.global
            render.camera.matrix.fromArray(this.global);
            render.camera.matrixAutoUpdate = false;
            render.camera.matrix.fromArray(this.global); 
            render.camera.matrixWorldNeedsUpdate = true;
            //render.camera.rotation.y = Math.PI;
        }
    }

    refresh() {
        super.refresh();
        if (!this.isMyPlayerPawn) return;
        // console.log("PM_ThreeCamera.refresh()", this.global)
        const render = GetNamedView("ThreeRenderManager");
        // Put code to update the camera transform in the render manager when this.global changes.
        render.camera.matrix.fromArray(this.global);
        render.camera.matrixWorldNeedsUpdate = true;
        // console.log(render.camera.matrix)
    }

    setCameraOffset(m) {
        this.offset = m;
        this.needRefresh = true;
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManager extends NamedView {
    constructor() {
        super("ThreeRenderManager");
        // Put code here to initialize the three.js renderer.
        this.scene = new THREE.Scene();
       // this.scene.add(new THREE.AmbientLight(0x444444));
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        const threeCanvas = document.getElementById("three");
        this.renderer = new THREE.WebGLRenderer({ canvas: threeCanvas });
        this.renderer.setClearColor(0x4444aa);
        this.renderer.shadowMap.enabled = true;
    }

    destroy() {
        // Put code here to shut down the three.js renderer
        disposeObjectTree(this.scene);
        this.scene = null;
        this.camera = null;
        //this.renderer.parentNode.removeChild(this.renderer);
        this.renderer = null;
    }

    update() {
        // This gets called every frame. This is where you draw the whole scene.
        this.renderer.render(this.scene, this.camera); 
    }

    setShadow(bool){
        this.renderer.shadowMap.enabled = bool;
    }

}

export function isRenderItem(obj){
    return 'geometry' in obj && 'material' in obj;
}

export function disposeMaterial(obj) {
    if (!isRenderItem(obj)) return;

    // because obj.material can be a material or array of materials
    const materials = [].concat(obj.material)

    for (const material of materials) {
        material.dispose()
    }
}

export function disposeObject(obj, removeFromParent = true, destroyGeometry = true, destroyMaterial = true) {
    if (!obj) return

    if (isRenderItem(obj)) {
        if (obj.geometry && destroyGeometry) obj.geometry.dispose()
        if (destroyMaterial) disposeMaterial(obj)
    }

    removeFromParent &&
        Promise.resolve().then(() => {
            // if we remove children in the same tick then we can't continue traversing,
            // so we defer to the next microtask
            obj.parent && obj.parent.remove(obj)
        })
}

var DisposeOptions = {
    removeFromParent: true,
    destroyGeometry: true,
    destroyMaterial: true,
}

export function disposeObjectTree(obj, disposeOptions = DisposeOptions) {
    obj.traverse(node => {
        disposeObject(
            node,
            disposeOptions.removeFromParent,
            disposeOptions.destroyGeometry,
            disposeOptions.destroyMaterial
        )
    })
}