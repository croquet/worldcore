import { Constants } from "@croquet/croquet";
import {Actor} from "./Actor";
import {ModelService} from "./Root";
import { AM_Spec, CreateFromSpec} from "./Spec";
import { mix, AM_Spatial } from "./Mixins";

Constants.WC_LEVELS = new Map();

//------------------------------------------------------------------------------------------
// Level -----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Level extends mix(Actor).with(AM_Spatial) {

    save(layer) {
        const spec = {};
        if (this.children.size > 0) spec.children = [];
        for (const child of this.children) { if (child.toSpec) spec.children.push(child.toSpec(layer)); }
        return JSON.stringify(spec);
    }

    load(json) {
        const spec = JSON.parse(json);
        this.destroyChildren();
        CreateFromSpec(this,spec);
    }

}
Level.register('Level');

//------------------------------------------------------------------------------------------
//-- LevelManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Need to take avatar out before loading.

export class LevelManager extends ModelService {

    init() {
        super.init('LevelManager');
        this.current = Level.create();
    }

}
LevelManager.register("LevelManager");
