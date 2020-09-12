import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_ThreeVisible } from "@croquet/worldcore";
import * as THREE from "three";
import uv_grid from "../assets/UV_Grid_Sm.jpg";
import grass from "../assets/terrain/grasslight-big.jpg";
export class WorldActor extends mix(Actor).with(AM_Spatial) {
    init() { super.init("WorldPawn"); }
}
WorldActor.register('WorldActor');


export class WorldPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(...args) {
        super(...args);
        let group = new THREE.Group();
        let cubeTexture = new THREE.TextureLoader().load( uv_grid );
        let floorTexture = new THREE.TextureLoader().load( grass );

        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(25,25);
        floorTexture.anisotropy = 16;
        floorTexture.encoding = THREE.sRGBEncoding;

        const floor = new THREE.Mesh(
            // width, height, widthSegments, heightSegments
            new THREE.PlaneGeometry(200, 200, 10, 10),
            new THREE.MeshStandardMaterial( { map: floorTexture} )
        );
        //floor.position.y = -1.5;
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(floor);
        group.add(new THREE.AmbientLight( 0x222222  ));


        var light = new THREE.DirectionalLight( 0xdfebff, 1 );
        //light.position.set( 50, 200, 100 );
        light.position.set( 100, 100, 0 );
        light.position.multiplyScalar( 1.3 );

        light.castShadow = true;

        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

        var d = 300;

        light.shadow.camera.left = - d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = - d;

        light.shadow.camera.far = 1000;

        this.setRenderObject(group);
        group.parent.add(light);
/*
        const c = [0.4, 0.8, 0.2, 1];

        this.ground = new Triangles();
        this.ground.addFace([[-100,0,100], [100,0,100], [100,0,-100], [-100,0,-100]], [c,c,c,c], [[0,0], [100,0], [100,100], [0,100]]);

        let cube;

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [98, 10, 98]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [-98, 10, -98]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [98, 10, -98]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [-98, 10, 98]));
        cube.setColor(c);
        this.ground.merge(cube);


        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [98, 10, 0]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [-98, 10, 0]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [0, 10, -98]));
        cube.setColor(c);
        this.ground.merge(cube);

        cube = UnitCube();
        cube.transform(m4_scalingRotationTranslation([4,20,4], q_identity(), [0, 10, 98]));
        cube.setColor(c);
        this.ground.merge(cube);

        this.ground.load();
        this.ground.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(paper);

        this.draw = new DrawCall(this.ground, this.material);

        this.setDrawCall(this.draw);
        */
    }

    destroy() {
        super.destroy();
        /*
        this.ground.destroy();
        this.material.destroy();
        */
    }

}
WorldPawn.register('WorldPawn');
