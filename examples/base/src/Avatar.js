import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    AM_Player, PM_Player, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, PM_ThreeCamera, toRad, THREE,
    q_axisAngle,
    TextWidgetActor, ButtonWidgetActor, GetViewService, UIManager, ButtonWidget, TextWidget, Widget, AM_Smoothed, PM_Smoothed, PM_Driver, v3_scale, v3_add, TAU, v3_rotate, v3_rotateY, toDeg, q_multiply, m4_multiply, m4_scaleRotationTranslation, q_identity, MenuWidget3, q_isZero, PM_WidgetPointer } from "@croquet/worldcore";


//------------------------------------------------------------------------------------------
//-- Avatar --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Avatar extends mix(Actor).with(AM_Smoothed) {

    // init(options) {
    //     super.init(options);
    //     this.listen("ooo", this.ooo);
    //     this.listen("ppp", this.ppp);
    // }

    get pawn() {return AvatarPawn}
    get driver() { return this._driver} // The user that is controlling this avatar.

    // ooo() {
    //     console.log("left");
    //     this.set({translation: [-3,0,0]});
    // }

    // ppp() {
    //     console.log("right");
    //     this.set({translation: [3,0,0]});
    //     // this.translateTo([3,0,0]);
    // }

}
Avatar.register('Avatar');

//------------------------------------------------------------------------------------------
//-- AvatarPawn ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_WidgetPointer ) {

    constructor(actor) {
        super(actor);
        console.log("AvatarPawn");

        this.fore = this.back = this.left = this.right = this.pitch = this.yaw = 0;
        this.speed = 5;
        this.turnSpeed = 0.002;

        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,0)} );
        const cube = new THREE.Mesh( this.geometry, this.material );
        this.setRenderObject(cube);
        this.refreshDrawTransform();

        this.listenOnce("driverSet", this.onDriverSet);


        this.drive();

    }

    destroy() { // When the pawn is destroyed, we dispose of our Three.js objects.
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }


    get isMyAvatarPawn() {
        if (this.actor && this.actor.driver) return this.actor.driver.userId === this.viewId;
        return false;

    }

    onDriverSet(e) {
        this.park();
        this.drive();
    }

    drive() {
        if (!this.isMyAvatarPawn) return;
        this.driving = true;
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.listen("lookGlobalChanged", this.refreshCamera);
        this.listen("viewGlobalChanged", this.refreshCamera);
        this.refreshCamera();
    }

    park() {
        this.driving = false;
        this.unsubscribe("input", "pointerDown", this.doPointerDown);
        this.unsubscribe("input", "pointerUp", this.doPointerUp);
        this.unsubscribe("input", "pointerDelta", this.doPointerDelta);
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
    }

    keyDown(e) {
        if (this.focused) return;
        switch(e.key) {
            case "ArrowUp":
            case "w":
                this.fore = 1; break;
            case "ArrowDown":
            case "s":
                this.back = 1; break;
            case "ArrowLeft":
            case "a":
                this.left = 1; break;
            case "ArrowRight":
            case "d":
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


    get velocity() {
        return [ (this.left - this.right), 0,  (this.fore - this.back)];
    }

    update(time, delta) {
        super.update(time,delta);
        if(this.driving) {
            const yawQ = q_axisAngle([0,1,0], this.yaw);
            const v = v3_scale(this.velocity, -this.speed * delta/1000)
            const v2 = v3_rotate(v, yawQ);
            const t = v3_add(this.translation, v2)
            if( v !== 0 || this.yawDelta !== 0) this.positionTo(t, yawQ);
        }


    }

    doPointerDown(e) {
        if (e.button === 2) this.service("InputManager").enterPointerLock();;
    }

    doPointerUp(e) {
        if (e.button === 2) this.service("InputManager").exitPointerLock();
    }

    doPointerDelta(e) {
        if (this.service("InputManager").inPointerLock) {
            this.yawDelta = (-this.turnSpeed * e.xy[0]) % TAU;
            this.pitchDelta = (-this.turnSpeed * e.xy[1]) % TAU;
            this.yaw += this.yawDelta;
            this.pitch += this.pitchDelta;
            this.pitch = Math.max(-Math.PI/2, this.pitch);
            this.pitch = Math.min(Math.PI/2, this.pitch);
        };
    }

    get lookGlobal() {
        const pitchQ = q_axisAngle([1,0,0], this.pitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);
        const lookQ = q_multiply(pitchQ, yawQ);

        const local =  m4_scaleRotationTranslation(this.scale, lookQ, this.translation)
        let global = local;
        if (this.parent && this.parent.global) global = m4_multiply(local, this.parent.global);

        return global;
    }

    refreshCamera() {
        const render = this.service("ThreeRenderManager");
        render.setCameraTransform(this.lookGlobal);
    }

}