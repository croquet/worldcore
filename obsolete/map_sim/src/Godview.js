import { WorldcoreView, mix, m4_rotationX, toRad, m4_scaleRotationTranslation, q_axisAngle, PM_WidgetPointer, v2_sub, q_multiply, TAU,
    v3_rotate, v3_magnitude, v3_normalize, v3_scale, v3_add } from "@croquet/worldcore";

let time0 = 0;
let time1 = 0;
let fov = 50;

export class Godview extends mix(WorldcoreView).with(PM_WidgetPointer) {
    constructor(model) {
        super(model)

        this.fore = 0;
        this.back = 0;
        this.right = 0;
        this.left = 0;

        this.translation = [0,50,50];

        this.yaw = 0;
        this.pitch = toRad(-30)

        this.moveSpeed = 0.1;
        this.turnSpeed = 0.002;

        // const pitchQ = q_axisAngle([1,0,0], this.pitch);
        // const yawQ = q_axisAngle([0,1,0], this.yaw);
        // const lookQ = q_multiply(pitchQ, yawQ);
        // // const lookQ = q_multiply(yawQ, pitchQ);
        // this.rotation = lookQ;

        // this.yaw = 0;
        // this.pitch = toRad(-40)
        // this.rotation = q_axisAngle([1,0,0], this.pitch);
        this.updateCamera();

        this.subscribe("input", "wDown", this.foreDown);
        this.subscribe("input", "wUp", this.foreUp);
        this.subscribe("input", "sDown", this.backDown);
        this.subscribe("input", "sUp", this.backUp)

        this.subscribe("input", "dDown", this.rightDown);
        this.subscribe("input", "dUp", this.rightUp);
        this.subscribe("input", "aDown", this.leftDown);
        this.subscribe("input", "aUp", this.leftUp)

        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", 'wheel', this.onWheel);

    }

    foreDown() { this.fore = -1;}
    foreUp() {  this.fore = 0; }
    backDown() {this.back = 1; }
    backUp() { this.back = 0; }

    rightDown() { this.right = 1;}
    rightUp() {  this.right = 0; }
    leftDown() {this.left = -1; }
    leftUp() { this.left = 0; }

    onWheel(data) {
        const render = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(80, fov + data.deltaY / 100));
        render.camera.fov = fov;
        render.camera.updateProjectionMatrix();
    }

    doPointerDown(e) {
        if (e.button === 2) this.service("InputManager").enterPointerLock();;
    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yaw += (-this.turnSpeed * e.xy[0]) % TAU;
            this.pitch += (-this.turnSpeed * e.xy[1]) % TAU;
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(0, this.pitch);
            this.updateCamera();
        };
    }

    updateCamera() {
        const render = this.service("ThreeRenderManager");

        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);
        this.rotation = lookQ;

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], this.rotation, this.translation);
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;
    }

    update(time) {
        time0 = time1;
        time1 = time;
        const delta = time1 - time0;

        const yawQ = q_axisAngle([0,1,0], this.yaw);
        let forward = [0,0,0];
        const v = v3_rotate([this.right + this.left, 0, (this.fore + this.back)], yawQ);
        if (v3_magnitude(v)) forward = v3_normalize(v);
        const move = v3_scale(forward, delta * this.moveSpeed);
        this.translation = v3_add(this.translation,move)
        this.updateCamera();
    }

}