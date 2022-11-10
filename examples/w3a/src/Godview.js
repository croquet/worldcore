import { WorldcoreView, Pawn, mix, m4_rotationX, toRad, m4_scaleRotationTranslation, q_axisAngle, PM_WidgetPointer, v2_sub, Constants, q_multiply, TAU, v3_scale, v3_add, v3_normalize, v3_rotate, v3_magnitude, THREE, viewRoot, v3_sub, v3_floor, PM_ThreeVisible, Widget2, CanvasWidget2, ToggleWidget2, ToggleSet2, ImageWidget2, SliderWidget2 } from "@croquet/worldcore";
import { Voxels} from  "./Voxels";

let time0 = 0;
let time1 = 0;
let fov = 60;

// import diana from "../assets/diana.jpg";
import fillOffIcon from "../assets/fillOffIcon.png";
import fillOnIcon from "../assets/fillOnIcon.png";
import digOffIcon from "../assets/digOffIcon.png";
import digOnIcon from "../assets/digOnIcon.png";
import treeOffIcon from "../assets/treeOffIcon.png";
import treeOnIcon from "../assets/treeOnIcon.png";
import clearOffIcon from "../assets/clearOffIcon.png";
import clearOnIcon from "../assets/clearOnIcon.png";
import baseOffIcon from "../assets/baseOffIcon.png";
import baseOnIcon from "../assets/baseOnIcon.png";
import sheepOffIcon from "../assets/sheepOffIcon.png";
import sheepOnIcon from "../assets/sheepOnIcon.png";
import walkOffIcon from "../assets/walkOffIcon.png";
import walkOnIcon from "../assets/walkOnIcon.png";

//------------------------------------------------------------------------------------------
//-- Widgets -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class ImageToggleWidget2 extends ToggleWidget2 {

    buildDefault() {
        this.frame = new CanvasWidget2({parent: this, autoSize: [1,1], color: [0.5,0.5,0.5]});
        this.label = new ImageWidget2({parent: this.frame, autoSize: [1,1], border: [2.5, 2.5, 2.5, 2.5], color: [0.6,0.6,0.6], url: this.offURL});
    }

    get offURL() {return this._offURL}
    get onURL() {return this._onURL}

    onHover() {
        this.frame.set({color: [0.4,0.4,0.4]});
    }

    onPress() {
        this.frame.set({color: [0.8,0.8,0.8]});
    }

    onNormal() {
        this.frame.set({color: [0.6,0.6,0.6]});
    }

    onToggle() {
        this.isOn ? this.label.set({url: this.onURL}) : this.label.set({url: this.offURL});
    }
}


//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let translation = [0,-100,100];
let pitch = toRad(45)
let yaw = toRad(0)

export class GodView extends mix(WorldcoreView).with(PM_WidgetPointer) {
    constructor(actor) {
        super(actor)

        console.log("GodView start!")
        // console.log(this.actor.userId);

        this.fore = 0;
        this.back = 0;
        this.right = 0;
        this.left = 0;

        this.buildHUD();
        this.moveSpeed = 0.1;
        this.turnSpeed = 0.002;

        this.updateCamera();

        this.subscribe("input", "wDown", this.foreDown);
        this.subscribe("input", "wUp", this.foreUp);
        this.subscribe("input", "sDown", this.backDown);
        this.subscribe("input", "sUp", this.backUp)

        this.subscribe("input", "dDown", this.rightDown);
        this.subscribe("input", "dUp", this.rightUp);
        this.subscribe("input", "aDown", this.leftDown);
        this.subscribe("input", "aUp", this.leftUp)

        this.subscribe("ui", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", 'wheel', this.onWheel);

        this.subscribe("input", 'zDown', this.zTest);
        this.subscribe("input", 'xDown', this.xTest);

    }

    destroy() {
        super.destroy();
    }

    zTest() {
        console.log("pause")
        this.isPaused = true;

    }

    xTest() {
        console.log("resume")
        this.isPaused = false;
    }

    buildHUD() {
        const wm = this.service("WidgetManager2");
        const hud = new Widget2({parent: wm.root, autoSize: [1,1]});
        const toggleSet = new ToggleSet2;
        const fillToggle = new ImageToggleWidget2({name: "fill", parent: hud, size:[30,30], translation: [15,15], toggleSet: toggleSet, offURL: fillOffIcon, onURL: fillOnIcon});
        const digToggle = new ImageToggleWidget2({name: "dig", parent: hud, size:[30,30], translation: [50,15], toggleSet: toggleSet, offURL: digOffIcon, onURL: digOnIcon});

        const baseToggle = new ImageToggleWidget2({name: "base", parent: hud, size:[30,30], translation: [15,50], toggleSet: toggleSet, offURL: baseOffIcon, onURL: baseOnIcon});
        const clearToggle = new ImageToggleWidget2({name: "clear", parent: hud, size:[30,30], translation: [50,50], toggleSet: toggleSet, offURL: clearOffIcon, onURL: clearOnIcon});

        const treeToggle = new ImageToggleWidget2({name: "tree", parent: hud, size:[30,30], translation: [15,85], toggleSet: toggleSet, offURL: treeOffIcon, onURL: treeOnIcon});
        const spawnToggle = new ImageToggleWidget2({name: "sheep", parent: hud, size:[30,30], translation: [50,85], toggleSet: toggleSet, offURL: sheepOffIcon, onURL: sheepOnIcon});

        const walkToggle = new ImageToggleWidget2({name: "walk", parent: hud, size:[30,30], translation: [15,120], toggleSet: toggleSet, offURL: walkOffIcon, onURL: walkOnIcon});

        this.subscribe(toggleSet.id, "pick", this.setEditMode);
        toggleSet.pick(fillToggle);

        const layerSlider = new SliderWidget2({name: "layerSlider", autoSize:[0,1], size: [10,0], parent: hud, anchor:[1,0.5], pivot:[1,0.5],})
    }

    setEditMode(mode) {
        this.editMode = mode;
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
        if (this.isPaused) return;
        if (e.button === 2) {
            this.service("InputManager").enterPointerLock();
        } else{
            this.raycast(e.xy);
            switch (this.editMode) {
                case "fill": this.onFill(); break;
                case "dig": this.onDig(); break;
                case "tree": this.onTree(); break;
                case "clear": this.onClear(); break;
                case "base": this.onBase(); break;
                case "sheep": this.onSpawnSheep(); break;
                case "walk": this.onSpawnPerson(); break;
            }

        };
    }

    doPointerUp(e) {
        if (e.button === 2) {
            this.service("InputManager").exitPointerLock();
        };
    }

    doPointerDelta(e) {
        if (this.isPaused) return;
        if (this.service("InputManager").inPointerLock) {
            yaw += (-this.turnSpeed * e.xy[0]) % TAU;
            pitch += (-this.turnSpeed * e.xy[1]) % TAU;
            pitch = Math.max(-Math.PI/2, pitch);
            pitch = Math.min(Math.PI/2, pitch);
            this.updateCamera();
        };
    }

    doPointerMove(e) {
        if (this.isPaused) return;
        this.raycast(e.xy);
    }

    raycast(xy) {
        const render = this.service("ThreeRenderManager");
        this.pointerHit = null

        if (!render) return;
        if (!viewRoot.mapView) return;

        const x = ( xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( xy[1] / window.innerHeight ) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x: x, y: y}, render.camera);
        const hits = raycaster.intersectObjects( viewRoot.mapView.collider );

        if (hits && hits[0]) {
            const p = hits[0].point;
            const xyz = [ p.x / Constants.scaleX, p.y / Constants.scaleY, p.z / Constants.scaleZ ];
            const voxel = v3_floor(xyz);
            const fraction = v3_sub(xyz,voxel);
            this.pointerHit = {xyz, voxel, fraction};

            const surfaces = this.modelService("Surfaces");
            // console.log(surfaces.elevation(...xyz));
        }
    }

    onFill() {
        if (!this.pointerHit) return;
        this.publish("edit", "setVoxel",{xyz: this.pointerHit.voxel, type: Constants.voxel.dirt});
    }

    onDig() {
        if (!this.pointerHit) return;
        const e = 0.001
        let xyz = [0,0,0];
        if (this.pointerHit.fraction[0]-e < 0) xyz = Voxels.adjacent(...this.pointerHit.voxel, [-1,0,0]);
        if (this.pointerHit.fraction[0]+e > 1) xyz = Voxels.adjacent(...this.pointerHit.voxel, [1,0,0]);
        if (this.pointerHit.fraction[1]-e < 0) xyz = Voxels.adjacent(...this.pointerHit.voxel, [0,-1,0]);
        if (this.pointerHit.fraction[1]+e > 1) xyz = Voxels.adjacent(...this.pointerHit.voxel, [0,1,0]);
        if (this.pointerHit.fraction[2]-e < 0) xyz = Voxels.adjacent(...this.pointerHit.voxel, [0,0,-1]);

        // Maybe also dig down if the voxels itself is currently empty
        if (Voxels.canEdit(...xyz)) this.publish("edit", "setVoxel",{xyz, type: Constants.voxel.air});
    }

    onTree() {
        if (!this.pointerHit) return;
        this.publish("edit", "plantTree",{xyz: this.pointerHit.voxel});
    }

    onSpawnSheep() {
        if (!this.pointerHit) return;
        this.publish("edit", "spawnSheep",{xyz: this.pointerHit.voxel, driverId: this.viewId});
    }

    onSpawnPerson() {
        if (!this.pointerHit) return;
        this.publish("edit", "spawnPerson",{xyz: this.pointerHit.voxel, driverId: this.viewId});
    }

    onClear() {
        if (!this.pointerHit) return;
        this.publish("edit", "clear",{xyz: this.pointerHit.voxel});
    }

    onBase() {
        if (!this.pointerHit) return;
        this.publish("edit", "buildBase",{xyz: this.pointerHit.voxel});
    }

    onWheel(data) {
        if (this.isPaused) return;
        const render = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(80, fov + data.deltaY / 100));
        render.camera.fov = fov;
        render.camera.updateProjectionMatrix();
    }

    updateCamera() {
        if (this.isPaused) return;
        const render = this.service("ThreeRenderManager");

        const pitchQ = q_axisAngle([1,0,0], pitch);
        const yawQ = q_axisAngle([0,0,1], yaw);
        const lookQ = q_multiply(pitchQ, yawQ);
        this.rotation = lookQ;

        const cameraMatrix = m4_scaleRotationTranslation([1,1,1], this.rotation, translation);
        render.camera.matrix.fromArray(cameraMatrix);
        render.camera.matrixAutoUpdate = false;
        render.camera.matrixWorldNeedsUpdate = true;
    }

    update(time) {
        time0 = time1;
        time1 = time;
        if (this.isPaused) return;
        const delta = time1 - time0;

        const yawQ = q_axisAngle([0,0,1], yaw);
        let forward = [0,0,0];
        const v = v3_rotate([this.right + this.left, this.fore + this.back,0], yawQ);
        if (v3_magnitude(v)) forward = v3_normalize(v);
        const move = v3_scale(forward, delta * this.moveSpeed);
        translation = v3_add(translation,move)
        this.updateCamera();
    }

}