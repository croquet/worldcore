// Drive Views
//
// The majority of the code specific to this example is in the definition of AvatarPawn.
// Demonstrates terrain following, avatar/object and avatar/avatar collisions.
// Uses a 2D Perlin noise function to generate terrain and to dynamically compute
// the height of the terrain as the avatar moves.
//
// When an avatar collides with another avatar, a bounce event is sent to the collided
// avatar with a negative value for the bounce vector. The other avatar bounces away from
// the collision in the opposite direction of your avatar.
//
// To do:
// - ensure camera can always see tank
// - tank explosion (turret jumps up, tank fades out)
// - collision more natural

import { ViewRoot, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Smoothed, PM_Spatial,
    THREE, toRad, m4_rotation, m4_multiply, m4_translation, m4_getTranslation, m4_scaleRotationTranslation,
    ThreeInstanceManager, PM_ThreeInstanced, ThreeRaycast, PM_ThreeCollider, PM_Avatar, v2_magnitude, v3_scale, v3_add,
    q_identity, q_equals, q_multiply, q_axisAngle, v3_rotate, v3_magnitude, PM_ThreeCamera, q_yaw,
    q_pitch, q_euler, q_eulerYXZ, q_slerp, v2_sqrMag, v3_lerp, v3_transform, m4_rotationQ, ViewService,
    v3_distance, v3_dot, v3_sub, PerlinNoise, GLTFLoader, PM_NavGridGizmo } from "@croquet/worldcore";
import tank_tracks from "../assets/tank_tracks.glb";
import tank_turret from "../assets/tank_turret.glb";
import tank_body from "../assets/tank_body.glb";
import paper from "../assets/paper.jpg";
//import sky from "../assets/aboveClouds.jpg";
import sky from "../assets/quarry_02.png";


// construct a perlin object and return a function that uses it
const perlin2D = function(perlinHeight = 40, perlinScale = 0.02) {
    // the PerlinNoise constructor can take a seed value as an argument
    // this must be the same for all participants so it generates the same terrain.
    const perlin = new PerlinNoise();

    return function(x,y) {
        //return 0; // used for testing
        return perlinHeight * perlin.signedNoise2D(perlinScale*x-100, perlinScale*y-146);
    }
}();

const sunBase = [50, 100, 50];
const sunLight =  function() {
    const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
    sun.position.set(...sunBase);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 90;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 2;
    sun.shadow.blurSamples = 4;
    return sun;
}();

// 3D object that you can see through a wall
const constructShadowObject = function(object3d, renderOrder, color) {

    const shadowMat = new THREE.MeshStandardMaterial( {
        color: color,
        opacity: 0.25,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        // side: THREE.BackSide,
    });

    const outline3d = object3d.clone(true);
    outline3d.position.set(0,0,0);
    outline3d.rotation.set(0,0,0);
    outline3d.updateMatrix();
    outline3d.traverse((m) => {
        if (m.material) {
            m.material = shadowMat;
            if (!Array.isArray(m.material)) {
                console.log("single material")
                m.material = shadowMat;
            } else {
                console.log("multiple material", m.material.length);
                let mArray = m.material.map((_m) => shadowMat);
                m.material = mArray;
            }
        }
    });
    outline3d.renderOrder = renderOrder;
    return outline3d;
}
//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        let t = this.translation;
        t[1]=perlin2D(t[0], t[2])+1;
        this.set({translation:t});
        this.useInstance("cyanBox");
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// InstancePawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GeometryPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
        this.loadGeometry(actor._instanceName, actor.color);
    }

    loadGeometry(name, color) {
        const im = this.service("ThreeInstanceManager");
        const geometry = im.geometry(name);
        if (geometry) {
            this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...color), map:this.paperTexture} );
            this.mesh = new THREE.Mesh( geometry, this.material );
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.setRenderObject(this.mesh);
            //this.outline3d=constructShadow(this.mesh, 10002);
            //this.mesh.add(this.outline3d, color);
        } else this.future(100).loadGeometry(name, color);
    }
}

GeometryPawn.register("GeometryPawn");
//------------------------------------------------------------------------------------------
// BollardPawn -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BollardPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("pole");
        this.service("CollisionManager").colliders.add(this);
        const t = this.translation;
        t[1]=perlin2D(t[0], t[2])-0.25;
        this.set({translation:t});
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

}
BollardPawn.register("BollardPawn");

export class InstancePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance(actor._instanceName);
    }
}
InstancePawn.register("InstancePawn");

//------------------------------------------------------------------------------------------
//-- BasePawn ------------------------------------------------------------------------------
// This is the ground of the world. We generate a simple plane of worldX by worldY in size
// and compute the Perlin noise value at each x/z position to determine the height.
// We then renormalize the mesh vectors.
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_NavGridGizmo) {
    constructor(actor) {
        super(actor);
        const worldX = 512, worldZ=512;
        const cellSize = 2.5;

        const paperTexture = new THREE.TextureLoader().load( paper );
        paperTexture.wrapS = THREE.RepeatWrapping;
        paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set( worldX/4, worldZ/4 );


        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2), map:paperTexture} );
        this.geometry = new THREE.PlaneGeometry(worldX*cellSize,worldZ*cellSize, worldX, worldZ);
        this.geometry.rotateX(toRad(-90));

        const vertices = this.geometry.attributes.position.array;

        for( let index=0; index < vertices.length; index+=3)
            vertices[index+1] = perlin2D(vertices[index], vertices[index+2]);

        this.geometry.computeVertexNormals();
        const base = new THREE.Mesh( this.geometry, this.material );
        base.receiveShadow = true;
        base.castShadow = true;
        this.subscribe("input", "gDown", this.toggleGizmo);
/*
        // define an outline of the hills - flattens the world a bit too much though
        let base2 = base.clone();
        base2.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0, 0, 0), side:THREE.BackSide} );
        base2.position.y=0.1;
        base2.castShadow = false;
        base2.receiveShadow = false;
       // base2.side = THREE.BackSide;
        base.add(base2);
*/
        this.setRenderObject(base);
    }

    toggleGizmo() {
        this.gizmo.visible = !this.gizmo.visible;
    }

    destroy() {
        super.destroy();
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
// CollidePawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CollidePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

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
        this.service("CollisionManager").colliders.delete(this);
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

}
CollidePawn.register("CollidePawn");

//------------------------------------------------------------------------------------------
// MissilePawn -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MissilePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible) {

    constructor(actor) {
        super(actor);
    //    this.service("CollisionManager").colliders.add(this);
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...this.actor.color)} );
        this.geometry = new THREE.SphereGeometry( 1, 32, 16 );
        const mesh = new THREE.Mesh( this.geometry, this.material );
        mesh.castShadow = true;
        this.setRenderObject(mesh);
        this.listen("colorSet", this.onColorSet);
    }

    destroy() {
        super.destroy();
    //    this.service("CollisionManager").colliders.delete(this);
        this.geometry.dispose();
        this.material.dispose();
    }

    onColorSet() {
        this.material.color = new THREE.Color(...this.actor.color);
    }

    update(time, delta) {
        super.update(time,delta);
        this._translation[1] = perlin2D(this.translation[0], this.translation[2])+2;
        this.localChanged();
        this.refreshDrawTransform();
    }
}
MissilePawn.register("MissilePawn");
//------------------------------------------------------------------------------------------
// AvatarPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar, PM_ThreeCamera, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.yaw = q_yaw(this.rotation);
        this.pitch = 0;
        this.roll = 0;
        this.chaseTranslation = [0,10,20];
        this.chaseRotation = q_axisAngle([1,0,0], toRad(-5));
        this.wheelHeight = 0.0;
        this.velocity = [0,0,0];
        this.speed = 0;
        this.pointerMoved = false;
        this.lastShootTime = -10000;
        this.waitShootTime = 100;
        this.godMode = false;
        this.bounce = [0,0,0];
        this.bounceDown = 0.75;
        this.bounceTime = 0;

        this.service("CollisionManager").colliders.add(this);
        this.loadInstance(actor._instanceName, [0.35, 0.35, 0.35]);
        this.listen("colorSet", this.onColorSet);
        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
    }

    loadInstance(name, color) {
        const im = this.service("ThreeInstanceManager");
        const geometry = im.geometry(name);
        if (geometry) {
            console.log("HERE I AM", geometry)
            this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...color), map:this.paperTexture} );
            this.mesh = new THREE.Mesh( geometry, this.material );
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            if (this.isMyAvatar) sunLight.target = this.mesh; //this.instance; // sunLight is a global
            this.setRenderObject(this.mesh);
            //this.outline3d=constructShadow(this.mesh, 10001, color);
            //this.mesh.add(this.outline3d);
        } else this.future(100).loadInstance(name, color);
    }

    destroy() {
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

    onColorSet() {
       // this.material.color = new THREE.Color(...this.actor.color);
    }

    // If this is YOUR avatar, the AvatarPawn automatically calls this.drive() in the constructor.
    // The drive() function sets up the user interface for the avatar.
    // If this is not YOUR avatar, the park() function is called.
    drive() {
        console.log("DRIVE");
        this.gas = 0;
        this.turn = 0;
        this.steer = 0;
        this.speed = 0;
        this.highGear = 1;
        this.pointerId = 0;

        this.subscribe("input", "keyDown", this.keyDown);
        this.subscribe("input", "keyUp", this.keyUp);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", "tap", this.doPointerTap);
        this.listen("doBounce", this.doBounce);
    }

    park() {
        this.gas = 0;
        this.turn = 0;
        this.steer = 0;
        this.speed = 0;
        this.highGear = 1;
        this.unsubscribe("input", "keyDown", this.keyDown);
        this.unsubscribe("input", "keyUp", this.keyUp);
        // this.unsubscribe("input", "pointerMove", this.doPointerMove);
    }

    shoot() {
        if (this.now()-this.lastShootTime > this.waitShootTime) {
            this.lastShootTime = this.now();
            this.say("shoot", [this.translation, this.yaw]);
            //console.log("Shoot");
        }
    }

    keyDown(e) {
        switch (e.key) {
            case "W":
            case "w":

                this.gas = 1; break;
            case "S":
            case "s":
                this.gas = -1; break;
            case "A":
            case "a":
                this.turn = 1; break;
            case "D":
            case "d":
                this.turn = -1; break;
            case "M":
            case "m":
                this.auto = !this.auto; break;
            case "H":
            case "h":
                this.goHome(); break;
            case "Shift":
                console.log("shiftKey Down")
                this.highGear = 1.5; break;
            case " ":
                this.shoot();
                break;
            case "I":
            case "i":
                console.log("translation:", this.translation,
                    "roll:", this.roll,
                    "pitch:", this.pitch,
                    "yaw:", this.yaw);
                break;
            case "c":
            case "C":
                // switch to god mode camera
                this.godMode = !this.godMode;
                break;
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
                this.gas = 0; break;
            case "A":
            case "a":
                this.turn = 0; break;
            case "D":
            case "d":
                this.turn = 0; break;
            case "Shift":
                console.log("shiftKey Up")
                this.highGear = 1; break;
            default:
        }
    }


    doPointerDown(e) {
        console.log("pointerDown", e.id, e.xy);

        if (!this.pointerId) {
            this.pointerId = e.id;
            this.pointerHome = e.xy;
        }
    }

    doPointerMove(e) {
        if (e.id === this.pointerId) {
            const dx = e.xy[0] - this.pointerHome[0];
            const dy = e.xy[1] - this.pointerHome[1];
            const x = -dx/20;
            const y = -dy/20;
            this.turn = Math.max(-1,Math.min(1, x));
            this.gas = Math.max(-1,Math.min(1, y));

            let v = v2_sqrMag([this.turn, this.gas]);

            if(v>1) {
                v=Math.sqrt(v);
                this.turn/=v;
                this.gas/=v;
            }

            const knob = document.getElementById("knob");
            knob.style.left = `${20 - this.turn*20}px`;
            knob.style.top = `${20 - this.gas*20}px`;
            this.pointerMoved = true;
        }
    }

    doPointerUp(e) {
        console.log("pointerUp", e.id, e.xy);
        if (e.id === this.pointerId) {
            this.pointerId = 0;

            if (this.pointerMoved) {
                this.turn = 0;
                this.gas = 0;
                const knob = document.getElementById("knob");
                knob.style.left = `20px`;
                knob.style.top = `20px`;
                this.pointerMoved = false;
            }

        }
    }

    doPointerTap(e) {
        this.shoot();
    }

    update(time, delta) {
        super.update(time,delta);
        if (this.driving) {

            const factor = delta/1000;

            if (this.auto) {
                this.speed = 5 * factor;
                this.steer = -1;
                this.shoot();
            } else {
                this.speed = this.gas * 20 * factor * this.highGear;
                this.steer = this.turn;
            }

            // copy our current position to compute pitch
            const start = [...this.translation];
            const angularVelocity = this.steer*0.025;
            let yaw = this.yaw+angularVelocity;
            const yawQ = q_axisAngle([0,1,0], yaw);

            // velocity and follow terrain
            // -1 is a fake velocity used to compute the pitch when not moving
            this.velocity = [0, 0, -this.speed || -0.4];
            let tt = this.bounce;
            if (this.bounceTime < this.now()) tt = v3_add(tt, v3_rotate(this.velocity, yawQ));
            else console.log(this.bounce, this.bounceTime-this.now());
            const translation = v3_add(this.translation, tt);
            this.bounce = v3_scale(this.bounce, this.bounceDown);
            // can't use last position to determine pitch if not moving
            if (this.speed === 0 )start[1]=perlin2D(start[0], start[2])+this.wheelHeight;
            translation[1]=perlin2D(translation[0], translation[2])+this.wheelHeight;;
            // compute pitch - both backward and forward

            let deltaPitch, deltaRoll;
            let roll, pitch;
            if(this.speed>=0) {
                deltaPitch = v3_sub(translation, start);
                pitch = this.computeAngle(deltaPitch);

                deltaRoll = [translation[0]+deltaPitch[2],0,translation[2]-deltaPitch[0]];
                deltaRoll[1] = perlin2D(deltaRoll[0], deltaRoll[2])+this.wheelHeight;
                deltaRoll = v3_sub(translation, deltaRoll);
                roll = this.computeAngle(deltaRoll);
            } else {
                deltaPitch = v3_sub(start, translation);
                pitch = this.computeAngle(deltaPitch);

                deltaRoll = [deltaPitch[2]+translation[0],0,-deltaPitch[0]+translation[2]];
                deltaRoll[1] = perlin2D(deltaRoll[0], deltaRoll[2])+this.wheelHeight;
                deltaRoll = v3_sub(translation, deltaRoll);
                roll = this.computeAngle(deltaRoll);
            }

            if (!this.collide()) {
                const q = q_eulerYXZ( pitch, yaw, roll);
                if (this.speed) {
                    this.positionTo(translation, q);
                    sunLight.position.set(...v3_add(translation, sunBase));
                } else if ( (pitch !== this.pitch) || (yaw!==this.yaw) || (roll!==this.roll) )
                    this.positionTo(start, q);
            }
            this.pitch = pitch;
            this.roll = roll;
            this.yaw = yaw;
            this.cameraTarget = m4_scaleRotationTranslation(1, yawQ, translation);
            if (this.godMode) this.godCamera();
            else this.updateChaseCam(time, delta);
        }
    }

    computeAngle(d) {
        const delta = v3_magnitude([d[0], 0, d[2]]);
        return  delta>0 ? Math.atan2(d[1], delta) : 0;
    }


    updateChaseCam(time, delta) {
        const rm = this.service("ThreeRenderManager");


        const offset = [0,10,20];
        const fixedPitch = toRad(-10);
        let tTug = 0.2;
        let rTug = 0.2;

        if (delta) {
            tTug = Math.min(1, tTug * delta / 15);
            rTug = Math.min(1, rTug * delta / 15);
        }

        const targetTranslation = v3_transform(offset, this.cameraTarget);
        const pitchQ = q_axisAngle([1,0,0], fixedPitch);
        const yawQ = q_axisAngle([0,1,0], this.yaw);
        const targetRotation = q_multiply(pitchQ, yawQ);

        const t = this.chaseTranslation = v3_lerp(this.chaseTranslation, targetTranslation, tTug);
        this.chaseRotation = q_slerp(this.chaseRotation, targetRotation, rTug);

        const terrainHeight = perlin2D(t[0], t[2])+0.5;
        if (t[1]<terrainHeight) this.chaseTranslation[1]=terrainHeight;

        const ttt = m4_translation(this.chaseTranslation);

        const rrr = m4_rotationQ(this.chaseRotation);
        const mmm = m4_multiply(rrr, ttt);
        rm.camera.matrix.fromArray(mmm);
        rm.camera.matrixWorldNeedsUpdate = true;
    }

    godCamera() {
        if (!this.godMatrix) {
            let t = [150,100,150];
            let q = q_axisAngle([1, 0, 0], -Math.PI/2);
            this.godMatrix = m4_scaleRotationTranslation(1, q, t);
        }
        const rm = this.service("ThreeRenderManager");
        rm.camera.matrix.fromArray(this.godMatrix);
        rm.camera.matrixWorldNeedsUpdate = true;
    }

    collide() {
        const colliders = this.service("CollisionManager").colliders;
        for (const collider of colliders) {
            if (collider === this) continue;
            const colliderPos = m4_getTranslation(collider.global);
            const distance = v3_distance(colliderPos, this.translation);

            if (distance < 2.5) {
                //console.log("bump!");
                //console.log("me: " + this.actor.id + " other: "+ collider.actor.id);
                const from = v3_sub(this.translation, collider.translation);
                const distance = v3_magnitude(from);
                if (distance>0.001) {
                    let bounce = v3_scale( from, this.speed*2/distance);
                    this.bounceTime = this.now()+100;
                    if (collider.actor.tags.has("avatar")) collider.say("bounce", [-bounce[0], -bounce[1], -bounce[2]]);
                    this.bounce = v3_add(this.bounce, bounce);
                    const translation = v3_add(this.translation, this.bounce);
                    this.translateTo(translation);
                    this.bounce = v3_scale(this.bounce, this.bounceDown);
                }
                return true;
            }
        }
        return false;
    }

    // when I hit another avatar, the other needs to bounce too.
    // This is a bit tricky, because the other avatar is updating itself so fast,
    // it is possible to miss this if it occurs in the model. The drawback is it
    // increases latency.
    doBounce(bounce) {
        console.log(bounce);
        this.bounce = v3_add( this.bounce, bounce);
        const translation = v3_add(this.bounce, this.translation);
        this.bounce = v3_scale(this.bounce, this.bounceDown);
        this.bounceTime = this.now()+100;
        this.translateTo(translation);
    }

    goHome() {
        const translation = [175+ this.random() * 10, 0, 160+this.random()*10];
        this.yaw = Math.PI/2;
        const rotation = q_axisAngle([0,1,0], this.yaw);

        this.positionTo(translation, rotation);
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
        const ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
        rm.scene.add(ambient);
        rm.scene.add(sunLight); // this is a global object
        const loader = new THREE.TextureLoader();
        loader.load( sky, (skyTexture) => {
            const pmremGenerator = new THREE.PMREMGenerator(rm.renderer);
            pmremGenerator.compileEquirectangularShader();
            const skyEnvironment = pmremGenerator.fromEquirectangular(skyTexture);
            rm.scene.background = skyEnvironment.texture;
            rm.scene.environment = skyEnvironment.texture;
        } );
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

    async buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  yellow = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,1,0)} );
        const  magenta = new THREE.MeshStandardMaterial( {color: new THREE.Color(1,0,1)} );
        const  cyan = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,1)} );
        const  gray = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.3,0.3,0.3), metalness:1, roughness:0.1} );

        im.addMaterial("yellow", yellow);
        im.addMaterial("magenta", magenta);
        im.addMaterial("cyan", cyan);
        im.addMaterial("gray", gray);

        const box = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("box", box);

        const cylinder = new THREE.CylinderGeometry(1, 1.5, 4.25, 32);
        cylinder.translate(0,2,0);
        im.addGeometry("cylinder", cylinder);

        const cylinder2 = new THREE.CylinderGeometry(1, 1, 0.25, 32);
        cylinder2.translate(0,1.5,0);
        im.addGeometry("cylinder2", cylinder2);

        const cylinder3 = new THREE.CylinderGeometry(1, 1, 0.25, 32);
        cylinder3.translate(0,1.5,0);
        im.addGeometry("cylinder3", cylinder3);

        const mesh0 = im.addMesh("yellowBox", "box", "yellow");
        const mesh1 = im.addMesh("magentaBox", "box", "magenta");
        const mesh2 = im.addMesh("cyanBox", "box", "cyan");
        const mesh3 = im.addMesh("pole", "cylinder", "gray");
        const mesh4 = im.addMesh("pole2", "cylinder2", "gray");

        mesh0.castShadow = true;
        mesh1.castShadow = true;
        mesh2.castShadow = true;
        mesh3.castShadow = true;
        mesh4.castShadow = true;

        const gltfLoader = new GLTFLoader();

        let [ tankTracks, tankTurret, tankBody ] = await Promise.all( [
            gltfLoader.loadAsync( tank_tracks ),
            gltfLoader.loadAsync( tank_turret),
            gltfLoader.loadAsync( tank_body)
        ] );

        tankBody = tankBody.scene.children[0].geometry;
        tankTracks = tankTracks.scene.children[0].geometry;
        tankTurret = tankTurret.scene.children[0].geometry;
        tankBody.rotateY(toRad(-90));
        tankTracks.rotateY(toRad(-90));
        tankTurret.rotateY(toRad(-90));
        im.addGeometry("tankBody", tankBody);
        im.addGeometry("tankTurret", tankTurret);
        im.addGeometry("tankTracks", tankTracks);


        console.log("DO I GET HERE?", tankTracks, im.geometry("tankTracks"))

        const tankBodyim = im.addMesh("tankBody","tankBody", "yellow");
        const tankTurretim = im.addMesh("tankTurret", "tankTurret","yellow");
        const tankTracksim = im.addMesh("tankTracks", "tankTracks", "gray");

        tankBodyim.castShadow = true;
        tankBodyim.receiveShadow = true;
        tankTurretim.castShadow = true;
        tankTurretim.receiveShadow = true;
        tankTracksim.castShadow = true;
        tankTracksim.receiveShadow = true;
    }
}