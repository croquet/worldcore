import { Model, View, Session } from "@croquet/croquet";
import { ActorManager} from "./Actor";
import { PawnManager} from "./Pawn";
import { ClearObjectCache } from "./ObjectCache";

let modelRootClass;
let viewRootClass;

//------------------------------------------------------------------------------------------
//-- WorldcoreModel ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Extends the model base class with WorldCore-specific methods.

export class WorldcoreModel extends Model {

    service(name) { return this.wellKnownModel(name) }

}
WorldcoreModel.register("WorldcoreModel");

//------------------------------------------------------------------------------------------
//-- ModelRoot -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends WorldcoreModel {

    static register(name) {
        super.register(name);
        if (modelRootClass) console.warn("Multiple Worldcore model roots registered!")
        modelRootClass = this;
    }

    static viewRoot() { return ViewRoot };

    init() {
        super.init();
        this.beWellKnownAs("ModelRoot");
        this.services = new Set();
        this.actorManager = this.addService(ActorManager);
        this.createServices();
    }

    createServices() {}

    addService(service, options) {
        const s = service.create(options);
        this.services.add(s);
        return s;
    }

}

// The ModelRoot base class is not registered so we can catch if users register multiple child classes of it.


//------------------------------------------------------------------------------------------
//-- ModelService --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A model service is a named singleton that's created by the root model. Do not instantiate
// model services directly.

export class ModelService extends WorldcoreModel {

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
//-- WorldcoreView -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Extends the view base class with WorldCore-specific methods.

export class WorldcoreView extends View {

    service(name) { return viewServices.get(name) }
    modelService(name) { return this.wellKnownModel(name) }
    get time() {return time1}
    get delta()  {return time1 - time0}

}

//------------------------------------------------------------------------------------------
//-- ViewRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// viewRoot is a special public global variable that stores the viewRoot.

export let viewRoot;
let time0 = 0;
let time1 = 0;
const viewServices = new Map();

export class ViewRoot extends WorldcoreView {

    constructor(model) {
        super(model);
        this.model = model;
        viewRoot = this;
        time0 = 0;
        time1 = 0;
        viewServices.clear();
        ClearObjectCache();
        this.createServices();
        this.pawnManager = this.addService(PawnManager);
    }

    createServices() {}

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

export class ViewService extends WorldcoreView {

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

//------------------------------------------------------------------------------------------
//-- StartWorldcore ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export async function StartWorldcore(options) {

    options.model = modelRootClass;
    options.view = viewRootClass;
    options.view = modelRootClass.viewRoot();

    const session = await Session.join(options);
}
