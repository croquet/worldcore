import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE, PM_ThreeInstanced,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, PM_ThreeCollider, ThreeRaycast } from "@croquet/worldcore";

    function rgb(r, g, b) {
        return [r/255, g/255, b/255];
    }

    function setGeometryColor(geometry, color) {
        const count = geometry.getAttribute("position").count;
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(...color);
        }
        geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3) );
    }

    const Colors = [
        rgb(242, 215, 213),        // Red
        rgb(217, 136, 128),        // Red
        rgb(192, 57, 43),        // Red

        rgb(240, 178, 122),        // Orange
        rgb(230, 126, 34),        // Orange
        rgb(175, 96, 26),        // Orange

        rgb(247, 220, 111),        // Yellow
        rgb(241, 196, 15),        // Yellow
        rgb(183, 149, 11),        // Yellow

        rgb(125, 206, 160),        // Green
        rgb(39, 174, 96),        // Green
        rgb(30, 132, 73),        // Green

        rgb(133, 193, 233),         // Blue
        rgb(52, 152, 219),        // Blue
        rgb(40, 116, 166),        // Blue

        rgb(195, 155, 211),        // Purple
        rgb(155, 89, 182),         // Purple
        rgb(118, 68, 138),        // Purple

        [0.9, 0.9, 0.9],        // White
        [0.5, 0.5, 0.5],        // Gray
        [0.2, 0.2, 0.2]        // Black
    ]

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.setRenderObject(mesh);
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        this.geometry = new THREE.PlaneGeometry(100,100);
        this.geometry.rotateX(toRad(90));

        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_Avatar, PM_ThreeVisible, PM_ThreeCamera, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
        this.addRenderObjectToRaycast("avatar");

        this.fore = this.back = this.left = this.right = 0;
        this.pitch = this.yaw = this.yawDelta = 0;
        this.speed = 5;
        this.turnSpeed = 0.002;

        this.cameraTranslation = [0,5,7];
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yawDelta);
        this.cameraRotation = q_multiply(pitchQ, yawQ);

        // this.subscribe("input", "zDown", this.toggleDrive)
        this.subscribe("input", "pDown", this.possess)
        this.subscribe("input", "pointerMove", this.doPointerMove);
    }

    // toggleDrive() {
    //     if (this.isMyAvatarPawn) {
    //         if (this.driving) {
    //             this.park()
    //         } else {
    //             this.drive()
    //         }
    //     }
    // }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {
        // const color = Colors[this.actor.driver.index];
        const color = [1,1,0];
        // console.log(this.actor.driver.index + " "+ color);
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        // this.geometry.translate(0,0.5,0);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...color)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        this.setRenderObject(mesh);
    }

    onDriverSet() {
        if (this.isMyAvatar) {
            console.log("Avatar: " + this.actor.name);
            this.fore = this.back = this.left = this.right = 0;

            this.subscribe("input", "keyDown", this.keyDown);
            this.subscribe("input", "keyUp", this.keyUp);

            this.subscribe("input", "pointerDown", this.doPointerDown);
            this.subscribe("input", "pointerUp", this.doPointerUp);
            this.subscribe("input", "pointerDelta", this.doPointerDelta);
        } else {
            // this.fore = this.back = this.left = this.right = 0;

            // this.unsubscribe("input", "keyDown", this.keyDown);
            // this.unsubscribe("input", "keyUp", this.keyUp);

            // this.unsubscribe("input", "pointerDown", this.doPointerDown);
            // this.unsubscribe("input", "pointerUp", this.doPointerUp);
            // this.unsubscribe("input", "pointerDelta", this.doPointerDelta);
        }
    }



    possess() {
        console.log("possess!");
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(this.xy, "avatar");
        if (hits.length<1) return;
        const hit = hits[0];
        const target = hit.pawn;
        if (!target) return;
        this.set({driver: null})
        target.set({driver: this.viewId});
        target.future(0).refreshCameraTransform();
    }

    keyDown(e) {
        if (this.focused) return;
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
            case "D" :
                this.right = 1; break;
            default:
        }
    }

    keyUp(e) {
        if (this.focused) return;
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
        if (e.button === 2) this.service("InputManager").enterPointerLock();;
    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerMove(e) {
        this.xy = e.xy;
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yawDelta += (-this.turnSpeed * e.xy[0]);
            this.pitch += (-this.turnSpeed * e.xy[1]);
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(Math.PI/2, this.pitch);
            const pitchQ = q_axisAngle([1,0,0], this.pitch);
            const yawQ = q_axisAngle([0,1,0], this.yawDelta);
            this.cameraRotation = q_multiply(pitchQ, yawQ);
            this.say("headPitch", this.pitch, 200 );
        };
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.isMyAvatar) {
            this.yaw += this.yawDelta;
            this.yawDelta = 0;
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const v = v3_scale([(this.left + this.right), 0, (this.fore + this.back)], this.speed * delta/1000)
            const vv = v3_rotate(v, yawQ);
            const t = v3_add(this.translation, vv);
            this.positionTo(t,yawQ);
        }
    }
}
AvatarPawn.register("AvatarPawn");

//------------------------------------------------------------------------------------------
// --HeadPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class HeadPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        const um = this.modelService("UserManager");
        const user = um.user(this.actor.parent.driver);

        if(user) {
            const um = this.modelService("UserManager");
            const user = um.user(this.actor.parent.driver);
            this.useInstance("box" + user.index);
        } else {
            this.useInstance("box20");
        }
    }


}
HeadPawn.register("HeadPawn");

//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(-30);

class GodView extends ViewService {

    constructor() {
        super("GodView");

        this.updateCamera();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe(this.viewId, "avatar", this.onAvatar)
    }

    onAvatar(driving) {
        // console.log ("Avatar!");
        this.paused = driving;
        if(!driving) this.updateCamera();
    }


    updateCamera() {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)

        let cameraMatrix = m4_translation([0,0,50]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    onWheel(data) {
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    doPointerDown() {
        if (this.paused) return;
        this.dragging = true;
    }

    doPointerUp() {
        if (this.paused) return;
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (this.paused) return;
        if (!this.dragging) return;
        yaw += -0.01 * e.xy[0];
        yaw = yaw % TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-5));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera()
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, WidgetManager2, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildInstances()
        this.buildLights();
        this.buildHUD();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 300;

        sun.shadow.camera.left = -80
        sun.shadow.camera.right = 80
        sun.shadow.camera.top = 80
        sun.shadow.camera.bottom = -80

        sun.shadow.bias = -0.0005;
        group.add(sun);

        rm.scene.add(group);
    }

    buildHUD() {
        const wm = this.service("WidgetManager2");
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.BackSide;
        im.addMaterial("yellow", material);

        const  vc = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,1)} );
        vc.side = THREE.DoubleSide;
        vc.shadowSide = THREE.DoubleSide;
        vc.castShadow = true;
        vc.vertexColors = true;

        im.addMaterial("vertexColors", vc);

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("cube", geometry);

        for (let n = 0; n<21; n++) {
            const color = Colors[n];
            const geometry = new THREE.BoxGeometry( 1, 1, 1 );
            setGeometryColor(geometry, color);
            im.addGeometry("box" + n, geometry);
            const mesh = im.addMesh("box" + n, "box"+ n, "vertexColors");
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }

        const mmm = im.addMesh("cube", "cube", "yellow");
        mmm.castShadow = true;
    }

}