import { mix, Actor, Pawn, AM_Spatial, PM_Spatial, PM_Visible, Triangles, Material, DrawCall, UnitCube, m4_scalingRotationTranslation, q_identity } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";

export class SceneActor extends mix(Actor).with(AM_Spatial) {
    init() { super.init("ScenePawn"); }
}
SceneActor.register('SceneActor');


export class ScenePawn extends mix(Pawn).with(PM_Spatial, PM_Visible) {
    constructor(...args) {
        super(...args);

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
    }

    destroy() {
        super.destroy();
        this.ground.destroy();
        this.material.destroy();
    }

}
ScenePawn.register('ScenePawn');
