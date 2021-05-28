/* eslint-disable new-cap */
import { View } from "@croquet/croquet";
import { NamedView, GetNamedView } from "./NamedView";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// const pawnRegistry = new Map();
let pm; // Local pointer for pawns

export class PawnManager extends NamedView {
    constructor(model) {
        super("PawnManager", model);
        pm = this;
        this.pawns = new Map();
        this.dynamic = new Set();
        this.rebuild();
        // Spawning pawns is an immediate subscription because pawns subscribe to actor messages in their
        // constructors. This guarantees the pawn will be around if the new actor immediately sends a message.
        this.subscribe("actor", {event: "createActor", handling: "immediate"}, this.spawnPawn);
    }

    destroy() {
        const doomed = new Map(this.pawns);
        doomed.forEach(pawn => pawn.destroy());
        this.detach(); // de-register as a view
        pm = null;
    }

    rebuild() {
        const viewRoot = GetNamedView("ViewRoot");
        const actorManager = viewRoot.model.wellKnownModel("ActorManager");
        actorManager.actors.forEach(actor => this.rebuildPawn(actor));
        this.pawns.forEach(pawn => pawn.link());
    }

    rebuildPawn(actor) {
        this.spawnPawn(actor);
    }

    // spawnPawn(actor) {
    //     const type = pawnRegistry.get(actor.pawn);
    //     if (!type) {
    //         console.log("Unknown pawn type!");
    //         return;
    //     }
    //     new (type)(actor);
    // }

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
        this.dynamic.forEach(pawn => pawn.update(time, delta));
    }
}

//------------------------------------------------------------------------------------------
//-- Pawn ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Pawn extends View {

    // static register(name) {
    //     pawnRegistry.set(name, this);
    // }

    constructor(actor) {
        super(actor);
        this._actor = actor;
        pm.add(this);
        this.listen("destroyActor", this.destroy);
    }

    get actor() {return this._actor};
    get pawnManager() { return pm};

    // Link is called on start-up after all pre-existing pawns are re-instatiated. This is where pawn-pawn pointers can be rebuilt.
    link() {}

    // Updates the pawn visuals (if there are any). Mixins that handle rendering should overload it. Mixins that handle transforms should call it
    // at most once per frame.
    refresh() {}

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

    ignore(event) {
        this.unsubscribe(this.actor.id, event);
    }

    listenOnce(event, callback) {
        this.subscribe(this.actor.id, {event, handling: "oncePerFrame"}, callback);
    }

    // If the actor is owned by a particular view, returns it viewId.
    get userId() { return this.actor.userId;}

    // Returns true if the actor is owned by my view.
    get isMine() {
        return this.userId === this.viewId;
    }


}
// Pawn.register('Pawn');

//------------------------------------------------------------------------------------------
//-- PM_Dynamic ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Dynamic pawns get their update called every frame

export const PM_Dynamic = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        pm.addDynamic(this);
    }

    destroy() {
        pm.deleteDynamic(this);
        super.destroy();
    }

    update(time, delta) {
        if (this.parent) return;
        this.lastFrameTime = time;
    }

}

export function GetPawn(actorId) {
    return pm.get(actorId);
}
