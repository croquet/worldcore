import {  ViewService } from "@croquet/worldcore-kernel";
import * as THREE from "three";

//------------------------------------------------------------------------------------------
//-- ThreeRaycast --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ThreeRaycast extends ViewService {
    constructor() {
        super("ThreeRaycast");
        this.layers = new Map();
    }

    addToLayer(mesh, layer) {
        if (!this.layers.has(layer)) this.layers.set(layer, []);
        this.layers.get(layer).push(mesh)
    }

    removeFromLayer(mesh, layer) {
        if (!this.layers.has(layer)) return;
        const culled = this.layers.get(layer).filter(m => m !== mesh)
        this.layers.set(layer, culled);
    }

    cameraRaycast(xy, layer = "default") {
        const x = ( xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( xy[1] / window.innerHeight ) * 2 + 1;

        const rm = this.service("ThreeRenderManager");
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x, y}, rm.camera);
        const hits = raycaster.intersectObjects( this.layers.get(layer) );
        const out = [];
        hits.forEach(hit => {
            let pawn = hit.object.pawn;
            if (hit.object.instance) {
                const index = hit.instanceId;
                pawn = hit.object.instance.pawns[index];
            }
            out.push({
                pawn,
                distance: hit.distance,
                xyz: [hit.point.x, hit.point.y, hit.point.z],
                uv: [hit.uv.x, hit.uv.y],
            })
        })
        return out;
    }

}

//------------------------------------------------------------------------------------------
//-- PM_ThreeCollider ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

    export const PM_ThreeCollider = superclass => class extends superclass {

        constructor(...args) {
            super(...args);
            this.collisionLayers = [];
        }

        destroy() {
            super.destroy();
            const rc = this.service("ThreeRaycast");
            if (rc && this.renderObject) this.collisionLayers.forEach( layer => rc.removeFromLayer(this.renderObject, layer))
        }

        // Bug with instances

        addRenderObjectToRaycast(layer = "default") {
            const rc = this.service("ThreeRaycast");
            this.collisionLayers.push(layer);
            rc.addToLayer(this.renderObject, layer)
        }

    }