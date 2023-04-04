// Tutorial 8 Views

// All the code specific to this tutorial is in the definition of AvatarPawn.

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, ThreeInstanceManager, PM_ThreeInstanced, ThreeRaycast, PM_ThreeCollider,
    PM_Avatar, v3_scale, v3_add, q_multiply, q_axisAngle, v3_rotate, PM_ThreeCamera, q_yaw, q_pitch } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("cyanBox");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.useInstance("magentaBox");
        this.addRenderObjectToRaycast();
    }

}
ClickPawn.register("ClickPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider) {
    constructor(actor) {
        super(actor);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.geometry = new THREE.PlaneGeometry(100,100);
        this.geometry.rotateX(toRad(-90));

        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
        this.addRenderObjectToRaycast();

        this.subscribe("input", "pointerDown", this.doPointerDown);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    doPointerDown(e) {
        if (e.button === 2) return;
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(e.xy);
        if (hits.length<1) return;
        const pawn = hits[0].pawn;
        const xyz = hits[0].xyz;
        if (pawn === this) {
            this.say("spawn", xyz);
        } else {
            pawn.say("kill");
        }
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// ColorPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ColorPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);

        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

}
ColorPawn.register("ColorPawn");

//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added the PM_ThreeCamera mixin to our avatar. The camera has a translation and rotation,
// allowing us to control its position relative to the pawn. It automatically tracks the pawn's
// movement so our view changes as our avatar moves.
//
// We also add the pawn to a special raycast layer ("avatar"). This allows us to raycast to
// find other avatars.
//
// When you hold the right mouse button down, we put the InputManager into pointer lock mode.
// The cursor is hidden and mouse movements are reported as delta changes rather than
// absolute screen coordinates. We use this to drive the camera's pitch and yaw.
//
// When you click with the left mouse button, the AvatarPawn does its own raycast to determine
// if you clicked on another avatar. If that avatar doesn't have a driver, you park your current
// avatar and start driving the new one.

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar, PM_ThreeCamera, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.pitch = 0;
        this.yaw = q_yaw(this.rotation);
        this.cameraTranslation = [0,5,10];
        this.cameraRotation = q_axisAngle([1,0,0], toRad(-5));

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 1, 2, 1 );
        this.geometry.translate(0,1,0);
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);
        this.addRenderObjectToRaycast();
        this.addRenderObjectToRaycast("avatar");

        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

    drive() {
        this.fore = this.back = this.left = this.right = 0;
        this.yawDelta = 0;
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
    }

    park() {
        this.fore = this.back = this.left = this.right = 0;
        this.yawDelta = 0;
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
        this.unsubscribe("input", "pointerDown", this.doPointerDown);
        this.unsubscribe("input", "pointerUp", this.doPointerUp);
        this.unsubscribe("input", "pointerDelta", this.doPointerDelta);
    }

    keyDown(e) {
        switch(e.key) {
            case "ArrowUp":
            case "w":
            case "W":
                this.fore = -1; break;
            case "ArrowDown":
            case "s":
            case "S":
                this.back = 1; break;
            case "ArrowLeft":
            case "a":
            case "A":
                this.left = -1; break;
            case "ArrowRight":
            case "d":
            case "D":
                this.right = 1; break;
            default:
        }
    }

    keyUp(e) {
        switch(e.key) {
            case "ArrowUp":
            case "w":
                this.fore = 0; break;
            case "ArrowDown":
            case "s":
                this.back = 0; break;
            case "ArrowLeft":
            case "a":
                this.left = 0; break;
            case "ArrowRight":
            case "d":
                this.right = 0; break;
            default:
        }
    }

    doPointerDown(e) {
        if (e.button === 2) {
            this.service("InputManager").enterPointerLock();
        } else {
            this.possess(e.xy);
        }

    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yawDelta += (-0.002 * e.xy[0]);
            this.pitch += (-0.002 * e.xy[1]);
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(Math.PI/2, this.pitch);
            const pitchQ = q_axisAngle([1,0,0], this.pitch);
            const yawQ = q_axisAngle([0,1,0], this.yawDelta);
            this.cameraRotation = q_multiply(pitchQ, yawQ);
        }
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            this.yaw += this.yawDelta;
            this.yawDelta = 0;
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const t = v3_scale([this.left + this.right, 0, (this.fore + this.back)], 5 * delta/1000);
            const tt = v3_rotate(t, yawQ);
            let translation = v3_add(this.translation, tt);
            this.positionTo(translation, yawQ);
            this.refreshCameraTransform(); // Required by PM_ThreeCamera to trigger a camera refresh when you're driving.
        }
    }

    possess(xy) {
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(xy, "avatar");
        if (hits.length<1) return;
        const pawn = hits[0].pawn;
        if (pawn === this) return; // You can't possess yourself
        if (pawn.actor.driver) return; // You can't steal someone else's avatar

        this.set({driver: null});
        pawn.set({driver: this.viewId});
    }

}
AvatarPawn.register("AvatarPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildLights();
        // this.buildCamera();
        this.buildInstances();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 90;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;

        rm.scene.add(ambient);
        rm.scene.add(sun);
    }

    buildCamera() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], toRad(-45));
        const yawMatrix = m4_rotation([0,1,0], toRad(-30));

        let cameraMatrix = m4_translation([0,0,50]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = 60;
        rm.camera.updateProjectionMatrix();
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  yellow = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const  magenta = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        const  cyan = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );

        im.addMaterial("yellow", yellow);
        im.addMaterial("magenta", magenta);
        im.addMaterial("cyan", cyan);

        const box = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("box", box);

        const mesh0 = im.addMesh("yellowBox", "box", "yellow");
        const mesh1 = im.addMesh("magentaBox", "box", "magenta");
        const mesh2 = im.addMesh("cyanBox", "box", "cyan");

        mesh0.castShadow = true;
        mesh1.castShadow = true;
        mesh2.castShadow = true;
    }

}
