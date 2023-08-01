import { Constants } from "@croquet/croquet";
import {Actor} from "./Actor";
import {ModelService} from "./Root";
import { AM_Spec, CreateFromSpec} from "./Spec";
import { mix, AM_Spatial } from "./Mixins";

Constants.WC_LEVELS = new Map();
const xxx = '{"children":[{"actor":"BaseActor","pawn":"GroundPawn","children":[{"actor":"SunActor","pawn":"TestPawn","name":"sun","translation":[0,2,0],"rotation":[0,-0.7654481535684707,0,-0.6434975712453148],"children":[{"actor":"PlanetActor","pawn":"PlanetPawn","name":"planet","translation":[5,0,0],"rotation":[0,0,-0.9314829563659172,0.36378496670397775]}]}]}]}';
const yyy = '{"children":[{"actor":"BaseActor","pawn":"GroundPawn","children":[{"actor":"SunActor","pawn":"BallPawn","name":"sun","translation":[0,2,0],"rotation":[0,-0.7654481535684707,0,-0.6434975712453148],"children":[{"actor":"PlanetActor","pawn":"PlanetPawn","name":"planet","translation":[5,0,0],"rotation":[0,0,-0.9314829563659172,0.36378496670397775]}]}]}]}';

Constants.WC_LEVELS.set("bing", xxx);
Constants.WC_LEVELS.set("bong", yyy);

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

export class LevelManager extends ModelService {

    init() {
        super.init('LevelManager');
        this.current = Level.create();
    }

    save(layer) {
        const spec = this.current.save(layer);
        return spec;
    }

    load(key) {
        const json = Constants.WC_LEVELS.get(key);
        if (json) {
            this.current.load(json);
        } else {
            console.error("Level " + key + " not found!");
        }
    }

}
LevelManager.register("LevelManager");
