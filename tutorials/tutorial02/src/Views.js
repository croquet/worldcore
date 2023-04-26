// Tutorial 2 Views

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Instead of PM_Spatial, this pawn uses PM_Smoothed. Smoothed pawns blend toward
// their actor's position on every frame. Use them if you expect an object to move.

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1, 1, 0)} );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(mesh);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose(); // Tell THREE.js to dispose of the pawn's resources when it's destroyed.
        this.material.dispose();
    }

}
TestPawn.register("TestPawn"); // All Worldcore pawns must be registered after they're defined.

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager];
    }

    onStart() {
        this.buildLights();
        this.buildCamera();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);

        rm.scene.add(ambient);
        rm.scene.add(sun);
    }

    buildCamera() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], toRad(-20));
        const yawMatrix = m4_rotation([0,1,0], toRad(-30));

        let cameraMatrix = m4_translation([0,0,15]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = 60;
        rm.camera.updateProjectionMatrix();
    }

}
