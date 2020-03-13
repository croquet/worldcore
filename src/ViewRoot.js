import { NamedView, ClearNamedViews } from "./NamedView";
import { PawnManager} from "./Pawn";

//------------------------------------------------------------------------------------------
//-- ViewRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ViewRoot extends NamedView {
    constructor(model) {
        ClearNamedViews();
        super("ViewRoot");
        console.log("Starting view ...");
        this.model = model;

        this.views = new Set();

        this.pawnManager = this.addView(new PawnManager());
    }

    detach() { // Croquet needs this because it calls detach to clean up view root.
        this.destroy();
    }

    destroy() {
        console.log("Destroying view ... !");
        this.views.forEach(v => v.destroy());
        ClearNamedViews();
        super.destroy();
        super.detach();
    }

    addView(v) {
        this.views.add(v);
        return v;
    }

    update(time) {
        if (this.pawnManager) this.pawnManager.update(time);
    }

}
