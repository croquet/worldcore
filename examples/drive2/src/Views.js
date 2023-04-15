// Drive Views
//
// The majority of the code specific to this tutorial is in the definition of AvatarPawn.
// Demonstrates terrain following, avatar/object and avatar/avatar collisions.
// Uses a 2D Perlin noise function to generate terrain and to dynamically compute 
// the height of the terrain as the avatar moves.
//
// When an avatar collides with another avatar, a bounce event is sent to the collided
// avatar with a negative value for the bounce vector. The other avatar bounces away from
// the collision in the opposite direction of your avatar. 


import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, m4_scaleRotationTranslation, ThreeInstanceManager, PM_ThreeInstanced, ThreeRaycast, PM_ThreeCollider,
    PM_Avatar, v3_scale, v3_add, q_identity, q_equals, q_multiply, q_axisAngle, v3_rotate, v3_magnitude, PM_ThreeCamera, q_yaw, q_pitch, q_euler, q_slerp, v3_lerp, v3_transform, m4_rotationQ, ViewService,
    v3_distance, v3_dot, v3_sub, PerlinNoise } from "@croquet/worldcore";

// construct a perlin object and return a function that uses it
const perlin2D = function(perlinHeight = 50, perlinScale = 0.02){
    // the PerlinNoise constructor can take a seed value as an argument
    // this must be the same for all participants so it generates the same terrain.
    const perlin = new PerlinNoise();

    return function(x,y){
        return perlinHeight * perlin.signedNoise2D(perlinScale*x, perlinScale*y);
    }
}();

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        let t = this.translation;
        t[1]=perlin2D(t[0], t[2])+4;
        this.set({translation:t});
        this.useInstance("cyanBox");
    }

}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// BollardPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BollardPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("pole");
        this.service("CollisionManager").colliders.add(this);
        let t = this.translation;
        t[1]=perlin2D(t[0], t[2]);
        this.set({translation:t});
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

}
BollardPawn.register("BollardPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
// This is the ground of the world. We generate a simple plane of worldX by worldY in size 
// and compute the Perlin noise value at each x/z position to determine the height.
// We the renormalize the mesh vectors.
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(actor) {
        super(actor);
        let worldX = 512, worldZ=512;
        let cellSize = 2;
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.geometry = new THREE.PlaneGeometry(worldX*cellSize,worldZ*cellSize, worldX, worldZ);
        this.geometry.rotateX(toRad(-90));
        
        const vertices = this.geometry.attributes.position.array;

        for(let index=0; index < vertices.length; index+=3)
            vertices[index+1]=perlin2D(vertices[index], vertices[index+2]);

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
        this.service("CollisionManager").colliders.add(this);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 2, 2, 2 );
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
        this.wheelHeight = 0.5;
        this.velocity = [0,0,0];
        this.speed = 0;
        this.pitch = 0;
        this.service("CollisionManager").colliders.add(this);

        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.BoxGeometry( 2, 1, 3.5 );
        this.geometry.translate(0,0.5,0);
        const mesh = new THREE.Mesh( this.geometry, this.material );


        const mesh2 = new THREE.Mesh( 
            new THREE.BoxGeometry( 0.5, 0.5, 0.5 ),
            new THREE.MeshStandardMaterial( {color: new THREE.Color([1,1,1])} ));
        mesh2.position.set(0, 1.25, 1.5);
        mesh.add(mesh2);
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

    // If this is YOUR avatar, the AvatarPawn automatically calls this.drive() in the constructor. 
    // The drive() function sets up the user interface for the avatar. 
    // If this is not YOUR avatar, the park() function is called.
    drive() {
        console.log("DRIVE");
        this.gas = this.brake = 0;
        this.left = this.right = 0;
        this.steer = 0;
        this.speed = 0;
        this.highGear = 1;
        this.usePointer = false;
        this.lastPitchQ = q_identity();
        this.lastYawQ = q_identity();
        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.listen("doBounce", this.doBounce);
    }

    park() {
        this.gas = this.brake = 0;
        this.left = this.right = 0;
        this.steer = 0;
        this.speed = 0;
        this.highGear = 1;
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
        // this.unsubscribe("input", "pointerMove", this.doPointerMove);
    }

    keyDown(e) {
        switch (e.key) {
            case "W":
            case "w":
                this.gas = 1; break;
            case "S":
            case "s":
                this.brake = 1; break;
            case "A":
            case "a":
                this.left = 1; break;
            case "D":
            case "d":
                this.right = 1; break;
            case "M":
            case "m":
                this.auto = !this.auto; break;
            case "H":
            case "h":
                this.goHome(); break;
            case "Shift":
                console.log("shiftKey Down")
                this.highGear = 2; break;
            default:
        }
    }

    keyUp(e) {
        switch (e.key) {
            case "W":
            case "w":
                this.gas = 0; break;
            case "S":
            case "s":
                this.brake = 0; break;
            case "A":
            case "a":
                this.left = 0; break;
            case "D":
            case "d":
                this.right = 0; break;
            case "Shift":
                console.log("shiftKey Up")
                this.highGear = 1; break;
            default:
        }
    }


    doPointerDown(e){
        this.usePointer = true;
        this.pointerHome = e.xy;
        //this.doPointerMove(e);
        console.log("pointerDown",e.xy);
    }

    doPointerMove(e) {
        if(this.usePointer){
            const x = -(this.pointerHome[0] - e.xy[0])/50;
            const y = (this.pointerHome[1] - e.xy[1])/500;
            this.steer = Math.max(-5,Math.min(5, x));
            this.speed = Math.max(-2,Math.min(2, y));
        }
    }

    doPointerUp(e){
        this.usePointer = false;
        this.steer = 0;
        this.speed = 0;
        console.log("pointerUp", e.xy);
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {
            const wheelbase = 3.5;

            const factor = delta/1000;
            if(!this.usePointer){
                this.speed = (this.gas-this.brake) * 20 * factor * this.highGear;
                this.steer = (this.right-this.left) * 5;
                if (this.auto) {
                    this.speed = 5 * factor;
                    this.steer = -5;
                }
            }
            // copy our current position to compute pitch
            let start = [...this.translation];
            // angular velocity based on speed
            const angularVelocity = -this.speed/10 * Math.sin(toRad(this.steer)) / wheelbase / factor;
            this.yaw += angularVelocity;
            const yawQ = q_axisAngle([0,1,0], this.yaw);

            // velocity and follow terrain
            // -1 is a fake velocity used to compute the pitch when not moving
            this.velocity = [0, 0, -this.speed || -1];
            const tt = v3_rotate(this.velocity, yawQ);
            const translation = v3_add(this.translation, tt);
            // can't use last position to determine pitch if not moving
            if(this.speed === 0 )start[1]=perlin2D(start[0], start[2])+this.wheelHeight; 
            translation[1]=perlin2D(translation[0], translation[2])+this.wheelHeight;
            // compute pitch - both backward and forward
            let pitchQ;
            if(this.speed>=0)
                pitchQ = this.computePitch(start, translation);
            else
                pitchQ = this.computePitch(translation, start);
            
            if (!this.collide(tt)){ 
                if(this.speed)this.positionTo(translation, q_multiply(pitchQ, yawQ));
                else {
                    if(!(q_equals(pitchQ, this.lastPitchQ) && q_equals(yawQ, this.lastYawQ))){
                        this.positionTo(start, q_multiply(pitchQ, yawQ)); // pitch and yaw might change
                        this.lastPitchQ = pitchQ;
                        this.lastYawQ = yawQ;
                    }
                }
            }
            this.cameraTarget = m4_scaleRotationTranslation(1, yawQ, translation);
            this.updateChaseCam(time, delta);
        }
    }

    computePitch(tf, tt){
        const d = v3_sub(tt, tf);
        const dx = v3_magnitude([d[0], 0, d[2]]);
        if( dx>0 )
            this.pitch = Math.atan2(d[1], dx);
        return q_axisAngle([1,0,0], this.pitch); 
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

        const targetTranslation = v3_transform(offset, this.cameraTarget);
        const targetRotation = q_multiply(pitchQ, yawQ);

        let t = this.chaseTranslation = v3_lerp(this.chaseTranslation, targetTranslation, tTug);
        this.chaseRotation = q_slerp(this.chaseRotation, targetRotation, rTug);

        const terrainHeight = perlin2D(t[0], t[2])+0.5;
        if(t[1]<terrainHeight)this.chaseTranslation[1]=terrainHeight;

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

            if (distance < 2.5) {
                console.log("bump!");
                //console.log("me: " + this.actor.id + " other: "+ collider.actor.id);
                const from = v3_sub(this.translation, collider.translation);
                let distance = v3_magnitude(from);
                let bounce;
                if(distance > 0) bounce = v3_scale( from, 2/distance );
                else bounce = [1,1,1]; // we are on top of each other
                const translation = v3_add(this.translation, bounce);
                this.translateTo(translation);
                if(collider.actor.tags.has("avatar"))
                    collider.say("bounce", [-bounce[0], -bounce[1], -bounce[2]]);
                return true;
            }
        }
        return false;
    }

    // when I hit another avatar, the other needs to bounce too.
    // This is a bit tricky, because the other avatar is updating itself so fast,
    // it is possible to miss this if it occurs in the model. The drawback is it
    // increases latency. 
    doBounce(bounce){
        let translation = v3_add(bounce, this.translation);
        this.translateTo(translation);
    }

    goHome(){
        this.translateTo([-5 + Math.random() * 10, 0, 10]);
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
        sun.shadow.camera.left = -1000;
        sun.shadow.camera.right = 1000;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        sun.shadow.bias = 0.0001;

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

        const cylinder = new THREE.CylinderGeometry(1, 1, 3);
        cylinder.translate(0,1.5,0);
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
