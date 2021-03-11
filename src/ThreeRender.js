import { NamedView, GetNamedView } from "./NamedView";

import * as THREE from 'three';

//------------------------------------------------------------------------------------------
//-- ThreeVisible Mixin --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This is the interface for a pawn to manage its Three.js render model.

export const PM_ThreeVisible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        const render = GetNamedView("ThreeRenderManager");
        // Put code here to destroy the model in the render manager.
    }

    refresh() {
        super.refresh();
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(renderObject) {
        const render = GetNamedView("ThreeRenderManager");
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        render.scene.add(this.renderObject);
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeCamera Mixin ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        if (this.isMine) {
            const render = GetNamedView("ThreeRenderManager");
            // Put code here to initialize the camera transform to this.global
        }
    }

    refresh() {
        super.refresh();
        if (!this.isMine) return;
        const render = GetNamedView("ThreeRenderManager");
        // Put code to to update the camera transform in the render manager when this.global changes.

    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManager extends NamedView {
    constructor() {
        super("ThreeRenderManager");

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);

        this.canvas = document.createElement("canvas");
        this.canvas.id = "ThreeCanvas";
        this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
        document.body.insertBefore(this.canvas, null);

        this.resize();
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.shadowMap.enabled = true;
        this.setBackground([0.5, 0.5, 0.7, 1]);

        // this.textureCache = new Map();

        this.subscribe("input", "resize", () => this.resize());


    }

    destroy() {
        super.destroy();
        this.renderer.dispose();
        this.scene.dispose();
        this.canvas.remove();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    update() {
        this.renderer.render(this.scene, this.camera);
    }

    setBackground(bg) {
        this.renderer.setClearColor(new THREE.Color(bg[0], bg[1], bg[2]), bg[3]);
    }

    loadTextures(urls) {
        return new Promise((resolve, reject) => {
            const loadManager = new THREE.LoadingManager(resolve, undefined, reject);
            const textureLoader = new THREE.TextureLoader(loadManager);
            urls.forEach(url => textureLoader.load(url))
        })
    }

}
