// Demolition Demo

import { App, Model} from "@croquet/worldcore";
import { ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, THREE,
    AM_Smoothed, PM_Smoothed, sphericalRandom, q_axisAngle, m4_scaleRotationTranslation, toRad, v3_scale, m4_rotation, m4_multiply,
    WidgetManager2, Widget2, ButtonWidget2, q_dot, q_equals, TAU, m4_translation, v3_transform, v3_add, v3_sub, v3_normalize, v3_magnitude } from "@croquet/worldcore";

import { InstanceManager, PM_ThreeVisibleInstanced } from "./src/Instances";

import { AM_RapierDynamicRigidBody, RapierManager, RAPIER, AM_RapierStaticRigidBody, AM_RapierWorld } from "./src/Rapier";



//------------------------------------------------------------------------------------------
//-- BlockActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return BlockPawn}

    get shape() { return this._shape || "111" }

    init(options) {
        super.init(options);
        // this.buildCollider();
        // this.worldActor.blocks.add(this);
    }

    destroy() {
        super.destroy();
        // this.worldActor.blocks.delete(this);
    }

    // buildCollider() {
    //     let d = [0.5,0.5,0.5]
    //     switch(this.shape) {
    //         case "121":
    //             d = [0.5,1,0.5];
    //             break;
    //         case "414":
    //             d = [2,0.5,2];
    //             break;
                
    //         case "111":
    //         default:  
    //     }
    //     const cd = RAPIER.ColliderDesc.cuboid(...d);
    //     cd.setDensity(1)
    //     cd.setFriction(2)
    //     cd.setRestitution(0.01);
    //     this.createCollider(cd);

    // }

    translationSet(t) {
        if (t[1] > -50) return;
        // console.log("kill plane");
        this.future(0).destroy();
    }

}
BlockActor.register('BlockActor');

//------------------------------------------------------------------------------------------
//-- BlockPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BlockPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance(this.actor.shape);
    }
}

//------------------------------------------------------------------------------------------
//-- BulletActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BulletActor extends mix(Actor).with(AM_Smoothed, AM_RapierDynamicRigidBody) {
    get pawn() {return BulletPawn}

    init(options) {
        super.init(options);
        // this.buildCollider();
        this.future(10000).destroy()
        // this.subscribe("base", "reset", this.destroy);
    }


    // buildCollider() {
    //     const cd = RAPIER.ColliderDesc.ball(0.5);
    //     cd.setDensity(3)
    //     cd.setRestitution(0.95);
    //     this.createCollider(cd);
    // }

}
BulletActor.register('BulletActor');

//------------------------------------------------------------------------------------------
//-- BulletPawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BulletPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance("ball");
    }
}

//------------------------------------------------------------------------------------------
//-- BarrelActor -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BarrelActor extends mix(Actor).with(AM_Smoothed) {
    get pawn() {return BarrelPawn}

    init(options) {
        super.init(options);
    }
}
BarrelActor.register('BarrelActor');

//------------------------------------------------------------------------------------------
//-- BarrelPawn ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BarrelPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisibleInstanced) {
    constructor(...args) {
        super(...args);
        this.useInstance("barrel");
    }

}


//------------------------------------------------------------------------------------------
//-- BaseActor ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BaseActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return BasePawn}

    init(options) {
        super.init(options);
        this.buildAll()

    }

    reset() {
        this.blocks.forEach (b => b.destroy());
        this.buildAll()
    }

    buildAll() {
        this.buildBuilding(2,5,2);
        this.buildBuilding(-2,5,2);
        this.buildBuilding(2,5,-2);
        this.buildBuilding(-2,5,-2);
    }

    build141(x,y,z) {
        BlockActor.create({parent: this, shape: "121", translation: [x,y+1,z]});
        BlockActor.create({parent: this, shape: "121", translation: [x,y+3,z]});
    }

    buildFloor(x,y,z) {
        this.build141(x-1.5,y,z-1.5);
        this.build141(x-1.5,y,z+1.5);
        this.build141(x+1.5,y,z-1.5);
        this.build141(x+1.5,y,z+ 1.5);
        BlockActor.create({parent: this, shape: "414", translation: [x+0, y+4.5, z+0]});
    }

    buildBuilding(x,y,z) {
        this.buildFloor(x,y,z);
        this.buildFloor(x,y+5,z);

        BlockActor.create({parent: this, shape: "111", translation: [x-1.5, y+10.5, z-1.5]});
        BlockActor.create({parent: this, shape: "111", translation: [x-1.5, y+10.5, z+1.5]});
        BlockActor.create({parent: this, shape: "111", translation: [x+1.5, y+10.5, z-1.5]});
        BlockActor.create({parent: this, shape: "111", translation: [x+1.5, y+10.5, z+1.5]});

        BlockActor.create({parent: this, shape: "111", translation: [x+0, y+10.5, z-1.5]});
        BlockActor.create({parent: this, shape: "111", translation: [x-0, y+10.5, z+1.5]});
        BlockActor.create({parent: this, shape: "111", translation: [x+1.5, y+10.5, z-0]});
        BlockActor.create({parent: this, shape: "111", translation: [x-1.5, y+10.5, z+0]});

    }

}
BaseActor.register('BaseActor');

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);

        // this.baseMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        // this.baseMaterial.side = THREE.DoubleSide;
        // this.baseMaterial.shadowSide = THREE.DoubleSide;


        // this.baseGeometry = new THREE.BoxGeometry( 100, 1, 100 );
        // this.baseGeometry.translate(0,4.5,0);

        // this.base = new THREE.Mesh( this.baseGeometry, this.baseMaterial );
        // this.base.receiveShadow = true;
        // this.setRenderObject(this.base);

        // ViewRoot.ground = this.base;
        // console.log(this.base);
        // console.log(ViewRoot.ground);
    }

    destroy() {
        super.destroy();
        // this.baseMaterial.dispose();
        // this.baseGeometry.dispose();
        // ViewRoot.ground = null;
    }
     
}

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [RapierManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!");

        this.base = BaseActor.create({gravity: [0,-9.8,0], timestep:15, translation: [0,0,0]});
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(-30);
let gun = [0,-1,50];

class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, InstanceManager, WidgetManager2];
    }

    constructor(model) {
        super(model);
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.45, 0.8, 0.8));
        this.startCamera();
        this.buildHUD();

       
        this.buildGround();
        console.log(this.ground);

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
    }

    buildGround() {
        console.log("build ground");
        const rm = this.service("ThreeRenderManager");
        this.groundMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.groundMaterial.side = THREE.DoubleSide;
        this.groundMaterial.shadowSide = THREE.DoubleSide;

        this.groundGeometry = new THREE.BoxGeometry( 100, 1, 100 );
        this.groundGeometry.translate(0,4.5,0);

        this.ground = new THREE.Mesh( this.groundGeometry, this.groundMaterial );
        this.ground.receiveShadow = true;
        rm.scene.add(this.ground);


    }


    startCamera() {
        const rm = this.service("ThreeRenderManager");

        this.updateCamera();

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 0.8 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.3 );
        sun.position.set(100, 100, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 4096;
        sun.shadow.mapSize.height = 4096;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 300;

        sun.shadow.camera.left = -80
        sun.shadow.camera.right = 80
        sun.shadow.camera.top = 80
        sun.shadow.camera.bottom = -80

        sun.shadow.bias = -0.0001;
        group.add(sun);

        rm.scene.add(group);
    }

    updateCamera() {
        const rm = this.service("ThreeRenderManager");

        const pitchMatrix = m4_rotation([1,0,0], pitch)
        const yawMatrix = m4_rotation([0,1,0], yaw)

        let cameraMatrix = m4_translation([0,0,50]);
        cameraMatrix = m4_multiply(cameraMatrix,pitchMatrix);
        cameraMatrix = m4_multiply(cameraMatrix,yawMatrix);
  
        rm.camera.matrix.fromArray(cameraMatrix);
        rm.camera.matrixAutoUpdate = false;
        rm.camera.matrixWorldNeedsUpdate = true;

        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    onWheel(data) {
        const rm = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    doPointerDown(e) {
        this.dragging = true;
        console.log(e.xy);
        console.log(this.ground);
    }

    doPointerUp(e) {
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (!this.dragging) return;
        yaw += -0.01 * e.xy[0];
        yaw = yaw % TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-10));
        pitch = Math.max(pitch, toRad(-60));
        this.updateCamera()
    }

    buildHUD() {
            const wm = this.service("WidgetManager2");
            const hud = new Widget2({parent: wm.root, autoSize: [1,1]});


            // const reset = new ButtonWidget2({parent: hud, anchor: [1,0], pivot:[1,0], translation: [-20,20], size: [200,50]});
            // reset.label.set({text:"Reset"});
            // reset.onClick = () => this.publish("ui", "reset");
    }

    raycast(xy) {
        const rm = this.service("ThreeRenderManager");
        this.pointerHit = null

        if (!rm) return;

        const x = ( xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( xy[1] / window.innerHeight ) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({x: x, y: y}, rm.camera);
        // const hits = raycaster.intersectObjects( viewRoot.mapView.collider );

        // if (hits && hits[0]) {
        //     const p = hits[0].point;
        //     const xyz = [ p.x / Constants.scaleX, p.y / Constants.scaleY, p.z / Constants.scaleZ ];
        //     const voxel = v3_floor(xyz);
        //     const fraction = v3_sub(xyz,voxel);
        //     this.pointerHit = {xyz, voxel, fraction};

        //     const surfaces = this.modelService("Surfaces");
        //     // console.log(surfaces.elevation(...xyz));
        // }
    }


}

// App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.demolition',
    apiKey: '1Mnk3Gf93ls03eu0Barbdzzd3xl1Ibxs7khs8Hon9',
    name: 'Physics',
    password: 'password',
    model: MyModelRoot,
    // name: App.autoSession(),
    view: MyViewRoot,
    tps:60
});