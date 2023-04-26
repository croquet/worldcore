// Tutorial 1 Views

// Every object in Worldcore is represented by an actor/pawn pair. Spawning an actor
// automatically instantiates a corresponding pawn. The actor is replicated
// across all clients, while the pawn is unique to each client.

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Here we define a pawn for our actor to use. It uses the PM_Spatial and PM_ThreeVisible
// mixins. PM_Spatial allows the pawn to track the position of any AM_Spatial actor it's
// attached to.

// PM_ThreeVisible gives the pawn an interface to the THREE.js renderer. In the pawn's constructor
// we create a THREE.js mesh and set it to be the pawn's render object. When the pawn's actor moves,
// these mixins will make sure the render mesh tracks it.

export class TestPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {

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

// The view root has a list of global services it creates on start-up. In this case we're using
// InputManager and ThreeRenderManager.

// ThreeRenderManager is the THREE.js renderer, and InputManager is a collection of DOM listeners
// that translate common DOM events into Croquet events. In our model code we subscribe to InputManager
// events to move our actor left and right.

// Both of these services are optional. THREE.js can be replaced with a different renderer,
// and you can write your own DOM event listeners instead of using InputManager.

// Note that pawns are never explicitly instantiated. Worldcore automatically creates and destroys pawns
// as actors come in and out of existence. When you join a session already in progress, all objects
// will be automatically synched with the shared state of the world.

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
