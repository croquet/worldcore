
import { m4_multiply, m4_scaleRotationTranslation, m4_translation, q_axisAngle, ViewService, toRad, m4_rotation, q_identity, m4_rotationQ  } from "@croquet/worldcore-kernel";
import * as THREE from "three";
export { THREE };


//------------------------------------------------------------------------------------------
//-- ThreeVisible  -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export const PM_ThreeVisible = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("viewGlobalChanged", this.refreshDrawTransform);
    }

    destroy() {
        super.destroy();
        const render = this.service("ThreeRenderManager");
        if (render && render.scene) {
            if(this.renderObject)render.scene.remove(this.renderObject);
        }
    }

    refreshDrawTransform() {
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(renderObject) {
        const render = this.service("ThreeRenderManager");
        renderObject.wcPawn = this;
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        if (render && render.scene) render.scene.add(this.renderObject);
    }

}



//------------------------------------------------------------------------------------------
//-- ThreeCamera  --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        console.log("ThreeCamera");

        this.cameraTranslation = [0,0,0]; // position of the camera relative to the pawn
        this.cameraRotation = q_identity();

        if (this.isMyAvatarPawn) {
            this.refreshCameraTransform();
            this.listen("viewGlobalChanged", this.refreshCameraTransform);
        }
    }

    refreshCameraTransform() {
        if (this.driving) {
            const rm = this.service("ThreeRenderManager");
            const ttt = m4_translation(this.cameraTranslation);
            const rrr = m4_rotationQ(this.cameraRotation)
            const mmm = m4_multiply(rrr, ttt);
            rm.camera.matrix.fromArray(m4_multiply(mmm, this.global));
            rm.camera.matrixWorldNeedsUpdate = true;
        }
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ThreeRenderManager extends ViewService {
    constructor() {
        super("ThreeRenderManager");

        this.canvas = document.createElement("canvas");
        this.canvas.id = "ThreeCanvas";
        this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
        document.body.insertBefore(this.canvas, null);

        this.renderer = new THREE.WebGLRenderer({canvas:this.canvas});
        this.renderer.shadowMap.enabled = true;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.matrixAutoUpdate = false;

        this.resize();
        this.subscribe("input", "resize", () => this.resize());
    }

    destroy() {
        super.destroy();
        this.renderer.dispose();
        if (this.canvas) this.canvas.remove();
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        this.renderer.render(this.scene, this.camera);
    }

}
