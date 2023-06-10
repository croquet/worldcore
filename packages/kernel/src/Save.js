
import { Constants } from "@croquet/croquet";
import { ModelService } from "./Root";
import { RegisterMixin } from "./Mixins";
import { TwoWayMap } from "./Utilities";

Constants.WC_SAVE = new TwoWayMap();

//------------------------------------------------------------------------------------------
//-- SaveManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// export class SaveManager extends ModelService {
//     init() {
//         super.init('SaveManager');
//     }

//     save() {
//         const am = this.service("ActorManager");
//         const out = [];
//         for (const actor of am.actors.values()) {
//             if (actor.save) {
//                 if (!actor.parent || !actor.parent.save ) out.push(actor.save());
//             }
//         }
//         return out;
//     }

//     load(o) {
//         let out = null;
//         const actor = o.actor;
//         const children = o.children || [];
//         const options = {...o};
//         delete options.actor;
//         delete options.children;

//         const a = Constants.WC_SAVE.get(actor);
//         if (a) {
//             out = a.create(options);
//             for (const child of children) {
//                 child.parent = out;
//                 this.load(child);
//             }
//         } else {
//             console.error(actor + " not found during load from save!");
//         }

//         return out;

//     }

// }
// SaveManager.register("SaveManager");

//------------------------------------------------------------------------------------------
//-- AM_Save -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


export const AM_Save = superclass => class extends superclass {

    static register(name) {
        super.register(name);
        Constants.WC_SAVE.set(name, this);
    }

    get manifest() { return [] }

    save(layer) {
        const out = {};
        out.actor = Constants.WC_SAVE.revGet(this.constructor);
        out.pawn = this.pawn;
        if (this.tags.size) out.tags = Array.from(this.tags);
        for (const x of this.manifest) {out[x] = this[x]}
        if (this.children.size > 0) out.children = this.saveChildren();
        return out;
    }

    saveChildren(layer) {
        const out = [];

        for (const child of this.children) { if (child.save) out.push(child.save()); }

        return out;
    }

    load(o) {
        let out = null;
        const actor = o.actor;
        const children = o.children || [];
        const options = {...o};
        options.parent = this;
        delete options.actor;
        delete options.children;

        const a = Constants.WC_SAVE.get(actor);
        if (a) {
            out = a.create(options);
            for (const child of children) {
                child.parent = out;
                out.load(child);
            }
        } else {
            console.error(actor + " not found during load from save!");
        }

        return out;

    }

};
RegisterMixin(AM_Save);

