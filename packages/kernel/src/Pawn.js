/* eslint-disable new-cap */
import { ViewService, WorldcoreView } from "./Root";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let pm; // Local pointer for pawns
const PAWN_REGISTRY = new Map();

export class PawnManager extends ViewService {
    constructor() {
        super("PawnManager");
        pm = this;
        this.pawns = new Map();

        // const actorManager = this.modelService("ActorManager");
        // actorManager.actors.forEach(actor => this.newPawn(actor));

        // for (const pawn of this.pawns.values()) { pawn.link() } // recreate child links

        // this.start();

        this.subscribe("actor", "createActor", this.spawnPawn);
        this.subscribe("actor", "destroyActor", this.destroyPawn);
    }

    start() {
        const actorManager = this.modelService("ActorManager");
        actorManager.actors.forEach(actor => this.newPawn(actor));

        for (const pawn of this.pawns.values()) { pawn.link() } // recreate child links
    }

    destroy() {
        const doomed = new Map(this.pawns);
        doomed.forEach(pawn => pawn.destroy());
        pm = null;
        super.destroy();
    }

    newPawn(actor) {
        if (!actor.pawn) return null;
        let p=null;
        if (typeof actor.pawn === 'string' ) {
            const cls = PAWN_REGISTRY.get(actor.pawn);
            if (!cls) {
                console.warn(actor.pawn + " does not exist in the pawn registry!");
                return null;
            }
            p = new cls(actor);
        } else {
            p = new actor.pawn(actor);
        }
        this.pawns.set(actor.id, p);
        return p;
    }

    spawnPawn(actor) {
        if (!actor.pawn) return;
        const p = this.newPawn(actor);
        if (p) p.link();
    }

    destroyPawn(actor) {
        const p = this.pawns.get(actor.id);
        this.pawns.delete(actor.id);
        if (p) p.destroy();
    }

    update(time, delta) {
        for (const pawn of this.pawns.values()) { if (!pawn.parent) pawn.fullUpdate(time, delta); }
    }
}

export function GetPawn(actorId) { return pm.pawns.get(actorId) }

//------------------------------------------------------------------------------------------
//-- Pawn ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Pawn extends WorldcoreView {

    static register(name) {
        if (PAWN_REGISTRY.has(name)) console.warn(name + " already exists in pawn registry!");
        PAWN_REGISTRY.set(name, this);
    }

    constructor(actor) {
        super(actor);
        this._actor = actor;
        this._sayNext = {};
        this._sayCache = {};

        this.listen("parentSet", this.onParent);
        this.listen("pawnSet", this.onPawn);
    }

    link() { if (this.parent) this.parent.addChild(this); }

    get actor() {return this._actor}

    destroy() {
        this.doomed = true;
        this.detach(); // Calling View clean-up.
    }

    get parent() {
        if (this.actor.parent && !this._parent) this._parent = GetPawn(this.actor.parent.id);
        return this._parent;
    }

    get children() {
        return this._children;
    }

    addChild(child) {
        if (!this._children) this._children = new Set();
        this._children.add(child);
    }

    removeChild(child) {
        if (this._children) this._children.delete(child);
    }

    onParent(d) {
        if (d.o) {
            this._parent = null;
            const p = GetPawn(d.o.id);
            if (p) p.removeChild(this);
        }
        if (this.parent) this.parent.addChild(this);
    }

    onPawn() {
        const actor = this.actor;
        const children = new Set(this.children);
        pm.destroyPawn(actor);
        pm.spawnPawn(actor);
        children.forEach(child => {
            child._parent = null;
            child.link();
        });
    }

    say(event, data, throttle = 0) {
        if (this.time < this._sayNext[event]) {
            this._sayCache[event] = { data, throttle };
        } else {
            this._sayNext[event] = this.time + throttle;
            this._sayCache[event] = null;
            this.publish(this.actor.id, event, data);
        }
    }

    listen(event, callback) {
        this.subscribe(this.actor.id, event, callback);
    }

    listenImmediate(event, callback) {
        this.subscribe(this.actor.id,{event, handling: "immediate"}, callback);
    }

    ignore(event, callback) {
        this.unsubscribe(this.actor.id, event, callback);
    }

    listenOnce(event, callback) {
        this.subscribe(this.actor.id, {event, handling: "oncePerFrame"}, callback);
    }

    set(options, throttle = 0) {
        this.say("_set", options, throttle);
    }

    snap(options, throttle = 0) {
        this.say("_snap", options, throttle);
    }

    preUpdate(time, delta) {} // Called immediately before the main update
    update(time, delta) {}
    postUpdate(time, delta){} // Called immediately after the main update.

    fullUpdate(time, delta) {
        this.preUpdate(time, delta);
        this.update(time, delta);
        this.postUpdate(time, delta);

        for (const event in this._sayCache) { // Flushes expired cached events from throttled says
            const cache = this._sayCache[event];
            if (cache && time > this._sayNext[event]) {
                const { data, throttle } = cache;
                this._sayNext[event] = time + throttle;
                this._sayCache[event] = null;
                this.publish(this.actor.id, event, data);
            }
        }

        if (this.children) this.children.forEach(child => child.fullUpdate(time, delta));
    }

}
Pawn.register("Pawn");


