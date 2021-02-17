import { NamedView, ClearNamedViews } from "./NamedView";
import { PawnManager} from "./Pawn";
import { ClearObjectCache } from "./ObjectCache";

//------------------------------------------------------------------------------------------
//-- ViewRoot ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ViewRoot extends NamedView {
    constructor(model) {
        ClearNamedViews();
        super("ViewRoot");
        console.log("Starting view ...");
        ClearObjectCache();
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
        viewDeltas.shift();
        viewDeltas.push(viewDelta);
        this.managers.forEach(m => { if (m.update) m.update(time, viewDelta); });
    }

}

// Functions that allow pawns and managers to get current view time and delta since last update

let viewTime0 = 0;
let viewTime1 = 0;
let viewDelta = 0;
let viewDeltas = new Array(10).fill(15); // Last 10 updates

export function GetViewTime() {
    return viewTime1;
}

export function GetViewDelta() {
    return viewDelta;
}

export function GetViewFPS() { // Averaged over last 10 updates
    const average = viewDeltas.reduce( (t, v) => t + v ) / viewDeltas.length;
    return 1000 / average;
}
