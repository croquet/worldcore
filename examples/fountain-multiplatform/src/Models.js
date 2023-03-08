// Worldcore with Rapier and Unity
//
// Croquet Corporation, 2023

// fountain-specific models

const { sphericalRandom, v3_scale, v3_normalize } = globalThis.Worldcore;
const { StaticGameActor, DynamicGameActor, GameWorldActor, GameModelRoot } = globalThis.Game_Models;

// can't import the views, because we don't know which views we'll be paired with
/* global SprayPawn, FountainPawn */

function rgb(r, g, b) {
    return [r / 255, g / 255, b / 255];
}

//------------------------------------------------------------------------------------------
//-- SprayActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class SprayActor extends DynamicGameActor {
    get pawn() { return SprayPawn; }

    get index() { return this._index || 0; }

    init(options) {
        super.init(options);
        this.buildCollider();
    }

    buildCollider() {
        const { RAPIER } = globalThis.Worldcore;
        let cd;
        switch (this.type) {
            // NB: Rapier collider sizes are based on half-lengths, so (for
            // example) a unit cube in Unity calls for a collider of size 0.5.
            case "cone":
                cd = RAPIER.ColliderDesc.cone(0.5, 0.5);
                cd.setDensity(3);
                break;
            case "ball":
                cd = RAPIER.ColliderDesc.ball(0.5);
                cd.setDensity(2);
                break;
            case "cylinder":
                cd = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
                cd.setDensity(1.5);
                break;
            case "cube":
            default:
                cd = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
                cd.setDensity(1);
                break;
        }

        this.createCollider(cd);
    }
}
SprayActor.register('SprayActor');

//------------------------------------------------------------------------------------------
//-- EnvironmentActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// static objects representing the scene boundaries
class EnvironmentActor extends StaticGameActor {
    init(options) {
        options.type = 'primitiveCube';
        options.color = options.color || [0.7, 0.7, 0.7];
        super.init(options);
        this.buildCollider(options.scale);
    }

    buildCollider(scale) {
        const { RAPIER } = globalThis.Worldcore;
        const cd = RAPIER.ColliderDesc.cuboid(...scale.map(l => l * 0.5));
        this.createCollider(cd);
    }
}
EnvironmentActor.register('EnvironmentActor');

//------------------------------------------------------------------------------------------
//-- FountainActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class FountainActor extends GameWorldActor {
    get pawn() { return FountainPawn; }

    init(options) {
        super.init(options);
        this.live = [];

        [
            { scale: [40, 1, 40], translation: [0, -0.5, 0], alpha: 0 }, // ground (invisible)
            { scale: [1, 3, 1], translation: [0, 1.5, 0], color: [0.8, 0.3, 0.3] }, // fountain itself
            { scale: [1, 5, 41], translation: [-20, 2.5, 0] },
            { scale: [1, 5, 41], translation: [20, 2.5, 0] },
            { scale: [41, 5, 1], translation: [0, 2.5, 20] },
            { scale: [41, 5, 1], translation: [0, 2.5, -20] },
        ].forEach(({ scale, translation, color, alpha }) => {
            EnvironmentActor.create({ parent: this, scale, translation, color, alpha });
        });

        this.subscribe('ui', 'shoot', this.doShoot);
        this.subscribe('ui', 'reset', this.reset);

        this.future(1000).spray();
    }

    addLiveObject(actor) {
        this.live.push(actor);
        if (this.live.length > 400) this.live.shift().destroy();
    }

    spray() {
        this.spawn();
        if (!this.doomed) this.future(500).spray();
    }

    spawn() {
        const type = this.chooseRandomType();
        const index = Math.floor(this.random() * 20);
        const spray = SprayActor.create({ parent: this, type, index, translation: [0, 3, 0] });
        this.addLiveObject(spray);

        const spin = v3_scale(sphericalRandom(), Math.random() * 0.5);
        const force = [0, 17.5 + 5 * Math.random(), 0];

        const { RAPIER } = globalThis.Worldcore;
        spray.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        spray.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

    doShoot() {
        const type = this.chooseRandomType();
        const translation = [0, 14, -18];
        const index = Math.floor(this.random() * 20);
        const bullet = SprayActor.create({ parent: this, type, index, translation });
        this.addLiveObject(bullet);

        const aim = v3_normalize([0, 0.5, 1]);
        const force = v3_scale(aim, 15);
        const spin = v3_scale(sphericalRandom(), Math.random() * 0.5);

        const { RAPIER } = globalThis.Worldcore;
        bullet.rigidBody.applyImpulse(new RAPIER.Vector3(...force), true);
        bullet.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(...spin), true);
    }

    chooseRandomType() {
        const random = this.random();
        let type = "cube";
        if (random > 0.4) type = "cylinder";
        if (random > 0.75) type = "ball";

        return type;
    }

    reset() {
        this.live.forEach(sprayActor => sprayActor.destroy());
        this.live.length = 0;
    }
}
FountainActor.register('FountainActor');

class MyModelRoot extends GameModelRoot {
    init(...args) {
        super.init(...args);
        globalThis.timedLog("Start root model!!");
        this.seedColors();

        this.fountain = FountainActor.create({ gravity: [0, -9.8, 0], translation: [0, 0, 0] }); // NB: use default timeStep of 50ms (see AM_RapierWorld)
this.versionBump = 1;
    }

    seedColors() {
        this.colors = [
            rgb(242, 215, 213),        // Red
            rgb(217, 136, 128),        // Red
            rgb(192, 57, 43),        // Red

            rgb(240, 178, 122),        // Orange
            rgb(230, 126, 34),        // Orange
            rgb(175, 96, 26),        // Orange

            rgb(247, 220, 111),        // Yellow
            rgb(241, 196, 15),        // Yellow
            rgb(183, 149, 11),        // Yellow

            rgb(125, 206, 160),        // Green
            rgb(39, 174, 96),        // Green
            rgb(30, 132, 73),        // Green

            rgb(133, 193, 233),         // Blue
            rgb(52, 152, 219),        // Blue
            rgb(40, 116, 166),        // Blue

            rgb(195, 155, 211),        // Purple
            rgb(155, 89, 182),         // Purple
            rgb(118, 68, 138),        // Purple

            [0.9, 0.9, 0.9],        // White
            [0.5, 0.5, 0.5],        // Gray
            [0.2, 0.2, 0.2]        // Black
        ];
    }
}
MyModelRoot.register("MyModelRoot");
globalThis.MyModelRoot = MyModelRoot; // so it can be referred to from view code on Node
