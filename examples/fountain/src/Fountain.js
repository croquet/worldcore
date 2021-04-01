import { Actor, Pawn, mix, AM_Smoothed, PM_Smoothed, PM_InstancedVisible, GetNamedView, v3_scale, UnitCube, Material, InstancedDrawCall, AM_RapierPhysics,
    sphericalRandom, CachedObject, AM_Spatial, v3_transform, m4_rotationQ, Cylinder, Cone } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";

//------------------------------------------------------------------------------------------
// CubeSprayActor
//------------------------------------------------------------------------------------------

export class CubeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        this.index = Math.floor(Math.random() * 30);

        if(options.color) {
            this._color = options.color
            this.wellKnownModel("modelRoot").colors[this.index] = options.color;
        }

        if(options._viewId) {
            this._viewId = options._viewId;
        }

        super.init("CubeSprayPawn", options);

        this.addRigidBody({type: options.rigidBodyType || 'dynamic'});

        this.addBoxCollider({
            size: [0.5, 0.5, 0.5],
            density: 1,
            friction: 1,
            restitution: 0.00000001,
        });

    }

    destroy() {
        super.destroy()
        this.wellKnownModel("modelRoot").colors[this.index] = [0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1];
    }
}
CubeSprayActor.register('CubeSprayActor');

//------------------------------------------------------------------------------------------
// CubeSprayPawn
//------------------------------------------------------------------------------------------

class CubeSprayPawn extends mix(Pawn).with(...(window.hideFountain? [PM_Smoothed] : [PM_Smoothed, PM_InstancedVisible])) {
    constructor(...args) {
        super(...args);

        if(!window.hideFountain) {
            this.setDrawCall(CachedObject("cubeDrawCall" + this.actor.index, () => this.buildDraw()));
        }

        this.modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || this.modelRoot.colors[this.actor.index];

        if (window.webkit && window.webkit.messageHandlers.arwebkit && (!this.actor._viewId || !this.actor._viewId.includes("mobile"))) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "create pawn",

                id: this.actor.id,
                shape: "cube",
                color,

                rotation: this.actor.rotation,
                translation: this.actor.translation,
                scale: this.actor.scale,
            });
        }
    }

    buildDraw() {
        const mesh = CachedObject("cubeMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {


        const modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || modelRoot.colors[this.actor.index];
        const mesh = UnitCube();

        mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    detach() {
        super.detach();
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "remove pawn",
                
                id: this.actor.id,
            });
        }
    }

}
CubeSprayPawn.register('CubeSprayPawn');

//------------------------------------------------------------------------------------------
// CylinderSprayActor
//------------------------------------------------------------------------------------------

export class CylinderSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        this.index = Math.floor(Math.random() * 30);

        if(options.color) {
            this._color = options.color
            this.wellKnownModel("modelRoot").colors[this.index] = options.color;
        }

        super.init("CylinderSprayPawn", options);

        this.addRigidBody({type: 'dynamic'});

        this.addCylinderCollider({
            radius: 0.5,
            halfHeight: 0.5,
            density: 1.5,
            friction: 1,
            restitution: 0.00000001,
        });

    }

    destroy() {
        super.destroy()
        this.wellKnownModel("modelRoot").colors[this.index] = [0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1];
    }
}
CylinderSprayActor.register('CylinderSprayActor');



//------------------------------------------------------------------------------------------
// CylinderSprayPawn
//------------------------------------------------------------------------------------------

class CylinderSprayPawn extends mix(Pawn).with(...(window.hideFountain? [PM_Smoothed] : [PM_Smoothed, PM_InstancedVisible])) {
    constructor(...args) {
        super(...args);

        if(!window.hideFountain) {
            this.setDrawCall(CachedObject("cylinderDrawCall" + this.actor.index, () => this.buildDraw()));
        }

        this.modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || this.modelRoot.colors[this.actor.index];

        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "create pawn",
                
                id: this.actor.id,
                shape: "cylinder",
                color,

                rotation: this.actor.rotation,
                translation: this.actor.translation,
                scale: this.actor.scale,
            });
        }
    }

    buildDraw() {
        const mesh = CachedObject("cylinderMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {


        const modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || modelRoot.colors[this.actor.index];
        const mesh = Cylinder(0.5, 1, 12, color);

        mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    detach() {
        super.detach();
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "remove pawn",
                
                id: this.actor.id,
            });
        }
    }
}
CylinderSprayPawn.register('CylinderSprayPawn');

//------------------------------------------------------------------------------------------
// ConeSprayActor
//------------------------------------------------------------------------------------------

export class ConeSprayActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        this.index = Math.floor(Math.random() * 30);

        if(options.color) {
            this._color = options.color;
            this.wellKnownModel("modelRoot").colors[this.index] = options.color;
        }

        super.init("ConeSprayPawn", options);

        this.addRigidBody({type: 'dynamic'});

        this.addConeCollider({
            radius: 0.5,
            halfHeight: 0.5,
            density: 3,
            friction: 1,
            restitution: 0.00000001,
        });


    }

    destroy() {
        super.destroy()
        this.wellKnownModel("modelRoot").colors[this.index] = [0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 0.7*Math.random() + 0.3, 1];
    }
}
ConeSprayActor.register('ConeSprayActor');

//------------------------------------------------------------------------------------------
// ConeSprayPawn
//------------------------------------------------------------------------------------------

class ConeSprayPawn extends mix(Pawn).with(...(window.hideFountain? [PM_Smoothed] : [PM_Smoothed, PM_InstancedVisible])) {
    constructor(...args) {
        super(...args);

        this.modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || this.modelRoot.colors[this.actor.index];

        if(!window.hideFountain) {
            this.setDrawCall(CachedObject("coneDrawCall" + this.actor.index, () => this.buildDraw()));
        }

        if (window.webkit && window.webkit.messageHandlers.arwebkit && this.actor._viewId !== this.viewId) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "create pawn",
                
                id: this.actor.id,
                shape: "cone",
                color,

                rotation: this.actor.rotation,
                translation: this.actor.translation,
                scale: this.actor.scale,
            });
        }
    }

    buildDraw() {
        const mesh = CachedObject("coneMesh" + this.actor.index, () => this.buildMesh());
        const material = CachedObject("instancedPaperMaterial", this.buildMaterial);
        const draw = new InstancedDrawCall(mesh, material);

        GetNamedView('ViewRoot').render.scene.addDrawCall(draw);

        return draw;
    }

    buildMesh() {


        const modelRoot = GetNamedView('ViewRoot').model;
        const color = this.actor._color || modelRoot.colors[this.actor.index];

        const mesh = Cone(0.5, 0.01, 1, 12, color);

        mesh.setColor(color);
        mesh.load();
        mesh.clear();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'instanced';
        material.texture.loadFromURL(paper);
        return material;
    }

    detach() {
        super.detach();
        if (window.webkit && window.webkit.messageHandlers.arwebkit) {
            webkit.messageHandlers.arwebkit.postMessage({
                type: "remove pawn",
                
                id: this.actor.id,
            });
        }
    }
}
ConeSprayPawn.register('ConeSprayPawn');

//------------------------------------------------------------------------------------------
// FountainActor
//------------------------------------------------------------------------------------------

export class FountainActor extends mix(Actor).with(AM_Spatial) {
    init(options) {
        super.init("Pawn", options);
        this.spray = [];
        this.spawnLimit = 5;

        this.modelRoot = this.wellKnownModel("modelRoot");

        if (!this.modelRoot.disableFountain) {
            this.future(0).tick();
        }

        this.subscribe("hud", "pause", this.pause);
    }

    pause(p) {
        this.isPaused = p;
    }

    tick() {
        if (!this.isPaused) {
            if (this.spray.length >= this.spawnLimit) {
                const doomed = this.spray.shift();
                doomed.destroy();
            }
            let p;
            const r = Math.random();
            if (r < 0.4) {
                p = CubeSprayActor.create({translation: this.translation});
            } else if (r < 0.8) {
                p = CylinderSprayActor.create({translation: this.translation});
            } else {
                p = ConeSprayActor.create({translation: this.translation});
            }
            const spin = v3_scale(sphericalRandom(),Math.random() * 0.5);
            const rotationMatrix = m4_rotationQ(this.rotation);
            const force = v3_transform([0, 12 + 2 * Math.random(), 0], rotationMatrix);
            // const force = v3_transform([0, 18, 0], rotationMatrix);
            p.applyTorqueImpulse(spin);
            p.applyImpulse(force);
            this.spray.push(p);
        }
        this.future(1000).tick();
        //this.future(5000).tick();
    }

}
FountainActor.register('FountainActor');

