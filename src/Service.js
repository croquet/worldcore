import { Model, View } from "@croquet/croquet";
import { viewRoot } from "./ViewRoot";


//------------------------------------------------------------------------------------------
//-- ModelService --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A model service is a named singleton that's created by the root model. Do not instantiate
// model services directly.

export class ModelService extends Model {

    init(name, options = {}) {
        super.init();
        this.name = name;
        if (!name) console.error("All services must have public names!");
        else if (this.wellKnownModel(name)) console.error("Duplicate service!");
        else this.beWellKnownAs(name);
    }

}
ModelService.register('ModelService');


//------------------------------------------------------------------------------------------
//-- ViewService ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A view service is a named singleton that's created by the root view. Do not instantiate
// view services directly.

const viewServices = new Map();

export function ClearViewServices() {
    viewServices.clear();
}

export function GetViewService(name) {
    return viewServices.get(name);
}

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