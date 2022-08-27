import { WorldcoreView, mix, m4_rotationX, toRad, m4_scaleRotationTranslation, q_axisAngle, PM_WidgetPointer, v2_sub } from "@croquet/worldcore";

let time0 = 0;
let time1 = 0;

export class Godview extends mix(WorldcoreView).with(PM_WidgetPointer) {
    constructor(model) {
        super(model)

        this.fore = 0;
        this.back = 0;
        this.right = 0;
        this.left = 0;

        this.translation = [0,20,20];
        this.rotation = q_axisAngle([1,0,0], toRad(-40));
        this.updateCamera();

        this.subscribe("input", "wDown", this.foreDown);
        this.subscribe("input", "wUp", this.foreUp);
        this.subscribe("input", "sDown", this.backDown);
        this.subscribe("input", "sUp", this.backUp)

        this.subscribe("input", "dDown", this.rightDown);
        this.subscribe("input", "dUp", this.rightUp);
        this.subscribe("input", "aDown", this.leftDown);
        this.subscribe("input", "aUp", this.leftUp)

    }

    foreDown() { this.fore = -1;}
    foreUp() {  this.fore = 0; }
    backDown() {this.back = 1; }
    backUp() { this.back = 0; }

    rightDown() { this.right = 1;}
    rightUp() {  this.right = 0; }
    leftDown() {this.left = -1; }
    leftUp() { this.left = 0; }

    updateCamera() {
        const render = this.service("ThreeRenderManager");
        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], this.rotation, this.translation);
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;
    }

    update(time) {
        const speed = 0.02;
        time0 = time1;
        time1 = time;
        const delta = time1 - time0;
        this.translation[0] += (this.right + this.left) * delta * speed;
        this.translation[2] += (this.fore + this.back) * delta * speed;
        this.updateCamera();
    }

}