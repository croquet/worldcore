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
        this.managers = new Set();
        this.createManagers(); // ael - allow subclasses to get in first
    }

    createManagers() {
        this.pawnManager = this.addManager(new PawnManager());
    }

    detach() {
        this.managers.forEach(m => m.destroy());
        ClearNamedViews();
        super.detach();
    }

    addManager(m) {
        this.managers.add(m);
        return m;
    }

    update(time) {
        viewTime0 = viewTime1;
        viewTime1 = time;
        viewDelta = viewTime1 - viewTime0;
        this.managers.forEach(m => { if (m.update) m.update(time); });
    }

}

// Functions that allow pawns and managers to get current view time and delta since last update

let viewTime0 = 0;
let viewTime1 = 0;
let viewDelta = 0;

export function GetViewTime() {
    return viewTime1;
}

export function GetViewDelta() {
    return viewDelta;
}
