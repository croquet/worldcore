
import { Constants } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";
import { TwoWayMap } from "./Utilities";

Constants.WC_SPEC = new TwoWayMap();

//------------------------------------------------------------------------------------------
//-- AM_Spec -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Spec = superclass => class extends superclass {

    static register(name) {
        super.register(name);
        Constants.WC_SPEC.set(name, this);
    }

    get manifest() { return [] }

    toSpec(layer) {
        const spec = {};
        if (!layer || this.tags.has(layer)) {
            spec.actor = Constants.WC_SPEC.revGet(this.constructor);
            spec.pawn = this.pawn;
            if (this.tags.size) spec.tags = Array.from(this.tags);
            for (const x of this.manifest) {spec[x] = this[x]}
        }

        if (this.children.size > 0) spec.children = [];
        for (const child of this.children) { if (child.toSpec) spec.children.push(child.toSpec(layer)); }
        return spec;
    }

};
RegisterMixin(AM_Spec);

export function CreateFromSpec(parent, spec) {
    const actor = spec.actor;
    const children = spec.children || [];
    const options = {...spec};
    options.parent = parent;
    delete options.actor;
    delete options.children;

    const a = Constants.WC_SPEC.get(actor);

    if (actor && !a) console.error(actor + " not found during createFromSpec!");

    let out = parent;
    if (a) out = a.create(options);
    for (const child of children) CreateFromSpec(out, child);
}

