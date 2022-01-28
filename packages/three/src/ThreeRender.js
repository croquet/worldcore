import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ViewService, PM_PointerTarget } from "@croquet/worldcore-kernel";

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
        if (render && render.scene) render.scene.remove(this.renderObject);
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
        if (this.onSetRenderObject) this.onSetRenderObject(renderObject);
    }

};

//------------------------------------------------------------------------------------------
//-- PM_ThreePointerTarget  ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreePointerTarget = superclass => class extends PM_PointerTarget(superclass) {
    constructor(...args) {
        super(...args)
        const render = this.service("ThreeRenderManager");
        if (!render.layers.pointer) render.layers.pointer = [];
    }

    destroy() {
        super.destroy();
        const render = this.service("ThreeRenderManager");
        if (!render.layers.pointer) return;
        const i = render.layers.pointer.indexOf(this.renderObject);
        if (i === -1) return;
        console.log(render.layers.pointer);
        render.layers.pointer.splice(i,1);
        console.log(render.layers.pointer);
    }

    onSetRenderObject(renderObject) {
        if (super.onSetRenderObject) super.onSetRenderObject(renderObject)
        const render = this.service("ThreeRenderManager");
        render.layers.pointer.push(renderObject)
        // console.log(render.layers.pointer);
    }
}

//------------------------------------------------------------------------------------------
//-- ThreeCamera  --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);

        if (this.isMyPlayerPawn) {
            const render = this.service("ThreeRenderManager");
            render.camera.matrix.fromArray(this.lookGlobal);
            render.camera.matrixAutoUpdate = false;
            render.camera.matrixWorldNeedsUpdate = true;

            this.listen("lookGlobalChanged", this.refreshCameraTransform);
            this.listen("viewGlobalChanged", this.refreshCameraTransform);
        }
    }

    refreshCameraTransform() {
        const render = this.service("ThreeRenderManager");
        render.camera.matrix.fromArray(this.lookGlobal);
        render.camera.matrixWorldNeedsUpdate = true;
    }

    pointerRaycast(xy) {
        const render = this.service("ThreeRenderManager");
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();
        this.raycaster.setFromCamera({x: xy[0], y: xy[1]}, render.camera);
        const h = this.raycaster.intersectObjects(render.layers.pointer);
        if (h.length === 0) return {};
        const hit = h[0];
        return {
            pawn: hit.object.wcPawn,
            xyz: hit.point.toArray(),
            xyzLocal: hit.object.worldToLocal(hit.point).toArray(),
            uv: hit.uv.toArray(),
            normal: hit.face.normal.toArray()
        };
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManager extends ViewService {
    constructor(options = {}, name) {
        super(name || "ThreeRenderManager");

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.layers = {};

        if (!options.canvas) {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "ThreeCanvas";
            this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
            document.body.insertBefore(this.canvas, null);
            options.canvas = this.canvas;
        }

        this.renderer = new THREE.WebGLRenderer(options);
        this.renderer.shadowMap.enabled = true;

        this.composer = new EffectComposer( this.renderer );

        this.renderPass = new RenderPass( this.scene, this.camera );
        this.composer.addPass( this.renderPass );

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
        this.composer.setSize(window.innerWidth, window.innerHeight)
    }

    update() {
        this.composer.render();
    }

}
