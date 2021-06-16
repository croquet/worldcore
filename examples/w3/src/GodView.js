import { GetNamedView, NamedView, m4_scalingRotationTranslation, m4_translation, q_axisAngle, v3_scale, v3_add, v3_multiply, q_multiply,
    toRad, TAU, KeyDown, v3_transform, m4_rotationZ, m4_multiply } from "@croquet/worldcore";
import { GetTopLayer } from "./Globals";
import { PickGrabSurface  } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

let translation = [Voxels.sizeX * Voxels.scaleX / 2, -20,(Voxels.sizeZ+10) * Voxels.scaleZ ];
let pitch = toRad(45);
let yaw = toRad(0);
let fov = toRad(60);

export class GodView extends NamedView {
    constructor(model) {
        super("GodView", model);

        this.camera = GetNamedView('ViewRoot').render.camera;
        this.updateCamera();

        this.subscribe("input", 'pointerDown', this.onPointerDown);
        this.subscribe("input", 'pointerUp', this.onPointerUp);
        this.subscribe("input", 'pointerMove', this.onPointerMove);
        this.subscribe("input", "zoomStart", this.onZoomStart);
        this.subscribe("input", "zoomEnd", this.onZoomEnd);
        this.subscribe("input", "zoomStart", this.onZoomUpdate);
        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("hud", "firstPerson", this.onFirstPerson);
        this.subscribe("voxels", "newLevel", this.onNewLevel);

    }

    onPointerDown(data) {
        if (data.type === 'mouse' && data.button !== 2) return;
        const xy = data.xy;
        if (KeyDown('Shift') || xy[1] > (this.camera.height - 150)) {
            this.lastX = xy[0];
            this.pivot = this.findGrab([this.camera.width / 2, this.camera.height / 2]);
        } else {
            this.grab = this.findGrab(xy);
        }
    }

    onPointerUp(data) {
        if (data.type === 'mouse' && data.button !== 2) return;
        this.lastX = null;
        this.pivot = null;
        this.grab = null;
    }

    onPointerMove(data) {
        if (this.startFOV) return;
        const xy = data.xy;
        if (this.grab) {
            const look = this.camera.viewLookRay(...xy);
            const elevation = translation[2] - this.grab[2];
            const offset = v3_scale([look[0]/look[2], look[1]/look[2],1], elevation);
            translation = v3_add(this.grab, offset);
            this.updateCamera();
        } else if (this.pivot) {
            const x = xy[0];
            const angle = (x - this.lastX) / -500;
            this.findSpin(this.pivot, angle);
            this.lastX = x;
            this.updateCamera();
        }
    }

    onZoomStart(data) {
        const zoom = data.zoom;
        const mid = data.mid;
        this.startFOV = fov;
    }

    onZoomEnd(data) {
        delete this.startFOV;
    }

    onZoomUpdate(data) {
        if (!this.startFOV) return;
        const zoom = data.zoom;
        const mid = data.mid;
        this.setFOV(this.startFOV * 1/zoom);
    }

    onWheel(data) {
        this.setFOV(fov + data / 2000);
    }

    onFirstPerson(fp) {
        this.firstPerson = fp;
        if (!fp) this.updateCamera();
    }

    onNewLevel() {
        this.firstPerson = false;
        this.updateCamera();
    }

    setFOV(f) {
        fov = Math.max(toRad(10), Math.min(toRad(80), f));
        this.camera.setFOV(fov);
    }

    findGrab(xy) {
        const pick = PickGrabSurface(xy, GetTopLayer());
        if (!pick.xyz) return null;
        return v3_multiply(pick.intersect, Voxels.scale);
    }

    updateCamera() {
        if (this.firstPerson) return;
        const p = q_axisAngle([1,0,0], pitch);
        const y = q_axisAngle([0,0,1], yaw);
        this.camera.setLocation(m4_scalingRotationTranslation(1, q_multiply(p,y), translation));
    }

    findSpin(pivot, angle) {
        const center = m4_translation(pivot);
        const rotation = m4_rotationZ(angle);
        const invert = m4_translation(v3_scale(pivot, -1));
        const m = m4_multiply(m4_multiply(invert,rotation), center);
        translation = v3_transform(translation, m);
        yaw = (yaw + angle) % TAU;
    }

    update(time, delta) {
        const animals = this.wellKnownModel("Animals");
        if (this.firstPerson && animals.vip) {
            const pm = GetNamedView("PawnManager");
            const pawn = pm.get(animals.vip.id);
            const p = q_axisAngle([1,0,0], toRad(90));
            const r = q_multiply(p,pawn.rotation);
            const t = v3_add([0, 0, 2], pawn.translation);
            this.camera.setLocation(m4_scalingRotationTranslation(1, r, t));
        }
    }
}