
import { Constants } from "@croquet/croquet";
import { RegisterMixin } from "./Mixins";

Constants.WC_SAVE = new Map();


//------------------------------------------------------------------------------------------
//-- AM_Save -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------


 export const AM_Save = superclass => class extends superclass {

    static register(name) {
        super.register(name);
        Constants.WC_SAVE.set(name, this);
    }

    init(options) {
        super.init(options);
    }

    destroy() {
        super.destroy();
    }

    get manifest() { return [] }

    save() {
        const out = {};
        for (const x of this.manifest) {
            out[x] = this[x];
        }
        console.log(out);

        // recursive save children


    }

};
RegisterMixin(AM_Save);

