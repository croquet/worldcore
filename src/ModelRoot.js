import { Model } from "@croquet/croquet";
import { ActorManager} from "./Actor";

//------------------------------------------------------------------------------------------
//-- ModelRoot -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends Model {
    init() {
        super.init();
        this.beWellKnownAs("ModelRoot");
        this.managers = new Set();
        this.services = new Set();
        this.createManagers();
        this.createservices();
    }

    createManagers() {
        this.actorManager = this.addManager(ActorManager.create());
    }

    createservices() {
    }

    addManager(m) {
        this.managers.add(m);
        return m;
    }

    addService(service, options) {
        this.services.add(service.create(options));
    }
}
ModelRoot.register("ModelRoot");
