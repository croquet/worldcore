import { GetNamedView, NamedView, m4_scalingRotationTranslation, q_axisAngle, toRad } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

let translation = [0,0, (Voxels.sizeZ + 10) * Voxels.scaleZ ];
let pitch = toRad(45);
let yaw = toRad(0);
let fov = toRad(60);

export class GodView extends NamedView {
    constructor(model) {
        super("GodView", model);

        this.camera = GetNamedView('ViewRoot').render.camera;

        const cameraMatrix = m4_scalingRotationTranslation([1,1,1], q_axisAngle([1,0,0], toRad(45)), [0,-50,50]);
        this.camera.setLocation(cameraMatrix);
        this.camera.setProjection(fov, 1.0, 10000.0);


        this.subscribe("input", 'pointerDown', this.onPointerDown);
        this.subscribe("input", 'pointerUp', this.onPointerUp);
        this.subscribe("input", 'pointerMove', this.onPointerMove);
        this.subscribe("input", 'wheel', this.onWheel);

    }

    onPointerDown(data) {
        if (data.type === 'mouse' && data.button !== 2) return;
        console.log(data);
    }

    onPointerUp(data) {
        if (data.type === 'mouse' && data.button !== 2) return;
        console.log(data);
    }

    onPointerMove(data) {

    }

    onWheel(data) {
        this.setFOV(fov + data / 2000);
    }

    setFOV(f) {
        fov = Math.max(toRad(10), Math.min(toRad(80), f));
        this.camera.setFOV(fov);
    }

    update(time, delta) {

    }
}