import { WorldcoreView, mix, m4_rotationX, toRad, m4_scaleRotationTranslation, q_axisAngle, PM_WidgetPointer, v2_sub, Constants, q_multiply, TAU, v3_scale, v3_add, v3_normalize, v3_rotate, v3_magnitude, THREE, viewRoot, v3_sub, v3_floor, PM_ThreeVisible, Widget2, CanvasWidget2, ToggleWidget2, ToggleSet2, ImageWidget2, SliderWidget2 } from "@croquet/worldcore";
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


export class GodView extends mix(WorldcoreView).with(PM_WidgetPointer) {
    constructor(model) {
        super(model)

        this.fore = 0;
        this.back = 0;
        this.right = 0;
        this.left = 0;

        this.buildHUD();
        this.moveSpeed = 0.1;
        this.turnSpeed = 0.002;

        this.pitch = toRad(45)
        this.yaw = toRad(-90)
        this.yaw = toRad(0)

        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,0,1], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);

        const xxx = Constants.scaleX * Constants.sizeX / 2;
        this.translation = [0,-100,100];
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

        this.subscribe("ui", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", 'wheel', this.onWheel);

        this.subscribe("input", 'zDown', this.onFill);
        this.subscribe("input", 'xDown', this.onDig);

    }

    destroy() {
        super.destroy();
    }

    buildHUD() {
        const wm = this.service("WidgetManager2");
        const hud = new Widget2({parent: wm.root, autoSize: [1,1]});
        const toggleSet = new ToggleSet2;
        const fillToggle = new ImageToggleWidget2({name: "fill", parent: hud, size:[30,30], translation: [15,15], toggleSet: toggleSet, offURL: fillOffIcon, onURL: fillOnIcon});
        const digToggle = new ImageToggleWidget2({name: "dig", parent: hud, size:[30,30], translation: [50,15], toggleSet: toggleSet, offURL: digOffIcon, onURL: digOnIcon});
        const treeToggle = new ImageToggleWidget2({name: "tree", parent: hud, size:[30,30], translation: [15,50], toggleSet: toggleSet, offURL: treeOffIcon, onURL: treeOnIcon});
        const clearToggle = new ImageToggleWidget2({name: "clear", parent: hud, size:[30,30], translation: [50,50], toggleSet: toggleSet, offURL: clearOffIcon, onURL: clearOnIcon});
        const baseToggle = new ImageToggleWidget2({name: "base", parent: hud, size:[30,30], translation: [15,85], toggleSet: toggleSet, offURL: baseOffIcon, onURL: baseOnIcon});

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
        if (e.button === 2) {
            this.service("InputManager").enterPointerLock();
        } else{
            this.raycast(e.xy);
            switch (this.editMode) {
                case "fill": this.onFill(); break;
                case "dig": this.onDig(); break;
                case "tree": this.onTree(); break;
                case "clear": this.onClear(); break;
            }

        };
    }

    doPointerUp(e) {
        if (e.button === 2) {
            this.service("InputManager").exitPointerLock();
        } else{

        };
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

    doPointerMove(e) {
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

        if (Voxels.canEdit(...xyz)) this.publish("edit", "setVoxel",{xyz, type: Constants.voxel.air});
    }

    onTree() {
        if (!this.pointerHit) return;
        console.log("Plant tree: " +  this.pointerHit.voxel);
        this.publish("edit", "plantTree",{xyz: this.pointerHit.voxel});
    }

    onClear() {
        if (!this.pointerHit) return;
        console.log("Clear: " +  this.pointerHit.voxel);
        this.publish("edit", "clear",{xyz: this.pointerHit.voxel});
    }

    onWheel(data) {
        const render = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(80, fov + data.deltaY / 100));
        render.camera.fov = fov;
        render.camera.updateProjectionMatrix();
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
        time0 = time1;
        time1 = time;
        const delta = time1 - time0;

        const yawQ = q_axisAngle([0,0,1], this.yaw);
        let forward = [0,0,0];
        const v = v3_rotate([this.right + this.left, this.fore + this.back,0], yawQ);
        if (v3_magnitude(v)) forward = v3_normalize(v);
        const move = v3_scale(forward, delta * this.moveSpeed);
        this.translation = v3_add(this.translation,move)
        this.updateCamera();
    }

}