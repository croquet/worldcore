import { GetNamedView, NamedView } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

export class Editor extends NamedView {
    constructor(model) {
        super("Editor", model);
        this.subscribe("ui", "pointerDown", this.onPointerDown);
    }

    onPointerDown(data) {
        const cursor = GetNamedView("Cursor");

        const xyz = cursor.empty;

        if (xyz) this.publish("editor", "setVoxel", {xyz, type: Voxels.dirt})
    }
}