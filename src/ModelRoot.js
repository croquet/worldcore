import { Model } from "@croquet/teatime";
import { ActorManager} from "./Actor";

//------------------------------------------------------------------------------------------
//-- ModelRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends Model {
    init() {
        super.init();
        console.log("Starting model ...");
        this.managers = new Set();
        this.actorManager = this.addManager(ActorManager.create());
    }

    destroy() {
        super.destroy();
        this.managers.forEach(m => m.destroy());
    }

    addManager(m) {
        this.managers.add(m);
        return m;
    }
}
ModelRoot.register("ModelRoot");
