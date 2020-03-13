import { Model } from "@croquet/teatime";
import { ActorManager} from "./Actor";

//------------------------------------------------------------------------------------------
//-- ModelRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends Model {
    init() {
        super.init();
        console.log("Starting model ...");
        this.actorManager = ActorManager.create();
    }
}
ModelRoot.register("ModelRoot");
