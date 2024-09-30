
import { m4_multiply, m4_translation, ViewService, q_identity, m4_rotationQ } from "@croquet/worldcore-kernel";
import * as THREE from 'three';
// you must remove rapier from the three Addons to avoid a conflict with the three package in the examples/MazeWars example
import * as ADDONS from 'three/examples/jsm/Addons.js';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

export { THREE, ADDONS, CustomShaderMaterial };

//------------------------------------------------------------------------------------------
//-- ThreeVisible  -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export const PM_ThreeVisible = superclass => class extends superclass {

    // constructor(...args) {
    //     super(...args);
    //     // this.listen("viewGlobalChanged", this.refreshDrawTransform);
    // }

    destroy() {
        super.destroy();
        const rm = this.service("ThreeRenderManager");
        if (rm && rm.scene && this.renderObject && !this.renderObject.instance) {
            rm.scene.remove(this.renderObject);
        }
    }

    refreshDrawTransform() {
        if (this.renderObject) this.setMatrix();
    }

    setMatrix() {
        let matrix = this.global;
        // if (this.localTransform) matrix = m4_multiply(this.localTransform, this.global);
        this.renderObject.matrix.fromArray(matrix);
        this.renderObject.matrixWorldNeedsUpdate = true;
    }

    setRenderObject(renderObject) {
        const render = this.service("ThreeRenderManager");
        renderObject.pawn = this;
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.setMatrix();
        if (render && render.scene) render.scene.add(this.renderObject);
    }


};

//------------------------------------------------------------------------------------------
//-- ThreeCamera  --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);

        this.cameraTranslation = [0,0,0]; // position of the camera relative to the pawn
        this.cameraRotation = q_identity();
    }

    refreshCameraTransform() {
        const rm = this.service("ThreeRenderManager");
        const ttt = m4_translation(this.cameraTranslation);
        const rrr = m4_rotationQ(this.cameraRotation);
        const mmm = m4_multiply(rrr, ttt);
        rm.camera.matrix.fromArray(m4_multiply(mmm, this.global));
        rm.camera.matrixWorldNeedsUpdate = true;
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ThreeRenderManager extends ViewService {
    constructor(options) {
        super("ThreeRenderManager");

        const rendererOptions = {
            antialias: true,
            ...options?.renderer,
        };

        if (rendererOptions.canvas) {
            this.canvas = rendererOptions.canvas;
        } else {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "ThreeCanvas";
            this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
            document.body.insertBefore(this.canvas, null);
            rendererOptions.canvas = this.canvas;
        }

        this.doRender = true; // set to false to disable rendering
        this.renderer = new THREE.WebGLRenderer(rendererOptions);

        const shadowMapOptions = {
            enabled: true,
            ...options?.shadowMap,
        };
        Object.assign(this.renderer.shadowMap, shadowMapOptions);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.matrixAutoUpdate = false;

        const composerOptions = {
            enabled: false,
            passes: [
                // either Pass instances or known strings (only 'RenderPass' is known)
                'RenderPass',
            ],
            ...options?.composer,
        };

        if (composerOptions.enabled) {
            this.composer = new ADDONS.EffectComposer( this.renderer );
            for (const pass of composerOptions.passes) {
                if (pass === 'RenderPass') {
                    this.composer.addPass(new ADDONS.RenderPass(this.scene, this.camera));
                } else {
                    if (!(pass instanceof ADDONS.Pass)) {
                        console.warn("Composer pass should be an instance of Pass or the string 'RenderPass', but got", pass);
                    }
                    this.composer.addPass(pass);
                }

            }
        }

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
        if (this.doRender) {
            if (this.composer) this.composer.render();
            else this.renderer.render(this.scene, this.camera);
        }
    }

}
