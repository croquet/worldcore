import { q_axisAngle, Actor, Pawn, mix, AM_Avatar, PM_Avatar, PM_Camera,
    PM_Visible, UnitCube, Material, DrawCall, PM_AudioListener, m4_translation, m4_scaling, PM_AudioSource, AM_Player, PM_Player, AM_RapierPhysics,
v3_scale, sphericalRandom, m4_rotationQ, v3_transform, m4_multiply, PM_MouselookAvatar, AM_MouselookAvatar } from "@croquet/worldcore";
    import paper from "../assets/paper.jpg";
import { ProjectileActor } from "./Projectile";

//------------------------------------------------------------------------------------------
// PlayerActor
//------------------------------------------------------------------------------------------

class PlayerActor extends mix(Actor).with(AM_MouselookAvatar, AM_Player, AM_RapierPhysics) {
    init(options) {
        this.color = [0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 1];
        super.init("PlayerPawn", options);
        this.setTranslation([0,1.5,10.65]);
        this.shots = [];

        this.addRigidBody({type: 'kinematic'});
        this.addBoxCollider({
            size: [0.5, 1.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 50
        });

        this.listen("setName", name => {this.name = name; this.playerChanged();});
        this.listen("shoot", this.shoot);
    }

    destroy() {
        this.shots.forEach(s => s.destroy());
        super.destroy();
    }

    shoot() {
        if (this.shots.length >= 15) {
            const doomed = this.shots.shift();
            doomed.destroy();
        }

        const rotation = [...this.rotation];
        const translation = [...this.translation];
        const projectile = ProjectileActor.create({rotation, translation, owner: this.id, color: this.color});
        const spin = v3_scale(sphericalRandom(),Math.random() * 0.0005);

        const rotationMatrix = m4_rotationQ(rotation);
        const direction = v3_transform([0,0.04,-0.08], rotationMatrix);

        projectile.applyTorqueImpulse(spin);
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

// Should be able to use PM_MouselookAvatar, but getting error!

class PlayerPawn extends mix(Pawn).with(PM_Avatar, PM_AudioListener, PM_AudioSource, PM_Visible, PM_Player, PM_Camera) {
    constructor(...args) {
        super(...args);
        this.setTug(0.2);

        if (this.isMyPlayerPawn) {
            playerPawn = this;

            // this.setCameraOffset(m4_translation([0,1,0]));

            this.right = 0;
            this.left = 0;
            this.fore = 0;
            this.back = 0;

            this.activateControls();

            // this.subscribe("hud", "enterGame", this.activateControls);

        } else {
            this.cube = UnitCube();
            this.cube.transform(m4_scaling([1,3,1]));
            this.cube.setColor(this.actor.color);
            this.cube.load();
            this.cube.clear();

            this.material = new Material();
            this.material.pass = 'opaque';
            this.material.texture.loadFromURL(paper);

            this.setDrawCall(new DrawCall(this.cube, this.material));
            // console.log(this.cube);
            // console.log(this.material);
        }
    }

    get lookGlobal() {
        const m = m4_translation([0,1,0]);
        return m4_multiply(this.global, m);
    }

    destroy() {
        if (this.isMyPlayerPawn) playerPawn = null;
        super.destroy();

    }

    activateControls() {
        this.unsubscribe("hud", "enterGame");

        // this.subscribe("input", "dDown", () => this.turnRight(-1));
        // this.subscribe("input", "dUp", () => this.turnRight(0));
        // this.subscribe("input", "aDown", () => this.turnLeft(1));
        // this.subscribe("input", "aUp", () => this.turnLeft(0));

        // this.subscribe("input", "ArrowRightDown", () => this.turnRight(-1));
        // this.subscribe("input", "ArrowRightUp", () => this.turnRight(0));
        // this.subscribe("input", "ArrowLeftDown", () => this.turnLeft(1));
        // this.subscribe("input", "ArrowLeftUp", () => this.turnLeft(0));

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
        // this.subscribe("hud", "left", f => this.turnLeft(1 * f));
        // this.subscribe("hud", "right", f => this.turnRight(-1 * f));

        this.subscribe("input", " Down", this.shoot);
        this.subscribe("input", "touchTap", this.shoot);

        this.subscribe("input", "mouseDelta", this.mouseDelta)

    }

    // turnRight(a) {
    //     this.right = a;
    //     this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    // }

    // turnLeft(a) {
    //     this.left = a;
    //     this.setSpin(q_axisAngle([0,1,0], 0.0015 * (this.right + this.left)));
    // }

    goFore(z) {
        this.fore = z;
        this.setVelocity([0, 0,  0.01 * (this.fore + this.back)]);
    }

    goBack(z) {
        this.back = z;
        this.setVelocity([0, 0,  0.01 * (this.fore + this.back)]);
    }

    shoot() {
        this.say("shoot");
    }

    mouseDelta(xy) {
        console.log(xy);
    }

    setName(name) { this.say("setName", name); }

}
PlayerPawn.register('PlayerPawn');
