import { WorldcoreView, mix, m4_rotationX, toRad, m4_scaleRotationTranslation, q_axisAngle, PM_WidgetPointer, v2_sub, Constants, q_multiply, TAU, v3_scale } from "@croquet/worldcore";

let time0 = 0;
let time1 = 0;

export class GodView extends mix(WorldcoreView).with(PM_WidgetPointer) {
    constructor(model) {
        super(model)

        this.fore = 0;
        this.back = 0;
        this.right = 0;
        this.left = 0;

        const xxx = Constants.scaleX * Constants.sizeX / 2;

        this.speed = 5;
        this.turnSpeed = 0.002;

        this.pitch = toRad(45)
        this.yaw = toRad(-90)
        this.yaw = toRad(0)

        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,0,1], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);

        this.translation = [0,-20,20];
        this.rotation = lookQ;
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

    }

    foreDown() { this.fore = 1; }
    foreUp() {  this.fore = 0; }
    backDown() {this.back = -1; }
    backUp() { this.back = 0; }

    rightDown() { this.right = 1;}
    rightUp() {  this.right = 0; }
    leftDown() {this.left = -1; }
    leftUp() { this.left = 0; }

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
            this.pitch = Math.min(Math.PI/2, this.pitch);
            this.updateCamera();
        };
    }

    updateCamera() {
        const render = this.service("ThreeRenderManager");

        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,0,1], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);
        this.rotation = lookQ;

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], this.rotation, this.translation);
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;
    }

    update(time) {
        const speed = 0.02;

        // const yawQ = q_axisAngle([0,1,0], this.yaw);
        // const v = v3_scale(this.velocity, -this.speed * delta/1000)
        // const v2 = v3_rotate(v, yawQ);
        // const t = v3_add(this.translation, v2)

        time0 = time1;
        time1 = time;
        const delta = time1 - time0;
        this.translation[0] += (this.right + this.left) * delta * speed;
        this.translation[1] += (this.fore + this.back) * delta * speed;
        this.updateCamera();
    }

}