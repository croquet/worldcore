// Guardians Avatar
// Copyright (c) 2023 CROQUET CORPORATION

import { Pawn, mix, PM_ThreeVisible, PM_ThreeInstanced, PM_Avatar, PM_Smoothed, PM_ThreeCamera, THREE, toRad,
    m4_multiply, m4_translation, m4_scaleRotationTranslation, m4_rotationQ, v2_normalize,
    v3_scale, v3_add, q_multiply, v3_rotate, v3_magnitude, v2_sqrMag, v3_sub, v3_lerp, v3_transform,
    q_yaw, q_axisAngle, q_eulerYXZ, q_slerp} from "@croquet/worldcore";

import paper from "../assets/paper.jpg";
import { sunLight, sunBase, perlin2D, tank, UserColors } from "./Pawns";
const cameraOffset = [0,12,20];

const v_dist2Sqr = function (a,b) {
    const dx = a[0] - b[0];
    const dy = a[2] - b[2];
    return dx*dx+dy*dy;
};
const maxDist = 250;
const maxDistSqr = maxDist*maxDist;

const v_sub2 = function (a,b) {
    return [a[0]-b[0], 0, a[2]-b[2]];
};
//------------------------------------------------------------------------------------------
// AvatarPawn
// The avatar is designed to instantly react to user input and the publish those changes
// so other users are able to see and interact with this avatar. Though there will be some latency
// between when you see your actions and the other users do, this should have a minimal
// impact on gameplay.
// - bollard collisions - if you hit a bollard or another tank, you will bounce
// - avatars are NOT effected by missiles - they just bounce off
//------------------------------------------------------------------------------------------

export class AvatarPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_Avatar, PM_ThreeCamera, PM_ThreeInstanced) {

    constructor(actor) {
        console.log("CONSTRUCT AVATAR")
        super(actor);
        this.developerMode=0;
        this.yaw = q_yaw(this.rotation);
        this.pitch = 0;
        this.roll = 0;
        this.chaseTranslation = [0,10,20];
        this.chaseRotation = q_axisAngle([1,0,0], toRad(-5));
        this.speed = 0;
        this.pointerMoved = false;
        this.lastShootTime = -10000;
        this.waitShootTime = 100;
        this.godMode = false;
        this.color = UserColors[actor.userColor];
        this.service("CollisionManager").colliders.add(this);
        this.listen("goHome", this.goHome);
        this.loadTank();
        /*
        this.paperTexture = new THREE.TextureLoader().load( paper );
        this.paperTexture.wrapS = THREE.RepeatWrapping;
        this.paperTexture.wrapT = THREE.RepeatWrapping;
        this.paperTexture.repeat.set( 1, 1 );
        */
    }

    loadTank() {

        if (tank[0]) {
            this.tank = new THREE.Group();
            this.tankTreads = tank[0].clone(true);
            this.tankTreads.rotation.set(0, Math.PI/2, 0);
            this.tankTreads.traverse(obj=> {
                if (obj.geometry) {
                    obj.castShadow=true;
                    obj.receiveShadow=true;
                }
            });
            this.tankBody = tank[1].clone(true);
            this.tankBody.rotation.set(0, Math.PI/2, 0);
            this.tankBody.traverse(obj=> {
                if (obj.geometry) {
                    obj.material = obj.material.clone();
                    obj.material.color.setRGB(...this.color);
                    obj.castShadow=true;
                    obj.receiveShadow=true;
                }
            });
            this.tank.add(this.tankTreads);
            this.tank.add(this.tankBody);
            if (this.isMyAvatar) sunLight.target = this.tank; //this.instance; // sunLight is a global
            this.setRenderObject(this.tank);

        } else this.future(100).loadTank();
    }

    destroy() {
        this.destroy3D( this.tankTreads );
        this.destroy3D( this.tankBody );
        super.destroy();
        this.service("CollisionManager").colliders.delete(this);
    }

    destroy3D( obj3D ) {
        obj3D.traverse( obj => {
            if (obj.geometry) {
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });
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
            case 'x': case 'X':
                if (this.developerMode === 0) this.developerMode++;
                break;
            case 'y': case 'Y':
                if (this.developerMode === 1 || this.developerMode === 4 ) this.developerMode++;
                if (this.developerMode === 5) console.log( "Entered developer mode.");
                break;
            case 'z': case 'Z':
                if (this.developerMode === 2 || this.developerMode === 3 ) this.developerMode++;
                break;
            case "ArrowUp": case "W": case "w":
                this.gas = 1; break;
            case "ArrowDown": case "S": case "s":
                this.gas = -1; break;
            case "ArrowLeft": case "A": case "a":
                this.turn = 1; break;
            case "ArrowRight": case "D": case "d":
                this.turn = -1; break;
            case "M": case "m":
                if (this.developerMode === 5) this.auto = !this.auto; break;
            case "H": case "h":
                if (this.developerMode === 5) this.goHome(); break;
            case "Shift":
                console.log("shiftKey Down");
                this.highGear = 1.5; break;
            case " ":
                this.shoot();
                break;
            case "I": case "i":
                if (this.developerMode === 5) console.log(
                    "translation:", this.translation,
                    "roll:", this.roll,
                    "pitch:", this.pitch,
                    "yaw:", this.yaw);
                break;
            case "g":
                // switch to god mode camera
                if (this.developerMode === 5) this.godMode = !this.godMode;
                break;
            case "G":
                // everyone switch to go mode camera
                if (this.developerMode === 5) this.publish("all", "godMode", !this.godMode);
                break;
            case "R": case "r":
                if (this.developerMode === 5) this.publish("game", "resetGame");
                break;
            case "B": case "b": //
                if (this.developerMode === 5) this.publish("game", "bots", 500);
                break;
            case "U": case "u": // make the tower immortal/undying
                if (this.developerMode === 5) this.publish("game", "undying");
                break;
            case 'F': case 'f': // pause bots and missiles
                if (this.developerMode === 5) this.publish("game", "freeze");
                break;
            case '1':
                if (this.developerMode === 5) this.publish("game", "bots", 10);
                break;
            case '2':
                if (this.developerMode === 5) this.publish("game", "bots", 25);
                break;
            case '3':
                if (this.developerMode === 5) this.publish("game", "bots", 50);
                break;
            case '4':
                if (this.developerMode === 5) this.publish("game", "bots", 100);
                break;
            case '5':
                if (this.developerMode === 5) this.publish("game", "bots", 250);
                break;
            case '6':
                if (this.developerMode === 5) this.publish("game", "bots", 500);
                break;
            default:
        }
    }

    keyUp(e) {
        switch (e.key) {
            case "ArrowUp": case "W": case "w":
                this.gas = 0; break;
                case "ArrowDown": case "S": case "s":
                this.gas = 0; break;
                case "ArrowLeft": case "A": case "a":
                this.turn = 0; break;
                case "ArrowRight": case "D": case "d":
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
        if (e.id!==0 && e.id === this.pointerId) {
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
        if (e.id!==0 && e.id === this.pointerId) {
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

            const angularVelocity = this.steer*0.025;
            const yaw = this.yaw+angularVelocity;
            const yawQ = q_axisAngle([0,1,0], yaw);
            const forward = v3_rotate([0,0,-1], yawQ);
            const right = v3_rotate([1,0,0], yawQ);
            const velocity = v3_scale(forward, this.speed);

            // set translation to limit after any collision
            let translation = this.collide( v3_add(this.translation, velocity) );
            const radSqr = v_dist2Sqr(translation, [0,0,0]);
            if (radSqr>maxDistSqr) {
                const norm = v2_normalize([translation[0], translation[2]]);
                translation = [maxDist * norm[0], 0, maxDist * norm[1]];
            }
            translation[1] = perlin2D(translation[0], translation[2]);

            // the forward part of the tank to compute pitch
            const fTrans = v3_add(forward, translation);
            fTrans[1] = perlin2D(fTrans[0], fTrans[2]);
            // the right part of the tank - to compute roll
            const rTrans = v3_add(right, translation);
            rTrans[1] = perlin2D(rTrans[0], rTrans[2]);

            const deltaPitch = v3_sub(fTrans, translation);
            const pitch = this.computeAngle(deltaPitch);

            const deltaRoll = v3_sub(rTrans, translation);
            const roll = this.computeAngle(deltaRoll);

            if (this.speed || (pitch !== this.pitch) || (yaw!==this.yaw) || (roll!==this.roll)) {
                const q = q_eulerYXZ( pitch, yaw, roll);
                this.positionTo(translation, q);
                sunLight.position.set(...v3_add(translation, sunBase));
            }
            // save these to see if anything moved
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

    collide(translation) {
        const colliders = this.service("CollisionManager").colliders;

        for (const collider of colliders) {
            if (collider === this) continue;
            //const colliderPos = m4_getTranslation(collider.global);
            const d = v_dist2Sqr(collider.translation, translation);

            if (d < 9) {
                const from = v_sub2(translation, collider.translation);
                const distance = v3_magnitude(from);
                let bounce;
                if (distance > 0) bounce = v3_scale( from, 3.1/distance );
                else bounce = [2,1,2]; // we are on top of each other
                return ( v3_add(collider.translation, bounce));
            }
        }
        return translation;
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