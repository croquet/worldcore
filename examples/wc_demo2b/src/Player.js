import { q_axisAngle, Actor, Pawn, mix, AM_Avatar, PM_Avatar, PM_ThreeCamera,
    PM_ThreeVisible, UnitCube, Material, DrawCall, PM_AudioListener, m4_translation, m4_scaling, PM_AudioSource, AM_Player, PM_Player, AM_RapierPhysics,
v3_scale, sphericalRandom, m4_rotationQ, v3_transform } from "@croquet/worldcore";

import pawn_txt from "../assets/avatarGreyScale_baseColor.png";
import pawn_em from "../assets/avatarGreyScale_emissive.png";
import pawn_fbx from "../assets/avatar_low.fbx";

import { ProjectileActor } from "./Projectile";
import * as THREE from 'three';

import { FBXLoader } from "../loaders/FBXLoader.js";

const ASSETS = {
    "./avatar_txt_baseColor.png": pawn_txt,
};

const assetManager = new THREE.LoadingManager();
assetManager.setURLModifier(url => {
    const asset = ASSETS[url] || url;
    //console.log(`FBX: mapping ${url} to ${asset}`)
    return asset;
});

//------------------------------------------------------------------------------------------
// PlayerActor
//------------------------------------------------------------------------------------------

class PlayerActor extends mix(Actor).with(AM_Avatar, AM_Player, AM_RapierPhysics) {
    init(options) {
        let colorRNG = Math.floor( Math.random() * 6);
        let primary = [0, 0.3*Math.random() + 0.7];
        let secondary = [1, 0.5*Math.random() + 0.5];
        let tertiary = [2, 0.3*Math.random()];
        switch (colorRNG)
        {
            case 0:
                primary[0] = 0;
                secondary[0] = 1;
                tertiary[0] = 2;
                break;
            case 1:
                primary[0] = 0;
                secondary[0] = 2;
                tertiary[0] = 1;
                break;
            case 2:
                primary[0] = 1;
                secondary[0] = 2;
                tertiary[0] = 0;
                break;
            case 3:
                primary[0] = 1;
                secondary[0] = 0;
                tertiary[0] = 2;
                break;
            case 4:
                primary[0] = 2;
                secondary[0] = 0;
                tertiary[0] = 1;
                break;
            case 5:
                primary[0] = 2;
                secondary[0] = 1;
                tertiary[0] = 0;
                break;
            default:
                break;
        }
        /*console.log("color RNG is: " + colorRNG + ", primary is "
        + primary[0] + ", secondary is " + secondary[0] + ", tertiary is " + tertiary[0]);*/
        this.color = [0, 0, 0, 1];
        this.color[primary[0]] = primary[1];
        this.color[secondary[0]] = secondary[1];
        this.color[tertiary[0]] = tertiary[1];
        super.init("PlayerPawn", options);
        this.setLocation([0,2.2,5]);

        this.myCustomTimeOffset = Math.random() * 100000;

        this.shots = [];

        this.addRigidBody({type: 'kinematic'});
        this.addBoxCollider({
            size: [0.3, 1.0, 0.3],
            density: 1,
            friction: 1,
            restitution: 50,
            translation: [0, -0.6, 0]
        });

        this.listen("setName", name => {this.name = name; this.playerChanged();});
        this.listen("shoot", this.shoot);
    }

    destroy() {
        super.destroy();
        this.shots.forEach(s => s.destroy());
    }

    shoot() {
        if (this.shots.length >= 10) {
            const doomed = this.shots.shift();
            doomed.destroy();
        }

        const rotation = [...this.rotation];
        const location = [...this.location];
        const projectile = ProjectileActor.create({rotation, location, owner: this.id, color: this.color});
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.0005);

        const rotationMatrix = m4_rotationQ(rotation);
        const direction = v3_transform([0,0.2,-0.8], rotationMatrix);

        //projectile.applyTorqueImpulse(spin);
        projectile.applyImpulse(direction);

        this.shots.push(projectile);
    }
}
PlayerActor.register('PlayerActor');

//------------------------------------------------------------------------------------------
// PlayerPawn
//------------------------------------------------------------------------------------------

let playerPawn;

export function MyPlayerPawn() {return playerPawn;}

class PlayerPawn extends mix(Pawn).with(PM_Avatar, PM_AudioListener, PM_AudioSource, PM_ThreeVisible, PM_Player, PM_ThreeCamera) {
    constructor(...args) {
        super(...args);
        this.tug = 0.2;
        // custom movement speed scaling value so we can have a bit more fine-tuned control of player character
        this.myMovementSensitivity = 0.5;
        this.myRotationSensitivity = 1.25;
        // client-side lerping of movement tilt to reduce snapping when moving
        this.myTiltLerp = [0, 0];

        if (this.isMyPlayerPawn) {
            playerPawn = this;

            //this.setCameraOffset(m4_translation([0,1,0]));

            this.right = 0;
            this.left = 0;
            this.fore = 0;
            this.back = 0;
            this.strafeLeft = 0;
            this.strafeRight = 0;

            this.activateControls();

            // this.subscribe("hud", "enterGame", this.activateControls);

        } else {
            this.loadPawnModel();
        }
    }

    async loadPawnModel()
    {
        const pawntxt = new THREE.TextureLoader().load( pawn_txt );
        const pawnem = new THREE.TextureLoader().load( pawn_em );

        const fbxLoader = new FBXLoader(assetManager);

        // load model from fbxloader
        const obj = await new Promise( (resolve, reject) => fbxLoader.load(pawn_fbx, resolve, null, reject) );

        const threeColor = new THREE.Color(this.actor.color[0],
            this.actor.color[1],
            this.actor.color[2]);

        // create material with custom settings to apply to loaded model
        /*const material = new THREE.MeshStandardMaterial( {map: pawntxt,
            flatShading: false,
            blending: THREE.NormalBlending,
            metalness: 0,
            roughness: 100,
            color: threeColor,
            emissive: threeColor,
            emissiveMap: pawnem } );*/
        // overwrite material
        obj.children[0].material.map = pawntxt;
        obj.children[0].material.color = threeColor;
        obj.children[0].material.emissive = threeColor;
        obj.children[0].material.emissiveMap = pawnem;
        obj.children[0].material.roughness = 100;
        obj.children[0].material.metalness = 0;

        obj.children[0].position.set(0,-1,0);
        obj.children[0].scale.set(0.33,0.33,0.33);
        obj.children[0].rotation.set(0,3.14,0);
        obj.children[0].castShadow = true;
        obj.children[0].receiveShadow = true;
        // save mesh for later use
        this.myMesh = obj.children[0];
        obj.castShadow = true;
        obj.receiveShadow= true;
        this.setRenderObject(obj);
    }

    update(time, delta) {
        super.update(time, delta);
        var offset = (Math.sin( (this.now() + this.actor.myCustomTimeOffset) / 750) * 0.025);
        // represents maximum forward/backward tilt when moving
        var tiltFore = this.actor.velocity[2] * 30;
        var tiltSide = this.actor.velocity[0] * 30;
        // represents how quickly the character will reach those maximum tilt values
        var modifiedDelta = delta * 0.005;

        // actual lerping function that moves the local tilt value to reflect the model velocity
        this.myTiltLerp[0] = (1-modifiedDelta)*this.myTiltLerp[0]+modifiedDelta*tiltFore
        this.myTiltLerp[1] = (1-modifiedDelta)*this.myTiltLerp[1]+modifiedDelta*tiltSide

        if (this.myMesh !== undefined)
        {
            this.myMesh.position.set(0, -1.5 + offset, 0);
            this.myMesh.rotation.set(this.myTiltLerp[0], 3.1415, this.myTiltLerp[1]);
        }
    }

    destroy() {
        if (this.isMyPlayerPawn) playerPawn = null;
        super.destroy();

    }

    activateControls() {
        this.unsubscribe("hud", "enterGame");

        this.subscribe("input", "dDown", () => this.turnRight(-1));
        this.subscribe("input", "dUp", () => this.turnRight(0));
        this.subscribe("input", "aDown", () => this.turnLeft(1));
        this.subscribe("input", "aUp", () => this.turnLeft(0));

        this.subscribe("input", "spinRightDown", () => this.turnRight(-1));
        this.subscribe("input", "spinRightUp", () => this.turnRight(0));
        this.subscribe("input", "spinLeftDown", () => this.turnLeft(1));
        this.subscribe("input", "spinLeftUp", () => this.turnLeft(0));

        this.subscribe("input", "wDown", () => this.goFore(-1));
        this.subscribe("input", "wUp", () => this.goFore(0));
        this.subscribe("input", "sDown", () => this.goBack(1));
        this.subscribe("input", "sUp", () => this.goBack(0));

        this.subscribe("input", "ArrowUpDown", () => this.goFore(-1));
        this.subscribe("input", "ArrowUpUp", () => this.goFore(0));
        this.subscribe("input", "ArrowDownDown", () => this.goBack(1));
        this.subscribe("input", "ArrowDownUp", () => this.goBack(0));

        this.subscribe("hud", "fore", f => this.goFore(-1 * f));
        this.subscribe("hud", "back", f => this.goBack(1 * f));
        this.subscribe("hud", "left", f => this.turnLeft(1 * f));
        this.subscribe("hud", "right", f => this.turnRight(-1 * f));

        this.subscribe("input", "qDown", () => this.goLeft(-1));
        this.subscribe("input", "qUp", () => this.goLeft(0));
        this.subscribe("input", "eDown", () => this.goRight(1));
        this.subscribe("input", "eUp", () => this.goRight(0));

        this.subscribe("input", "strafeLeftDown", () => this.goLeft(-1));
        this.subscribe("input", "strafeLeftUp", () => this.goLeft(0));
        this.subscribe("input", "strafeRightDown", () => this.goRight(1));
        this.subscribe("input", "strafeRightUp", () => this.goRight(0));

        this.subscribe("hud", "strafeleft", f => this.goLeft(-1 * f));
        this.subscribe("hud", "straferight", f => this.goRight(1 * f));

        this.subscribe("input", " Down", this.shoot);
        this.subscribe("input", "touchTap", this.shoot);

    }

    turnRight(a) {
        this.right = a * this.myRotationSensitivity;
        if (this.back > 0) {
            this.right *= -1;
        }
        this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    }

    turnLeft(a) {
        this.left = a * this.myRotationSensitivity;
        if (this.back > 0) {
            this.left *= -1
        }
        this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    }

    goLeft(x)
    {
        this.strafeLeft = x * this.myMovementSensitivity;
        this.setVelocity([ 0.01 * (this.strafeLeft + this.strafeRight), 0,  0.01 * (this.fore + this.back)]);
    }

    goRight(x)
    {
        this.strafeRight = x * this.myMovementSensitivity;
        this.setVelocity([ 0.01 * (this.strafeLeft + this.strafeRight), 0,  0.01 * (this.fore + this.back)]);
    }

    goFore(z) {
        this.fore = z * this.myMovementSensitivity;

        this.setVelocity([0.01 * (this.strafeLeft + this.strafeRight), 0,  0.01 * (this.fore + this.back)]);
    }

    goBack(z) {
        this.back = z * this.myMovementSensitivity;
        if (z > 0)
        {
            if (this.right < 0) {
                this.right *= -1;
            }
            if (this.left > 0) {
                this.left *= -1;
            }
        }
        else {
            if (this.right > 0) {
                this.right *= -1;
            }
            if (this.left < 0) {
                this.left *= -1;
            }
        }
        this.setVelocity([0.01 * (this.strafeLeft + this.strafeRight), 0,  0.01 * (this.fore + this.back)]);
        this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    }

    shoot() {
        this.say("shoot");
    }

    setName(name) { this.say("setName", name); }

}
PlayerPawn.register('PlayerPawn');
