/* eslint-disable new-cap */
import { View } from "@croquet/teatime";
import { NamedView, GetNamedView } from "./NamedView";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const pawnRegistry = new Map();

export class PawnManager extends NamedView {
    constructor() {
        super("PawnManager");
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
        super.destroy();
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

    spawnPawn(actor) {
        const type = pawnRegistry.get(actor.pawnType);
        if (!type) {
            console.log("Unknown pawn type!");
            return;
        }
        new (type)(actor);
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

    update(time) {
        this.dynamic.forEach(pawn => pawn.update(time));
    }
}

//------------------------------------------------------------------------------------------
//-- Pawn ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Pawn extends View {

    static register(name) {
        pawnRegistry.set(name, this);
    }

    constructor(actor) {
        super();
        this.actor = actor;
        GetNamedView("PawnManager").add(this);
        this.listen("destroyActor", this.destroy);
    }

    // Link is called on start-up after all pre-existing pawns are re-instatiated. This is where pawn-pawn pointers can be rebuilt.
    link() {}

    // Updates the pawn visuals (if there are any). Mixins that handle rendering should overload it. Mixins that handle transforms should call it
    // at most once per frame.
    refresh() {}

    destroy() {
        GetNamedView("PawnManager").delete(this);
        super.detach();
    }

    say(event, data) {
        this.publish(this.actor.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.actor.id, event, callback);
    }

    listenOnce(event, callback) {
        this.subscribe(this.actor.id, {event, handling: "oncePerFrame"}, callback);
    }

}
Pawn.register('Pawn');

//------------------------------------------------------------------------------------------
//-- PM_Dynamic ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Dynamic = superclass => class extends superclass {
    constructor(...args) {
        super(...args);
        GetNamedView("PawnManager").addDynamic(this);
    }

    destroy() {
        GetNamedView("PawnManager").deleteDynamic(this);
        super.destroy();
    }

    update(time) {
        if (this.last) this.delta = time - this.last;
        this.last = time;
    }
}
