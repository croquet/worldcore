import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, PM_ThreeCamera, toRad, THREE,
    q_axisAngle, TextWidgetActor, ButtonWidgetActor, GetViewService, UIManager, ButtonWidget, TextWidget, Widget, AM_Smoothed, PM_Smoothed, PM_Driver, v3_scale, v3_add, TAU, v3_rotate, v3_rotateY, toDeg, q_multiply, m4_multiply, m4_scaleRotationTranslation, q_identity, MenuWidget3, q_isZero, WorldcoreView, viewRoot, m4_translation, m4_rotationQ, v3_magnitude, v3_normalize} from "@croquet/worldcore";

//-----------------------------------------------------------------------------------------
//-- Utilities-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------

// Caps a vector to a magnitude.

export function v3_cap(v, s) {
    const m = v3_magnitude(v);
    if (m < s) return v;
    let n = [0,0,0];
    if (m > 0) n = [v[0]/m, v[1]/m, v[2]/m];
    return v3_scale(n, s);
}

//------------------------------------------------------------------------------------------
//-- Avatar --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Avatar extends mix(Actor).with(AM_Smoothed) {

    get pawn() {return AvatarPawn}
    get driver() { return this._driver} // The user that is controlling this avatar.

}
Avatar.register('Avatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible ) {

    constructor(actor) {
        super(actor);
        this.listenOnce("driverSet", this.onDriverSet);
        this.drive();
    }

    get isMyAvatarPawn() {
        if (this.actor && this.actor.driver) return this.actor.driver.userId === this.viewId;
        return false;

    }

    onDriverSet(e) {
        this.park();
        this.drive();
    }
}

//------------------------------------------------------------------------------------------
//-- BallAvatar ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BallAvatar extends Avatar {

    get pawn() {return BallPawn}

}
BallAvatar.register('BallAvatar');


//------------------------------------------------------------------------------------------
//-- BallPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BallPawn extends AvatarPawn {

    constructor(actor) {
        super(actor);

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,0)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);

        this.fore = this.back = this.left = this.right = this.pitch = this.yaw = 0;
        this.thrust = 5;        // Acceleration when you press an arrow.
        this.spin = 0.002;      // Yaw mouse sensitivity
        this.drag = 0.1;        // Velocity decay every frame
        this.velocity = [0,0,0]
        this.maxVelocity = 1;   // Top speed
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    drive() {
        if (!this.isMyAvatarPawn) return;
        this.driving = true;
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.listen("viewGlobalChanged", this.refreshCamera);
        this.camera = new AvatarCamera(this);
        this.refreshCamera();
    }

    park() {
        this.driving = false;
        this.unsubscribe("input", "pointerDelta", this.doPointerDelta);
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
        if (this.camera) this.camera.destroy();
    }

    keyDown(e) {
        if (this.focused) return;
        switch(e.key) {
            case "ArrowUp":case "w":
                this.fore = 1; break;
            case "ArrowDown": case "s":
                this.back = 1; break;
            case "ArrowLeft": case "a":
                this.left = 1; break;
            case "ArrowRight": case "d":
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

    get acceleration() {
        return [ this.thrust *(this.right - this.left), 0,  this.thrust *(this.back-this.fore)];
    }

    update(time, delta) {
        super.update(time,delta);
        if(this.driving) {
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const a0 = v3_scale(this.acceleration, delta/1000) // scale acceleration by frame duration
            const a1 = v3_rotate(a0, yawQ); // rotate acceleration based on facing
            const v0 = v3_scale(this.velocity, 1-this.drag); // Drag
            const v1 = v3_add(v0, a1);
            this.velocity = v3_cap(v1, this.maxVelocity);
            const t = v3_add(this.translation, this.velocity)
            this.positionTo(t, yawQ);
        }
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yaw += (-this.spin * e.xy[0]) % TAU;
        };
    }

    refreshCamera() {
        if (this.camera) this.camera.refresh();
    }

}

//------------------------------------------------------------------------------------------
//-- AvatarCamera --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarCamera extends WorldcoreView {

    constructor(avatarPawn) {
        super(viewRoot.model);

        this.pawn =  avatarPawn;
        this.lead = 2;
        this.pitch = toRad(-30);
        this.zoom = 10;

    }


    refresh() {
        const render = this.service("ThreeRenderManager");

        const lead = m4_translation([0,0,-this.lead]);                  // Look point ahead of the ball.
        const pitch = m4_rotationQ(q_axisAngle([1,0,0], this.pitch));   // Camera pitch
        const zoom = m4_translation([0,0,this.zoom]);                   // Distance from look point

        const m0 = this.pawn.global;
        const m1 = m4_multiply(lead, m0);
        const m2 = m4_multiply(pitch, m1);
        const m3 = m4_multiply(zoom, m2);

        render.setCameraTransform(m3);
    }
}
