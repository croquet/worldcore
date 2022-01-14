/* eslint-disable new-cap */
import { ViewService, WorldcoreView } from "./Root";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let pm; // Local pointer for pawns

export class PawnManager extends ViewService {
    constructor(name) {
        super(name || "PawnManager");
        pm = this;
        this.pawns = new Map();
        this.dynamic = new Set();

        const actorManager = this.modelService("ActorManager");
        actorManager.actors.forEach(actor => this.spawnPawn(actor));

        this.subscribe("actor", "createActor", this.spawnPawn);
    }

    destroy() {
        const doomed = new Map(this.pawns);
        doomed.forEach(pawn => pawn.destroy());
        pm = null;
        super.destroy();
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

    destroy() {
        pm.delete(this);
        this.detach(); // Calling View clean-up.
    }

    say(event, data, throttle = 0) {
        if (throttle) console.warn("Only dynamic pawns can throttle 'say'!");
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


    // Creates a property in the pawn that will access a matching property in the actor.
    // When the property is set in the actor, the pawn with set its matching property and call the onSet method

    definePawnProperty(name, onSet) {
        const ul = '_' + name;
        const v = this.actor[name];
        this[ul] = v;
        Object.defineProperty(this, name, { get: function() {return this[ul]} });
        if (onSet) onSet(v,null);

        this.listenOnce(ul, () => {
            const o = this[ul];
            const v = this.actor[name];
            this[ul] = this.actor[name];
            if (onSet) onSet(v,o);
        });
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
        this._sayNext = {};
        this._sayCache = {};
    }

    destroy() {
        pm.deleteDynamic(this);
        super.destroy();
    }

    say(event, data, throttle = 0) {
        if (this.time < this._sayNext[event]) {
            this._sayCache[event] = data;
        } else {
            this._sayNext[event] = this.time + throttle;
            this._sayCache[event] = null;
            this.publish(this.actor.id, event, data);
        }
    }

    preUpdate(time, delta) {} // Called immediately before the main update
    update(time, delta) {}
    postUpdate(time, delta){ // Called immediately after the main update.

        for (const event in this._sayCache) { // Flushes expired cached events from throttled says
            const data = this._sayCache[event];
            if (data && time > this._sayNext[event]) {
                this._sayCache[event] = null;
                this.publish(this.actor.id, event, data);
            }
        }
    }

    fullUpdate(time, delta) {
        this.preUpdate(time, delta);
        this.update(time, delta);
        this.postUpdate(time, delta);
    }

}

export function GetPawn(actorId) {
    return pm.get(actorId);
}
