/* eslint-disable new-cap */
import { ViewService, WorldcoreView } from "./Root";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let pm; // Local pointer for pawns

export class PawnManager extends ViewService {
    constructor() {
        super("PawnManager");
        pm = this;
        this.pawns = new Map();
        this.dynamic = new Set();

        const actorManager = this.modelService("ActorManager");
        actorManager.actors.forEach(actor => this.spawnPawn(actor));

        // Spawning pawns is an immediate subscription because pawns often subscribe to actor messages in their
        // constructors. This guarantees the pawn will be around if the new actor immediately sends a message.

        this.subscribe("actor", {event: "createActor", handling: "immediate"}, this.spawnPawn);
    }

    destroy() {
        const doomed = new Map(this.pawns);
        doomed.forEach(pawn => pawn.destroy());
        this.detach(); // de-register as a view
        pm = null;
    }

    spawnPawn(actor) {
        new actor.pawn(actor);
    }

    add(pawn) {
        this.pawns.set(pawn.actor.id, pawn);

    }

    has(id) {
        return this.pawns.has(id);
    }

    get(id) {
        return this.pawns.get(id);
    }

    delete(pawn) {
        this.pawns.delete(pawn.actor.id);

    }

    addDynamic(pawn) {
        this.dynamic.add(pawn);
    }

    deleteDynamic(pawn) {
        this.dynamic.delete(pawn);
    }


    update(time, delta) {
        this.dynamic.forEach( pawn => {
            if (pawn.parent) return; // Child pawns get updated in their parent's postUpdate
            pawn.fullUpdate(time, delta);
        });
    }
}



//------------------------------------------------------------------------------------------
//-- Pawn ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Pawn extends WorldcoreView {

    constructor(actor) {
        super(actor);
        this._actor = actor;
        pm.add(this);
        this.listen("destroyActor", this.destroy);
    }

    get actor() {return this._actor};
    get pawnManager() { return pm};

    // Updates the pawn visuals (if there are any). Mixins that handle rendering should overload it. Mixins that handle transforms should call it
    // at most once per frame.

    refresh() {} // Replace with a message!

    destroy() {
        pm.delete(this);
        this.detach(); // Calling View clean-up.
    }

    say(event, data) {
        this.publish(this.actor.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.actor.id, event, callback);
    }

    listenImmediate(event, callback) {
        this.subscribe(this.actor.id,{event, handling: "immediate"}, callback);
    }

    ignore(event) {
        this.unsubscribe(this.actor.id, event);
    }

    listenOnce(event, callback) {
        this.subscribe(this.actor.id, {event, handling: "oncePerFrame"}, callback);
    }

}

//------------------------------------------------------------------------------------------
//-- PM_Dynamic ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Dynamic pawns get their update called every frame. Most stuff should go in update, but if there are operations
// that need to occur before or after everything else, you can overload pre- and post- update.

export const PM_Dynamic = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        pm.addDynamic(this);
    }

    destroy() {
        pm.deleteDynamic(this);
        super.destroy();
    }

    preUpdate(time, delta) {} // Called immediately before the main update
    update(time, delta) {}
    postUpdate(time, delta){} // Called immediately after the main update.

    fullUpdate(time, delta) {
        this.preUpdate(time, delta);
        this.update(time, delta);
        this.postUpdate(time, delta);
    }

}

export function GetPawn(actorId) {
    return pm.get(actorId);
}
