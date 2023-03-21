import { PM_ThreeCamera, ViewService, PM_Avatar, WidgetManager2,  v3_rotate, ThreeInstanceManager, ViewRoot, Pawn, mix,
    InputManager, PM_ThreeVisible, ThreeRenderManager, PM_Spatial, THREE,
    PM_Smoothed, toRad, m4_rotation, m4_multiply, TAU, m4_translation, q_multiply, q_axisAngle, v3_scale, v3_add, ThreeRaycast, PM_ThreeCollider,
    PM_ThreeInstanced, Reflector } from "@croquet/worldcore";
import { PathDebug } from "./Paths";
import darktile from "/assets/Gray_rough_tiles_2k_BaseColor.png";
import darktilenorm from "/assets/Gray_rough_tiles_2k_Normal.png";
import darktilerough from "/assets/Gray_rough_tiles_2k_Roughness.png";
import fireballTexture from "/assets/explosion.png";
import smokeTexture from "/assets/Smoke-Element.png";

import * as fireballFragmentShader from "/assets/fireball.frag.js";
import * as fireballVertexShader from "/assets/fireball.vert.js";

function createBoxWithRoundedEdges( width, height, depth, radius0, smoothness ) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc( eps, eps, eps, -Math.PI / 2, -Math.PI, true );
    shape.absarc( eps, height -  radius * 2, eps, Math.PI, Math.PI / 2, true );
    shape.absarc( width - radius * 2, height -  radius * 2, eps, Math.PI / 2, 0, true );
    shape.absarc( width - radius * 2, eps, eps, 0, -Math.PI / 2, true );
    let geometry = new THREE.ExtrudeBufferGeometry( shape, {
      amount: depth - radius0 * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      steps: 1,
      bevelSize: radius,
      bevelThickness: radius0,
      curveSegments: smoothness
    });
    
    geometry.center();
    
    return geometry;
  }

let fireMaterial = function makeFireMaterial(){
    let texture = new THREE.TextureLoader().load(fireballTexture)
    return new THREE.ShaderMaterial( {
        uniforms: {
        tExplosion: {
            type: "t",
            value: texture
        },
        time: {
            type: "f",
            value: 0.0
        },
        tOpacity: {
            type: "f",
            value: 1.0
        }
        },
        vertexShader: fireballVertexShader.vertexShader(),
        fragmentShader: fireballFragmentShader.fragmentShader()
    } );
}();

let smokeMaterial = function makeSmokeMaterial(){
    let texture = new THREE.TextureLoader().load(smokeTexture);
    let smokeMaterial = new THREE.MeshLambertMaterial({color: 0x00dddd, map: texture, transparent: true});
    return smokeMaterial;
}();

//------------------------------------------------------------------------------------------
// TestPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class TestPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.buildMesh();
        this.addRenderObjectToRaycast();
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }

    buildMesh() {
        this.geometry = createBoxWithRoundedEdges(3, 1.5, 3, .25, 3);
        //this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.1,0.1,0.1)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;

        const mesh = new THREE.Mesh( this.geometry, this.material );

        mesh.receiveShadow = true;
        mesh.castShadow = true;
        /*
this.smokeGeo = new THREE.PlaneGeometry(10,10);
var particle = new THREE.Mesh(this.smokeGeo, smokeMaterial);
particle.position.y=10;
mesh.add(particle);
*/
        this.setRenderObject(mesh);
        this.addRenderObjectToRaycast();
    }
}
TestPawn.register("TestPawn");

//------------------------------------------------------------------------------------------
// FireballPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class FireballPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.listen("updateFire",this.fireUpdate);
        this.material = fireMaterial.clone();
        this.geometry = new THREE.IcosahedronGeometry( 10, 20 );
        this.fireball = new THREE.Mesh(this.geometry, this.material);
        this.pointLight = new THREE.PointLight(0xff8844, 1, 4, 2);
        this.fireball.add(this.pointLight);

        this.smokeGeo = new THREE.PlaneGeometry(10,10);
        this.smokeParticles = [];
        this.smokeGroup = new THREE.Group();
        this.smokeGroup.position.y = 4;
        for (let p = 0; p < 5; p++) {
            var particle = new THREE.Mesh(this.smokeGeo, smokeMaterial);
            particle.position.set(Math.random()*5-2.5,Math.random()*5-2.5,Math.random()*5-2.5);
            particle.rotation.z = Math.random() * 360;
            this.smokeGroup.add(particle);
            this.smokeParticles.push(particle);
        }
        this.fireball.add(this.smokeGroup);
        this.setRenderObject(this.fireball);
    }

    fireUpdate(u){
        if(this.fireball){
            let t=u[0];
            this.fireball.material.uniforms[ 'time' ].value = t*this.actor.timeScale;
            this.fireball.material.uniforms[ 'tOpacity' ].value = 0.25;
            this.pointLight.intensity = 0.25+ 0.75* Math.sin(t*0.020)*Math.cos(t*0.007);
        }
        const rm = this.service("ThreeRenderManager");
        if(this.smokeParticles){
            this.smokeParticles.forEach( particle => particle.quaternion.copy( rm.camera.quaternion ));
        }
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
        this.pointLight.dispose();
    }

}
FireballPawn.register("FireballPawn");

//------------------------------------------------------------------------------------------
// BotPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("botBody");
        this.addRenderObjectToRaycast("bot");
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    }

    killMe(){
        this.say("killMe");
    }
}
BotPawn.register("BotPawn");

//------------------------------------------------------------------------------------------
// BotEyePawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BotEyePawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider, PM_ThreeInstanced) {

    constructor(actor) {
        super(actor);
        this.useInstance("botEye");
    //    this.addRenderObjectToRaycast();
    }

    killMe(){
        this.say("killMe");
    }

    destroy() {
        this.releaseInstance();
        super.destroy();
    }
}

BotEyePawn.register("BotEyePawn");

//------------------------------------------------------------------------------------------
// LaserPawn --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class LaserPawn extends mix(Pawn).with(PM_Smoothed, PM_ThreeVisible, PM_ThreeCollider) {

    constructor(actor) {
        super(actor);
        this.height = 0.05;
        this.buildMesh();
        console.log(this.actor._color)
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }
    
    generateLaserMaterial() {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 64;
        // set gradient
        var gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(  0,  0,  0,0.1)');
        gradient.addColorStop(0.1, 'rgba(160,160,160,0.3)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(0.9, 'rgba(160,160,160,0.3)');
        gradient.addColorStop(1.0, 'rgba(  0,  0,  0,0.1)');
        // fill the rectangle
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        // return the just built canvas 
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
    
        //texture
        var material = new THREE.MeshBasicMaterial({
            map: texture,
            blending: THREE.AdditiveBlending,
            color: 0xff44aa,
            side: THREE.DoubleSide,
            depthWrite: false,
            transparent: true
        });
        return material;
    }

    buildMesh() {
        this.group = new THREE.Group();

        this.material = this.generateLaserMaterial();
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;
        console.log(this.material.color)
        this.material.color = new THREE.Color(this.actor._color);

        this.geometry1 = new THREE.PlaneGeometry( 2, 0.1 );
        this.geometry2 = new THREE.PlaneGeometry( 2, 0.1 );
        this.geometry2.rotateX(toRad(90));
        //this.geometry3 = new THREE.PlaneGeometry( 2, 0.1 );
        //this.geometry3.rotateX(toRad(90));

        this.mesh1 = new THREE.Mesh( this.geometry1, this.material );
        this.mesh2 = new THREE.Mesh( this.geometry2, this.material );        
        //this.mesh3 = new THREE.Mesh( this.geometry3, this.material );  
        //this.mesh3.position.y= -1;
        this.group.add( this.mesh1 );
        this.group.add( this.mesh2 );
        //this.group.add( this.mesh3 );

       // mesh.receiveShadow = true;
       // mesh.castShadow = true;

        this.setRenderObject(this.group);
        this.addRenderObjectToRaycast();
    }
}
LaserPawn.register("LaserPawn");

//------------------------------------------------------------------------------------------
//-- BasePawn -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BasePawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible, PM_ThreeCollider) {
    constructor(...args) {
        super(...args);

        let floorMat = new THREE.MeshStandardMaterial( {
            roughness: 0.8,
            color: 0xffffff,
            metalness: 0.2,
            bumpScale: 0.0005,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.4
        } );

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load( darktile, function ( map ) {

            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set( 25, 25 );
            map.encoding = THREE.sRGBEncoding;
            floorMat.map = map;
            floorMat.needsUpdate = true;

        } );
        textureLoader.load( darktilenorm, function ( map ) {

            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set( 20, 20 );
            floorMat.normalMap = map;
            floorMat.needsUpdate = true;

        } );

        textureLoader.load( darktilerough, function ( map ) {

            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set( 20, 20 );
            floorMat.roughnessMap = map;
            floorMat.needsUpdate = true;

        } );

        this.material = floorMat;
        /*
        this.material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.4, 0.8, 0.2)} );
        this.material.side = THREE.DoubleSide;
        this.material.shadowSide = THREE.DoubleSide;
*/
        this.geometry = new THREE.PlaneGeometry(100,100);
        //this.geometry.rotateX(toRad(90));

        const mirrorGeometry = new THREE.PlaneGeometry(100, 100);
        //mirrorGeometry.rotateX(toRad(-90));
        const mirror = new Reflector(
            mirrorGeometry,
            {
                clipBias: 0.003,
                color: 0x5588aa,
                //side:THREE.DoubleSide,
                //fog: scene.fog !== undefined
            }
        );

        mirror.position.z=-0.04
        ;
        const base = new THREE.Mesh( this.geometry, this.material );
        base.add(mirror);
        base.receiveShadow = true;
        base.rotation.x = Math.PI / 2;

/*
        const bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );

        let bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );

        let bulbMat = new THREE.MeshStandardMaterial( {
            emissive: 0xffffee,
            emissiveIntensity: 1,
            color: 0x000000,
            side: THREE.FrontSide
        } );
        bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
        bulbLight.position.set( 0, 1, 0 );
        bulbLight.castShadow = true;
        base.add( bulbLight );
        */

        this.setRenderObject(base);
        this.addRenderObjectToRaycast("ground");
    }

    destroy() {
        super.destroy()
        this.geometry.dispose();
        this.material.dispose();
    }
}
BasePawn.register("BasePawn");

//------------------------------------------------------------------------------------------
//-- GodView -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let fov = 60;
let pitch = toRad(-20);
let yaw = toRad(-30);

class GodView extends ViewService {

    constructor() {
        super("GodView");

        this.updateCamera();

        this.subscribe("input", 'wheel', this.onWheel);
        this.subscribe("input", "pointerDown", this.doPointerDown);
        this.subscribe("input", "pointerUp", this.doPointerUp);
        this.subscribe("input", "pointerDelta", this.doPointerDelta);
        this.subscribe("input", "pointerMove", this.doPointerMove);
        this.subscribe("input", "click", this.doClick);
        this.subscribe("input", "mDown", this.point);
    }

    doClick(){
        let pawn = this.point("bot");
        if(pawn)pawn.killMe();
    }

    doPointerMove(e) {
        this.xy = e.xy;
    }

    point(layer) {
        const rc = this.service("ThreeRaycast");
        const hits = rc.cameraRaycast(this.xy, layer);
        if (hits.length<1) return;
        const hit = hits[0];
        const pawn = hit.pawn;
        return hit.pawn;
    }

    updateCamera() {
        if (this.paused) return;
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
        if (this.paused) return;
        const rm = this.service("ThreeRenderManager");
        fov = Math.max(10, Math.min(120, fov + data.deltaY / 50));
        rm.camera.fov = fov;
        rm.camera.updateProjectionMatrix();
    }

    doPointerDown() {
        if (this.paused) return;
        this.dragging = true;
    }

    doPointerUp() {
        if (this.paused) return;
        this.dragging = false;
    }

    doPointerDelta(e) {
        if (this.paused) return;
        if (!this.dragging) return;
        yaw += -0.01 * e.xy[0];
        yaw = yaw % TAU;
        pitch += -0.01 * e.xy[1];
        pitch = Math.min(pitch, toRad(-5));
        pitch = Math.max(pitch, toRad(-90));
        this.updateCamera()
    }
}

//------------------------------------------------------------------------------------------
//-- MyViewRoot ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyViewRoot extends ViewRoot {

    static viewServices() {
        return [InputManager, ThreeRenderManager, GodView, WidgetManager2, ThreeInstanceManager, ThreeRaycast];
    }

    onStart() {
        this.buildInstances()
        this.buildLights();
        this.buildHUD();
       // this.pathDebug = new PathDebug(this.model);

    }

    buildLights() {
        const rm = this.service("ThreeRenderManager");
        rm.renderer.setClearColor(new THREE.Color(0.2, 0.2, 0.2));

        const group = new THREE.Group();

        const ambient = new THREE.AmbientLight( 0xffffff, 1 );
        group.add(ambient);

        const sun = new THREE.DirectionalLight( 0xffffff, 0.5 );
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

        sun.shadow.bias = -0.0005;
        group.add(sun);

        const blueLight = new THREE.DirectionalLight(0x444488, 0.5);
        blueLight.position.set(-150, 100, 0);
        group.add(blueLight);

        const redLight = new THREE.DirectionalLight(0x774444, 0.5);
        redLight.position.set(0, 100, -150);
        group.add(redLight);

        rm.scene.add(group);
        //rm.renderer.toneMapping = THREE.ReinhardToneMapping;
        //rm.renderer.toneMappingExposure = Math.pow( 1.1, 2.0 );
/*
        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
        bloomPass.threshold = 0;
        bloomPass.strength = 0.001;
        bloomPass.radius = 0;
        console.log(rm.composer)
        rm.composer.addPass(bloomPass);
*/
/*
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load( skybox, function ( map ) {
           // rm.scene.background = map;
            rm.scene.environment = map;
        } );
        */
    }

    buildHUD() {
        const wm = this.service("WidgetManager2");
    }

    buildInstances() {
        const im = this.service("ThreeInstanceManager");

        const  material = new THREE.MeshStandardMaterial( {color: new THREE.Color(0,1,0)} );
        material.side = THREE.FrontSide;
        material.shadowSide = THREE.BackSide;
        im.addMaterial("default", material);

        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        im.addGeometry("cube", geometry);

        const mmm = im.addMesh("cube", "cube", "default");
        mmm.castShadow = true;


        const botBody = new THREE.SphereGeometry( 0.25, 32, 16, 0, Math.PI * 2, 0, 2.6); 
        botBody.rotateX(Math.PI/2);
        im.addGeometry("botBody", botBody);
        const botMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.5,0.5,0.5), metalness:1.0, roughness:0.3} );
        botMaterial.side = THREE.DoubleSide;
        im.addMaterial("botBody", botMaterial);
        im.addMesh("botBody", "botBody", "botBody");

        const botEye = new THREE.SphereGeometry( 0.20, 32, 16); 
        im.addGeometry("botEye", botEye);
        const botEyeMaterial = new THREE.MeshStandardMaterial( {color: new THREE.Color(0.75,0.15,0.15)} );
        botEyeMaterial.side = THREE.FrontSide;
        im.addMaterial("botEye", botEyeMaterial);
        im.addMesh("botEye", "botEye", "botEye");

        const eye = new THREE.Mesh( this.geometry2, this.material2 );

    }


}