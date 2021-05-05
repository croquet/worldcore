import { NamedView, GetNamedView, v3_divide, Cube, Material, DrawCall, m4_translation, v3_multiply } from "@croquet/worldcore";
import { Voxels, FilteredVoxelRaycast } from "./Voxels";

export class Cursor extends NamedView {
    constructor(model) {
        super("Cursor", model);
        this.viewRoot =  GetNamedView("ViewRoot");
        this.xy = [0,0];
        this.mode = 'empty';

        this.mesh = Cube(Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ, [0.5, 0.5, 0.5, 0.5]);
        this.mesh.transform(m4_translation([Voxels.scaleX/2, Voxels.scaleY/2, Voxels.scaleZ/2]));
        this.mesh.load();
        this.material = new Material();
        this.material.pass = 'translucent';
        this.material.zOffset = 0;
        this.drawCall = new DrawCall(this.mesh, this.material);
        this.viewRoot.render.scene.addDrawCall(this.drawCall);

        this.subscribe("ui", "pointerMove", this.onPointerMove);
    }

    onPointerMove(d) {
        this.xy = d.xy;
    }

    update(time, delta) {

        const camera = this.viewRoot.render.camera;
        const topLayer = Voxels.sizeZ;
        const voxels = this.viewRoot.model.voxels;
        const surfaces = this.viewRoot.model.surfaces;

        const start = v3_divide(camera.location, Voxels.scale);
        const aim = v3_divide(camera.viewLookRay(...this.xy), Voxels.scale);

        const raycast = FilteredVoxelRaycast(start, aim);

        this.solid = raycast.find(rc => {
            if ( rc[2] >= topLayer) return false;
            return (voxels.get(...rc) !== 0);
        });

        let intersect;
        let direction;
        this.empty = raycast.find(rc => {
            if ( rc[2] >= topLayer) return false;
            const key = Voxels.packKey(...rc);
            const surface = surfaces.get(key);
            if (!surface) return false;
            for (direction = 5; direction >=0; direction--) {
                intersect = surface.intersect(start, aim, direction);
                if (intersect) return true;
            }
            return false;
        });
        this.intersect = intersect;
        this.direction = direction;

        let xyz;
        switch(this.mode) {
            case 'solid':    xyz = this.solid; break;
            case 'empty':    xyz = this.empty; break;
            default:
        }

        if (xyz) {
            this.drawCall.isHidden = false;
            const location = v3_multiply([Voxels.scaleX, Voxels.scaleY, Voxels.scaleZ], xyz);
            this.drawCall.transform.set(m4_translation(location));
        } else {
            this.drawCall.isHidden = true;
        }

    }

}