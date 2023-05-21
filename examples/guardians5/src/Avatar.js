// Guardians Avatar
// Copyright (c) 2023 CROQUET CORPORATION

import { Pawn, mix, PM_ThreeVisible, PM_ThreeInstanced, PM_Avatar, PM_Smoothed, PM_ThreeCamera, THREE, toRad,
    m4_multiply, m4_translation, m4_getTranslation, m4_scaleRotationTranslation, m4_rotationQ,
    v3_scale, v3_add, q_multiply, v3_rotate, v3_magnitude, v2_sqrMag, v3_sub, v3_lerp, v3_transform,
    q_yaw, q_axisAngle, q_eulerYXZ, q_slerp} from "@croquet/worldcore";

import paper from "../assets/paper.jpg";
import { sunLight, sunBase, perlin2D } from "./Pawns";
//import shot_sound from "../assets/Cannon Shot.acc";
const cameraOffset = [0,12,20];

//------------------------------------------------------------------------------------------
// AvatarPawn
// The avatar is designed to instantly react to user input and the publish those changes
// so other users are able to see and interact with this avatar. Though there will be some latency
// between when you see your actions and the other users do, this should have a minimal
// impact on gameplay.
// Besides user input, avatars respond to three things:
// - avatar collisions - if an avatar collides with you, you bounce in the opposite direction
// - bollard collisions - if you hit a bollard, you will bounce
// - bots - your avatar recieves damage if a bot explodes nearby
// - avatars are NOT effected by missiles - they just bounce off
// When an avatar collides with another avatar, a bounce event is sent to the collided
// avatar with a negative value for the bounce vector. The other avatar bounces away from
// the collision in the opposite direction of your avatar.
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar, PM_ThreeCamera, PM_ThreeInstanced) {

    constructor(actor) {
        console.log("CONSTRUCT AVATAR")
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

        this.service("CollisionManager").colliders.add(this);
        this.loadInstance(actor._instanceName, [0.35, 0.35, 0.35]);
        this.listen("colorSet", this.onColorSet);
        this.listen("goHome", this.goHome);
        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
    }

    loadInstance(name, color) {
        const im = this.service("ThreeInstanceManager");
        const geometry = im.geometry(name);
        if (geometry) {
            this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(...color), map:this.paperTexture} );
            this.mesh = new THREE.Mesh( geometry, this.material );
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            if (this.isMyAvatar) sunLight.target = this.mesh; //this.instance; // sunLight is a global
            this.setRenderObject(this.mesh);
        } else this.future(100).loadInstance(name, color);
    }
/*
    loadSounds() {
        const rm = this.service("ThreeRenderManager");
        this.audioLoader = new THREE.AudioLoader();
        this.listener = new THREE.AudioListener();
        rm.camera.add( this.listener );
        this.sounds = [];
        this.audioLoader.load( shot_sound, buffer => this.shotSound = buffer);
    }

    loadSound(sound, index) {
        this.audioLoader.load( sound, buffer => this.sounds[index] = buffer);
            const audio = new THREE.PositionalAudio( this.listener );
            audio.setBuffer( buffer );
            target.add( audio );
        });
    }
*/
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
        this.listen("doGodMode", this.doGodMode);
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
                console.log("shiftKey Down");
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
                // switch to god mode camera
                this.godMode = !this.godMode;
                break;
            case "C":
                // everyone switch to go mode camera
                this.publish("all", "godMode", !this.godMode);
                break;
            case "R":
            case "r":
                this.publish("game", "resetGame");
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
                console.log("shiftKey Up");
                this.highGear = 1; break;
            default:
        }
    }

    doPointerDown(e) {
        // this is temporary to get the bots to move
        /*
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(e.xy, "ground");
        if (hits.length<1) return;
        const hit = hits[0];
        */
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

            if (v>1) {
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
        //console.log("pointerUp", e.id, e.xy);
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

    doPointerTap() {
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
            const yaw = this.yaw+angularVelocity;
            const yawQ = q_axisAngle([0,1,0], yaw);

            // velocity and follow terrain
            // -1 is a fake velocity used to compute the pitch when not moving
            this.velocity = [0, 0, -this.speed || -0.4];
            this.deltat = v3_rotate(this.velocity, yawQ);
            const translation = v3_add(this.translation, this.deltat);
            // can't use last position to determine pitch if not moving
            if (this.speed === 0 ) start[1]=perlin2D(start[0], start[2])+this.wheelHeight;
            translation[1]=perlin2D(translation[0], translation[2])+this.wheelHeight;
            // compute pitch - both backward and forward

            let deltaPitch, deltaRoll;
            let roll, pitch;
            if (this.speed>=0) {
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
                } else { // if we haven't moved, then don't change anything
                    if ( (pitch !== this.pitch) || (yaw!==this.yaw) || (roll!==this.roll) )
                        this.positionTo(start, q);
                }
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

        const fixedPitch = toRad(-10);
        let tTug = 0.2;
        let rTug = 0.2;

        if (delta) {
            tTug = Math.min(1, tTug * delta / 15);
            rTug = Math.min(1, rTug * delta / 15);
        }

        const targetTranslation = v3_transform(cameraOffset, this.cameraTarget);
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
            const t = [0,200,0];
            const q = q_axisAngle([1, 0, 0], -Math.PI/2);
            this.godMatrix = m4_scaleRotationTranslation(1, q, t);
        }
        const rm = this.service("ThreeRenderManager");
        rm.camera.matrix.fromArray(this.godMatrix);
        rm.camera.matrixWorldNeedsUpdate = true;
    }

    collide() {
        const v_dist2Sqr = function (a,b) {
            const dx = a[0] - b[0];
            const dy = a[2] - b[2];
            return dx*dx+dy*dy;
        };
        const v_sub2 = function (a,b) {
            return [a[0]-b[0], 0, a[2]-b[2]];
        };

        const colliders = this.service("CollisionManager").colliders;

        for (const collider of colliders) {
            if (collider === this) continue;
            const colliderPos = m4_getTranslation(collider.global);
            const d = v_dist2Sqr(colliderPos, this.translation);

            if (d < 6.25) {
                const from = v_sub2(this.translation, collider.translation);
                const distance = v3_magnitude(from);
                let bounce;
                if (distance > 0) bounce = v3_scale( from, 2/distance );
                else bounce = [1,1,1]; // we are on top of each other
                const translation = v3_add(this.translation, bounce);
                this.translateTo(translation);
                if (collider.actor.tags.has("avatar"))
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
    doBounce(bounce) {
        const translation = v3_add(bounce, this.translation);
        this.translateTo(translation);
    }

    doGodMode(gm) {
        // global switch to godMode
        this.godMode = gm;
    }

    goHome() {
        const translation = [this.random() * 10-5, 0, this.random()*10-5];
        this.yaw = Math.PI/2;
        const rotation = q_axisAngle([0,1,0], this.yaw);

        this.positionTo(translation, rotation);
    }
}

AvatarPawn.register("AvatarPawn");