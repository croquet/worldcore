import { GetNamedView, NamedView, m4_scaleRotationTranslation, m4_translation, q_axisAngle, v3_scale, v3_add, v3_multiply, q_multiply,
    toRad, TAU, KeyDown, v3_transform, m4_rotationZ, m4_multiply, toDeg, DepthTexture, GetViewRoot, viewRoot, ViewService, GetViewService } from "@croquet/worldcore-kernel";
import { GetTopLayer } from "./Globals";
import { PickGrabSurface  } from "./VoxelRaycast";
import { Voxels } from "./Voxels";

// Manages the camera and navigation pointer events.

let translation = [Voxels.sizeX * Voxels.scaleX / 2, 0,(Voxels.sizeZ+10) * Voxels.scaleZ ];
let pitch = toRad(45);
let yaw = toRad(0);
let fov = toRad(60);

export class GodView extends ViewService {
    constructor() {
        super("GodView");

        this.camera = this.service("RenderManager").camera;
        this.updateCamera();

        this.subscribe("ui", 'pointerDown', this.onPointerDown);
        this.subscribe("ui", 'pointerUp', this.onPointerUp);
        this.subscribe("ui", 'pointerMove', this.onPointerMove);
        this.subscribe("input", "zoomStart", this.onZoomStart);
        this.subscribe("input", "zoomEnd", this.onZoomEnd);
        this.subscribe("input", "zoomUpdate", this.onZoomUpdate);
        this.subscribe("input", 'wheel', this.onWheel);
        // this.subscribe("hud", "firstPerson", this.onFirstPerson); // xxx hack for fp camera sync
        this.subscribe("voxels", "newLevel", this.onNewLevel);

    }

    onPointerDown(data) {
        const xy = data.xy;
        if (KeyDown('Shift') || data.button === 2) {
            this.lastX = xy[0];
            this.pivot = this.findGrab([this.camera.width / 2, this.camera.height / 2]);
        } else {
            this.grab = this.findGrab(xy);
        }
    }

    onPointerUp(data) {
        this.lastX = null;
        this.pivot = null;
        this.grab = null;
    }

    onPointerMove(data) {
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
        this.inZoom = true;
        const mid = data.mid;
        this.startFOV = fov;
        this.startYaw = yaw;
        this.grab = this.findGrab(mid);
    }

    onZoomEnd(data) {
        this.inZoom = false;
    }

    onZoomUpdate(data) {
        if (!this.inZoom) return;
        const zoom = data.zoom;
        const dial = data.dial;
        const mid = data.mid;

        this.setFOV(this.startFOV * 1/zoom);
        const look = this.camera.viewLookRay(...mid);
        const elevation = translation[2] - this.grab[2];
        const offset = v3_scale([look[0]/look[2], look[1]/look[2],1], elevation);
        translation = v3_add(this.grab, offset);
        yaw = this.startYaw-dial;
        this.updateCamera();
    }

    onWheel(data) {
        this.setFOV(fov + data / 2000);
    }

    onFirstPerson(fp) {
        this.firstPerson = fp;
        if (fp) {
            this.oldFOV = fov;
        } else {
            this.setFOV(this.oldFOV);
            this.updateCamera();
        }
    }

    onNewLevel() {
        // this.firstPerson = false; // xxx hack for fp camera sync
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
        const animals = this.modelService("Animals");
        // if (this.firstPerson) return; // xxx hack for fp camera sync
        if (animals.fp) return;
        const p = q_axisAngle([1,0,0], pitch);
        const y = q_axisAngle([0,0,1], yaw);
        this.camera.setLocation(m4_scaleRotationTranslation(1, q_multiply(p,y), translation));
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
        const animals = this.modelService("Animals");
        if (animals.fp && animals.vip) {
        // if (this.firstPerson && animals.vip) { // xxx hack for fp camera sync
            this.setFOV(toRad(80));
            const pm = this.service("PawnManager");
            const pawn = pm.get(animals.vip.id);
            const p = q_axisAngle([1,0,0], toRad(90));
            const r = q_multiply(p,pawn.rotation);
            const t = v3_add([0, 0, 2], pawn.translation);
            this.camera.setLocation(m4_scaleRotationTranslation(1, r, t));
        }
        else {
            this.updateCamera();
        }
    }
}