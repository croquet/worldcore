import { NamedView, GetNamedView } from "./NamedView";
import * as THREE from 'three';
import { FBXLoader } from "../lib/three/FBXLoader.js"; // This external dependency on a third Party FBX loader isn't great ...
import { ViewService } from "./Root";

//------------------------------------------------------------------------------------------
//-- ThreeVisible Mixin --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// This is the interface for a pawn to manage its Three.js render model.

export const PM_ThreeVisible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        this.disposeRenderObject(this.renderObject);
    }

    disposeRenderObject(object) { // Recursively destroys render objects
        if (!object) return;
        const doomed = [];
        object.children.forEach(child => doomed.push(child));
        doomed.forEach(child => this.disposeRenderObject(child));
        if (object.geometry && object.material) {
            object.geometry.dispose();
            const materials = [].concat(object.material);
            materials.forEach(material => material.dispose());
        }
        if (object.parent) object.parent.remove(object);
    }

    refresh() {
        super.refresh();
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(renderObject) {
        const render = this.service("ThreeRenderManager");
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        render.scene.add(this.renderObject);

        this.pawn3D = this.renderObject; // Legacy support for object highlighting in Verizon demo. Delete when we don't need to support it.
    }

    // Loads a single texture. Returns a promise. The resolve callback receives the pointer to the texture.

    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            return textureLoader.load(url, resolve, undefined, reject);
        });
    }

        // Loads a single FBX model. Returns a promise. The resolve callback receives the pointer to the model.
    // The loader creates a top level group with the other models stored under it.

    loadFBXModel(url) {
        return new Promise((resolve, reject) => {
            const fbxLoader = new FBXLoader();
            return fbxLoader.load(url, resolve, undefined, reject);
        });
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeCamera Mixin ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_ThreeCamera = superclass => class extends superclass {
    constructor(...args) {
        super(...args);

        if (this.isMyPlayerPawn) {
             const render = GetNamedView("ThreeRenderManager");
            render.camera.matrix.fromArray(this.lookGlobal);
            render.camera.matrixAutoUpdate = false;
            render.camera.matrixWorldNeedsUpdate = true;
        }
    }

    refresh() {
        super.refresh();
        if (!this.isMyPlayerPawn) return;
        const render = GetNamedView("ThreeRenderManager");
        render.camera.matrix.fromArray(this.lookGlobal);
        render.camera.matrixWorldNeedsUpdate = true;
    }

};

//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

export class ThreeRenderManager extends ViewService {
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

        THREE.Cache.enabled = true;

        this.subscribe("input", "resize", () => this.resize());
    }

    destroy() {
        super.destroy();
        this.renderer.dispose();
        this.scene.dispose();
        this.canvas.remove();
        THREE.Cache.clear();
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

    // Loads multiple textures. Returns a promise. This can be used to prime the cache with a bunch
    // of textures in parallel.

    loadTextureCache(urls) {
        return new Promise((resolve, reject) => {
            const loadManager = new THREE.LoadingManager(resolve, undefined, reject);
            const textureLoader = new THREE.TextureLoader(loadManager);
            urls.forEach(url => textureLoader.load(url, resolve, undefined, reject));
        });
    }



    // Loads multiple FBX models. Returns a promise. This can be used to prime the cache with a bunch
    // of models in parallel.

    loadFBXModels(urls) {
        return new Promise((resolve, reject) => {
            const loadManager = new THREE.LoadingManager(resolve, undefined, reject);
            const fbxLoader = new FBXLoader(loadManager);
            urls.forEach(url => fbxLoader.load(url))
        });
    }



}
