// Drive Views

// All the code specific to this tutorial is in the definition of AvatarPawn.

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, ThreeInstanceManager, PM_ThreeInstanced, ThreeRaycast, PM_ThreeCollider,
    PM_Avatar, v3_scale, v3_add, q_multiply, q_axisAngle, v3_rotate, PM_ThreeCamera, q_yaw, q_pitch, q_slerp, v3_lerp, v3_transform, m4_rotationQ, ViewService,
    v3_distance, v3_dot, v3_sub, PerlinNoise } from "@croquet/worldcore";

const perlin2D = function(){
    const perlin = new PerlinNoise();
    const perlinScale = 0.01;
    const perlinHeight = 100;
    return function(x,y){return perlinHeight * perlin.signedNoise2D(perlinScale*x, perlinScale*y);}
}();

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
// BollardPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BollardPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("pole");
        this.service("CollisionManager").colliders.add(this);
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

}
BollardPawn.register("BollardPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        let worldX = 512, worldZ=512;
        let worldX2 = worldX/2, worldZ2=worldZ/2;
        let worldScale = 2;
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.geometry = new THREE.PlaneGeometry(worldX*worldScale,worldZ*worldScale,worldX,worldZ);
        this.geometry.rotateX(toRad(-90));
        
        const vertices = this.geometry.attributes.position.array;
        for(let i=0; i < worldX-1; i++)
            for(let j=0; j < worldZ-1; j++){
                vertices[i*worldX*3+j*3+1]=perlin2D((i-worldX2)*worldScale, (j-worldZ2)*worldScale);
            }
        this.geometry.computeVertexNormals();
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;

        this.setRenderObject(base);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
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

        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

}
ColorPawn.register("ColorPawn");

//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar, PM_ThreeCamera) {

    constructor(actor) {
        super(actor);
        this.yaw = q_yaw(this.rotation);
        this.chaseTranslation = [0,10,20];
        this.chaseRotation = q_axisAngle([1,0,0], toRad(-5));

        this.velocity = [0,0,0];
        this.speed = 0;

        this.service("CollisionManager").colliders.add(this);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 2, 1, 3.5 );
        this.geometry.translate(0,0.5,0);
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);

        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

    drive() {
        this.gas = this.brake = 0;
        this.left = this.right = 0;
        this.steer = 0;
        this.speed = 0;
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerMove", this.doPointerMove);
    }

    park() {
        this.gas = this.brake = 0;
        this.left = this.right = 0;
        this.steer = 0;
        this.speed = 0;
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
        // this.unsubscribe("input", "pointerMove", this.doPointerMove);
    }

    keyDown(e) {
        switch (e.key) {
            case "w":
                this.gas = 1; break;
            case "s":
                this.brake = 1; break;
            case "a":
                this.left = 1; break;
            case "d":
                this.right = 1; break;
            case "m":
                this.auto = !this.auto; break;
            default:
        }
    }

    keyUp(e) {
        switch (e.key) {
            case "w":
                this.gas = 0; break;
            case "s":
                this.brake = 0; break;
            case "a":
                this.left = 0; break;
            case "d":
                this.right = 0; break;
            default:
        }
    }

    doPointerMove(e) {
        const s = ( e.xy[0] / window.innerWidth ) * 2 - 1;
        this.steer = Math.max(-30,Math.min(30, s*15));
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            const wheelbase = 3.5;
            const factor = delta/1000;

            this.speed = (this.gas-this.brake) * 10 * factor;
            this.steer = (this.right-this.left) * 5;
            if (this.auto) {
                this.speed = 5 * factor;
                this.steer = -5;
            }

            const angularVelocity = -this.speed/10 * Math.sin(toRad(this.steer)) / wheelbase / factor;
            this.yaw += angularVelocity;
            const yawQ = q_axisAngle([0,1,0], this.yaw);

            this.velocity = [0, 0, -this.speed];
            const tt = v3_rotate(this.velocity, yawQ);
            const translation = v3_add(this.translation, tt);
            if (!this.collide(tt)) this.positionTo(translation, yawQ);
            this.updateChaseCam(time, delta);
        }
    }

    updateChaseCam(time, delta) {
        const rm = this.service("ThreeRenderManager");

        const pitch = toRad(-10);
        const offset = [0,10,20];

        let tTug = 0.2;
        let rTug = 0.2;

        if (delta) {
            tTug = Math.min(1, tTug * delta / 15);
            rTug = Math.min(1, rTug * delta / 15);
        }

        const pitchQ = q_axisAngle([1,0,0], pitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);

        const targetTranslation = v3_transform(offset, this.global);
        const targetRotation = q_multiply(pitchQ, yawQ);

        this.chaseTranslation = v3_lerp(this.chaseTranslation, targetTranslation, tTug);
        this.chaseRotation = q_slerp(this.chaseRotation, targetRotation, rTug);

        const ttt = m4_translation(this.chaseTranslation);
        const rrr = m4_rotationQ(this.chaseRotation);
        const mmm = m4_multiply(rrr, ttt);
        rm.camera.matrix.fromArray(mmm);
        rm.camera.matrixWorldNeedsUpdate = true;
    }

    collide(velocity) {
        const colliders = this.service("CollisionManager").colliders;
        for (const collider of colliders) {
            if (collider === this) continue;
            const distance = v3_distance(collider.translation, this.translation);
            if (distance < 3.5) {
                if ( collider.actor.tags.has("bollard")) {
                    const from = v3_sub(this.translation, collider.translation);
                    const dot = v3_dot(from, velocity);
                    if (dot<-0.5) {
                        console.log("stop!");
                        return true;
                    }
                }

                if ( collider.actor.tags.has("avatar")) {
                    if (distance < 3) {
                        console.log("bump!");
                        console.log("me: " + this.actor.id + " other: "+ collider.actor.id);
                        const from = v3_sub(this.translation, collider.translation);
                        const bounce = v3_scale(from, 0.2);
                        const translation = v3_add(this.translation, bounce);
                        this.translateTo(translation);
                        return true;
                    }
                }

            }
        }
        return false;
    }

}
AvatarPawn.register("AvatarPawn");

//------------------------------------------------------------------------------------------
//-- CollisionManager ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class CollisionManager extends ViewService {

    constructor() {
        super("CollisionManager");
        this.colliders = new Set();
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, ThreeInstanceManager, CollisionManager];
    }

    onStart() {
        this.buildLights();
        // this.buildCamera();
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
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;

        rm.scene.add(ambient);
        rm.scene.add(sun);
    }

    buildCamera() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], toRad(-45));
        const yawMatrix = m4_rotation([0,1,0], toRad(-30));

        let cameraMatrix = m4_translation([0,0,50]);
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

        const cylinder = new THREE.CylinderGeometry(0.2, 0.2, 1.5);
        cylinder.translate(0,0.75,0);
        im.addGeometry("cylinder", cylinder);

        const mesh0 = im.addMesh("yellowBox", "box", "yellow");
        const mesh1 = im.addMesh("magentaBox", "box", "magenta");
        const mesh2 = im.addMesh("cyanBox", "box", "cyan");
        const mesh3 = im.addMesh("pole", "cylinder", "yellow");

        mesh0.castShadow = true;
        mesh1.castShadow = true;
        mesh2.castShadow = true;
        mesh3.castShadow = true;
    }

}
