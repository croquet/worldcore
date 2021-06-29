import { Model, View } from "@croquet/croquet";
import { ActorManager} from "./Actor";
import { PawnManager} from "./Pawn";
import { ClearObjectCache } from "./ObjectCache";

//------------------------------------------------------------------------------------------
//-- WCModel -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WorldCoreModel extends Model {

    service(name) { return this.wellKnownModel(name) }
}

//------------------------------------------------------------------------------------------
//-- ModelRoot -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends Model {
    init() {
        super.init();
        this.beWellKnownAs("ModelRoot");
        this.services = new Set();
        this.createServices();
    }

    createServices() {
        this.actorManager = this.addService(ActorManager);
    }

    addService(service, options) {
        const s = service.create(options);
        this.services.add(s);
        return s;
    }
}
ModelRoot.register("ModelRoot");


//------------------------------------------------------------------------------------------
//-- ModelService --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A model service is a named singleton that's created by the root model. Do not instantiate
// model services directly.

export class ModelService extends Model {

    init(name) {
        super.init();
        this.name = name;
        if (!name) console.error("All services must have public names!");
        else if (this.wellKnownModel(name)) console.error("Duplicate service!");
        else this.beWellKnownAs(name);
    }

}
ModelService.register('ModelService');

//------------------------------------------------------------------------------------------
//-- ViewRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export let viewRoot;
let time0 = 0;
let time1 = 0;
const viewServices = new Map();

export class ViewRoot extends View {

    constructor(model) {
        super(model);
        this.model = model;
        viewRoot = this;
        time0 = 0;
        time1 = 0;
        viewServices.clear();
        ClearObjectCache();
        this.createServices();
    }

    createServices() {
        this.pawnManager = this.addService(PawnManager);
    }

    detach() {
        viewServices.forEach(s => s.destroy());
        viewServices.clear();
        super.detach();
    }

    addService(service, options) {
        const s = new service(options);
        return s;
    }

    update(time) {
        time0 = time1;
        time1 = time;
        const delta = time1 - time0;
        viewServices.forEach(s => { if (s.update) s.update(time, delta); });
    }

}

//------------------------------------------------------------------------------------------
//-- ViewService ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ViewService extends View {

    constructor(name) {
        super(viewRoot.model);
        this.model = viewRoot.model;
        this.name = name;
        if (!name) console.error("All services must have public names!");
        else if (viewServices.has(name)) console.error("Duplicate service!");
        else viewServices.set(name, this);
    }

    destroy() {
        this.detach();
        viewServices.delete(this.name);
    }

}

export function GetViewRoot() { return viewRoot}
export function GetViewService(name) { return viewServices.get(name) }
export function GetModelService(name) { return viewRoot.wellKnownModel(name) }
export function GetViewTime() { return time1 }
export function  GetViewDelta() { return time1 - time0 }