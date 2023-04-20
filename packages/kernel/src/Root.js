import { Model, View, Session } from "@croquet/croquet";
import { ActorManager} from "./Actor";
import { PawnManager} from "./Pawn";
import { ClearObjectCache } from "./ObjectCache";

//------------------------------------------------------------------------------------------
//-- WorldcoreModel ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Extends the model base class with Worldcore-specific methods.

export class WorldcoreModel extends Model {

    service(name) { return this.wellKnownModel(name) }

}
WorldcoreModel.register("WorldcoreModel");

//------------------------------------------------------------------------------------------
//-- ModelRoot -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ModelRoot extends WorldcoreModel {

    static modelServices() { return [] }

    init() {
        super.init();
        this.beWellKnownAs("ModelRoot");
        this.services = new Set();
        this.services.add(ActorManager.create());
        this.constructor.modelServices().forEach( service => {
            this.services.add(service.create());
        });

    }

}
ModelRoot.register("ModelRoot");

//------------------------------------------------------------------------------------------
//-- ModelService --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A model service is a named singleton that's created by the root model. Do not instantiate
// model services directly.

export class ModelService extends WorldcoreModel {

    static async asyncStart() {}

    init(name) {
        super.init();
        console.log("Starting " + name);
        this.name = name;
        if (!name) console.error("All services must have public names!");
        else if (this.wellKnownModel(name)) console.error("Duplicate service!");
        else this.beWellKnownAs(name);
    }

}
ModelService.register('ModelService');

export function GetModelService(name) { return viewRoot.wellKnownModel(name) }

//------------------------------------------------------------------------------------------
//-- WorldcoreView -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Extends the view base class with Worldcore-specific methods.

export class WorldcoreView extends View {

    destroy() {
        this.detach();
    }

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
let viewServices = new Map();
let pawnManager;

export class ViewRoot extends WorldcoreView {

    static viewServices() { return []; }

    constructor(model) {
        super(model);
        this.model = model;
        viewRoot = this;
        time0 = 0;
        time1 = 0;
        viewServices = new Map();
        this.constructor.viewServices().forEach( service => {
            new service();
        });
        this.onStart();
        pawnManager = new PawnManager();
    }

    onStart() {} // A final set-up that runs before the pawns are created

    detach() {
        [...viewServices.values()].reverse().forEach(s => s.destroy());
        super.detach();
    }

    update(time) {
        time0 = time1;
        time1 = time;
        const delta = time1 - time0;
        let done = new Set();

        pawnManager.update(time, delta); // Pawns update before other services
        viewServices.forEach(s => {
            if (done.has(s)) {return;}
            if (s === pawnManager) return;
            done.add(s);
            if (s.update) s.update(time, delta);
        });
    }

}

//------------------------------------------------------------------------------------------
//-- ViewService ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ViewService extends WorldcoreView {

    static async asyncStart() {}

    constructor(name) {
        super(viewRoot.model);
        this.model = viewRoot.model;
        console.log("Starting " + name);
        this.name = name;
        this.registerViewName(name);
    }

    registerViewName(name) {
        if (!name) console.error("All services must have public names!");
        else if (viewServices.has(name)) console.error("Duplicate service!");
        else viewServices.set(name, this);
    }

    destroy() {
        super.destroy();
        viewServices.delete(this.name);
    }

}

export function GetViewService(name) { return viewServices.get(name) }

//------------------------------------------------------------------------------------------
//-- StartWorldcore ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export async function StartWorldcore(options) {

    await Promise.all(options.model.modelServices().map(service => {
        if (service.service) service = service.service;
        return service.asyncStart();
    }));

    await Promise.all(options.view.viewServices().map(service => {
        if (service.service) service = service.service;
        return service.asyncStart();
    }));

    if (!Array.isArray(options.flags)) options = { ...options, flags: [] };
    if (!options.flags.includes("worldcore")) options.flags.push("worldcore");

    const session = await Session.join(options);

    return session;
}
