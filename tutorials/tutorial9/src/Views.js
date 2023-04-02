// Tutorial 9 Views

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, ThreeInstanceManager, PM_ThreeInstanced, ThreeRaycast, PM_ThreeCollider,
    PM_Avatar, v3_scale, v3_add, q_multiply, q_axisAngle, v3_rotate, v3_sub, PM_NavGridGizmo } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("cyanBox");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// ClickPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ClickPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.useInstance("magentaBox");
        this.addRenderObjectToRaycast();
    }

}
ClickPawn.register("ClickPawn");

//------------------------------------------------------------------------------------------
// BlockPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BlockPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.useInstance("yellowBox");
        this.addRenderObjectToRaycast();
    }

}
BlockPawn.register("BlockPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// We added the PM_NavGridGizmo mixin to BasePawn. It lets us display a graphic that shows
// nav grid. By default it's hidden, but you can toggle it on and off by pressing "g".

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider, PM_NavGridGizmo) {
    constructor(actor) {
        super(actor);

        const size = this.actor.gridSize * this.actor.gridScale;
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.geometry = new THREE.PlaneGeometry(size,size);
        this.geometry.rotateX(toRad(-90));
        this.geometry.translate(size/2,0,size/2);

        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
        this.addRenderObjectToRaycast();

        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "gDown", this.toggleGizmo);
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    doPointerDown(e) {
        if (e.button === 2) return;
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(e.xy);
        if (hits.length<1) return;
        const pawn = hits[0].pawn;
        const xyz = v3_sub(hits[0].xyz, this.translation);

        if (pawn === this) {
            this.say("spawn", xyz)
        } else {
            pawn.say("kill");
        }
    }

    toggleGizmo() {
        this.gizmo.visible = !this.gizmo.visible;
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// ColorPawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ColorPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);

        this.listen("colorSet", this.onColorSet)
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

}
ColorPawn.register("ColorPawn");

//------------------------------------------------------------------------------------------
// BotPawn ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// BotPawn is like the previous tut0rial's AvatarPawn. It sets the color of the bot
// according to the user using it. The only subscription in drive and park are to the
// right mouse click that sets the bot new destination.

export class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar) {

    constructor(actor) {
        super(actor);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 1, 1, 2 );
        this.geometry.translate(0,0.5,0);
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);

        this.listen("colorSet", this.onColorSet)
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

    drive() {
        this.driving = false;
        this.subscribe("input", "pointerDown", this.doPointerDown);
    }

    park() {
        this.unsubscribe("input", "pointerDown", this.doPointerDown);
    }

    doPointerDown(e) {
        if (e.button === 0) return;
        this.goto(e.xy);
    }

    goto(xy) {
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(xy);
        if (hits.length<1) return;
        const xyz = hits[0].xyz;
        this.say("goto",xyz);
    }

}
BotPawn.register("BotPawn");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildLights();
        this.buildCamera();
        this.buildInstances();
    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 90;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100
        sun.shadow.camera.right = 100
        sun.shadow.camera.top = 100
        sun.shadow.camera.bottom = -100

        rm.scene.add(ambient);
        rm.scene.add(sun);
    }

    buildCamera() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], toRad(-45))
        const yawMatrix = m4_rotation([0,1,0], toRad(-30))

        let cameraMatrix = m4_translation([0,0,100]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);

        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = 60;
        rm.camera.updateProjectionMatrix();
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  yellow = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const  magenta = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        const  cyan = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );

        im.addMaterial("yellow", yellow);
        im.addMaterial("magenta", magenta);
        im.addMaterial("cyan", cyan);

        const box = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("box", box);

        const big = new THREE.BoxGeometry( 2, 2, 2 );
        im.addGeometry("big", big);

        const mesh0 = im.addMesh("yellowBox", "big", "yellow");
        const mesh1 = im.addMesh("magentaBox", "box", "magenta");
        const mesh2 = im.addMesh("cyanBox", "box", "cyan");

        mesh0.castShadow = true;
        mesh1.castShadow = true;
        mesh2.castShadow = true;
    }

}