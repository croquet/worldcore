import { ViewService } from "./Root";
import * as THREE from 'three';


import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';


//------------------------------------------------------------------------------------------
//-- PM_Visible  ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Visible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        for (const layerName in render.layers) {
            const layer = render.layers[layerName];
            if (layer.has(this)) render.dirtyLayer(layerName);
            render.layers[layerName].delete(this);
        }
    }

    addToLayers(...names) {
        const render = this.service("RenderManager");
        names.forEach(name => {
            if (!render.layers[name]) render.layers[name] = new Set();
            render.layers[name].add(this);
            render.dirtyLayer(name);
        });
    }

    removeFromLayers(...names) {
        const render = this.service("RenderManager");
        names.forEach(name => {
            if (!render.layers[name]) return;
            render.layers[name].delete(this);
            if (render.layers[name].size === 0) {
                delete render.layers[name];
            }
            render.dirtyLayer(name);
        });
    }

    layers() {
        let result = [];
        const render = this.service("RenderManager");
        for (const layerName in render.layers) {
            const layer = render.layers[layerName];
            if (layer.has(this)) result.push(layerName);
        }
        return result;
    }
};

//------------------------------------------------------------------------------------------
//-- PM_Camera -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Camera = superclass => class extends superclass {};

//------------------------------------------------------------------------------------------
//-- RenderManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RenderManager extends ViewService {
    constructor(options = {}, name) {
        super(name);
        this.registerViewName("RenderManager"); // Alternate generic name
        this.layers = {};
    }

    dirtyLayer(name) {} // Renderer can use this to trigger a rebuild of renderer-specific layer data;

}


//------------------------------------------------------------------------------------------------------------------------
//-- XXX  ----------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------


//------------------------------------------------------------------------------------------
//-- ThreeVisible  -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
export const PM_ThreeVisibleX = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("viewGlobalChanged", this.refreshDrawTransform);
    }

    destroy() {
        super.destroy();
        const render = this.service("ThreeRenderManager");
        if (render && render.scene) {
            if(this.renderObject)render.scene.remove(this.renderObject);
            // if(this.colliderObject)render.scene.remove(this.colliderObject);
        }
    }

    refreshDrawTransform() {
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
        // if(this.colliderObject){
        //     this.colliderObject.matrix.fromArray(this.global);
        //     this.colliderObject.matrixWorldNeedsUpdate = true;
        // }
    }

    setRenderObject(renderObject) {
        const render = this.service("ThreeRenderManager");
        // if (render) render.dirtyAllLayers();
        renderObject.wcPawn = this;
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        if (render && render.scene) render.scene.add(this.renderObject);
        if (this.onSetRenderObject) this.onSetRenderObject(renderObject);
    }

    // setColliderObject(colliderObject) {
    //     const render = this.service("ThreeRenderManager");
    //     if (render) render.dirtyAllLayers();
    //     colliderObject.wcPawn = this;
    //     this.colliderObject = colliderObject;
    //     this.colliderObject.matrixAutoUpdate = false;
    //     this.colliderObject.matrix.fromArray(this.global);
    //     this.colliderObject.matrixWorldNeedsUpdate = true;
    //     if (render && render.scene) render.scene.add(this.colliderObject);
    // }
};


//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManagerX extends RenderManager {
    constructor(options = {}, name) {
        super(options, name || "ThreeRenderManager");

        this.threeLayers = {}; // Three-specific layers

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.matrixAutoUpdate = false;

        if (!options.canvas) {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "ThreeCanvas";
            this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
            document.body.insertBefore(this.canvas, null);
            options.canvas = this.canvas;
        }

        this.renderer = new THREE.WebGLRenderer(options);
        this.renderer.shadowMap.enabled = true;

        // this.composer = new EffectComposer( this.renderer );

        // this.renderPass = new RenderPass( this.scene, this.camera );
        // this.composer.addPass( this.renderPass );

        this.resize();
        this.subscribe("input", "resize", () => this.resize());
        // this.setRender(true);
    }

    // setRender(bool){this.doRender = bool; }
    destroy() {
        super.destroy();
        this.renderer.dispose();
        if (this.canvas) this.canvas.remove();
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // this.composer.setSize(window.innerWidth, window.innerHeight)
    }

    // dirtyLayer(name) {
    //     this.threeLayers[name] = null;
    // }

    // dirtyAllLayers(){
    //     this.threeLayers = {};
    // }

    // threeLayer(name) {
    //     if (!this.layers[name]) return [];
    //     if (!this.threeLayers[name]) {
    //         this.threeLayers[name] = Array.from(this.layers[name]).map(p => p.colliderObject || p.renderObject);
    //     }
    //     return this.threeLayers[name];
    // }

    // threeLayerUnion(...names) {
    //     let result = [];
    //     while (names.length > 0) {
    //         const a = this.threeLayer(names.pop());
    //         result = result.concat(a.filter(x => result.indexOf(x) < 0))
    //     }
    //     return result;
    // }

    update() {
        // if(this.doRender)this.composer.render();

        this.renderer.render(this.scene, this.camera);
    }

    setCameraTransform(m) {
        this.camera.matrix.fromArray(m);
        this.camera.matrixWorldNeedsUpdate = true;
    }

}
