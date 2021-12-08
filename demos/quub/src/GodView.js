import { m4_scaleRotationTranslation, v3_scale, v3_add, v3_multiply, q_axisAngle, toRad, TAU, q_multiply, KeyDown, m4_translation, m4_rotationZ, m4_multiply, v3_transform, ViewService } from "@croquet/worldcore-kernel";
import { PickEmptyVoxel, PickBase } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

// The GodView controls the camera navigation. We store the camera position in global outside the view so if we
// briefly disconnect and reconnect, the camera comes back in the same position.

let translation = [0,0, (Voxels.sizeZ + 10) * Voxels.scaleZ ];
let pitch = toRad(45);
let yaw = toRad(315);
let fov = toRad(20);

export class GodView extends ViewService {
    constructor() {
        super("GodView");

        const render = this.service('RenderManager');
        this.camera = render.camera;
        this.camera.setProjection(fov, 1.0, 10000.0)
        this.camera.setFOV(fov);
        this.updateCamera();

        this.subscribe("input", 'wheel', this.wheelZoom);
        this.subscribe("ui", 'pointerDown', this.startDrag);
        this.subscribe("ui", 'pointerUp', this.endDrag);
        this.subscribe("ui", 'pointerMove', this.drag);
        this.subscribe("input", 'doubleStart',this.doubleStart);
        this.subscribe("input", 'doubleChanged', this.doubleChanged);
    }

    startDrag(event) {
        if (event.type === "mouse" && event.button !== 2) return;
        const xy = event.xy;
        if (KeyDown('Shift') || (xy[1] > this.camera.height - 150)) {
            this.lastX = xy[0];
            this.pivot = this.findGrab([this.camera.width / 2, this.camera.height / 2]);
        } else {
            this.grab = this.findGrab(xy);
        }
        this.publish("god", "startDrag");
    }

    drag(event) {
        const xy = event.xy;
        if (this.grab) {
            const look = this.camera.viewLookRay(...xy);
            const elevation = translation[2] - this.grab[2];
            const offset = v3_scale([look[0]/look[2], look[1]/look[2],1], elevation);
            translation = v3_add(this.grab, offset);
            this.updateCamera();
        } else if (this.pivot) {
            const x = xy[0];
            const angle = (x - this.lastX) / -500;
            this.spinCamera(this.pivot, angle);
            this.lastX = x;
            this.updateCamera();
        }
    }

    endDrag(event) {
        this.grab = null;
        this.pivot = null;
        this.publish("god", "endDrag");
    }

    findGrab(xy) {
        const pick = PickEmptyVoxel(xy);
        let xyz;
        if (pick) {
            xyz = pick.intersect;
        } else {
            xyz = PickBase(xy);
        }
        if (!xyz) return null;
        return v3_multiply(xyz, Voxels.scale);
    }

    doubleStart(xy) {
        this.startFOV = fov;
    }

    doubleChanged(data) {
        if (!this.startFOV) return;
        this.setFOV(this.startFOV * 1/(data.zoom));
    }

    wheelZoom(y) {
        this.setFOV(fov + y / 4000);
    }

    setFOV(angle) {
        fov = Math.max(toRad(5), Math.min(toRad(60), angle));
        this.camera.setFOV(fov)
    }

    updateCamera() {
        const p = q_axisAngle([1,0,0], pitch);
        const y = q_axisAngle([0,0,1], yaw);
        this.camera.setLocation(m4_scaleRotationTranslation(1, q_multiply(p,y), translation));
    }

    spinCamera(pivot, angle) {
        const center = m4_translation(pivot);
        const rotation = m4_rotationZ(angle);
        const invert = m4_translation(v3_scale(pivot, -1));
        const m = m4_multiply(m4_multiply(invert,rotation), center);
        translation = v3_transform(translation, m);
        yaw = (yaw + angle) % TAU;
    }

    update(time, delta) {
    }
}

