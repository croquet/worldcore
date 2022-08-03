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
        // this.dynamic = new Set();

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

    spawnPawn(actor) { if (actor.pawn) new actor.pawn(actor); }
    add(pawn) {  this.pawns.set(pawn.actor.id, pawn); }
    has(id) { return this.pawns.has(id); }
    get(id) { return this.pawns.get(id); }
    delete(pawn) { this.pawns.delete(pawn.actor.id); }

    update(time, delta) {
        for(const pawn of this.pawns.values()) { if (!pawn.parent) pawn.fullUpdate(time, delta); };
    }
}

export function GetPawn(actorId) { return pm.get(actorId); }

//------------------------------------------------------------------------------------------
//-- Pawn ----------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Pawn extends WorldcoreView {

    constructor(actor) {
        super(actor);
        this._sayNext = {};
        this._sayCache = {};
        this._actor = actor;
        pm.add(this);
        this.listen("destroyActor", this.destroy);
        this.listen("parentSet", this.onParent);
        this.init();
    }

    init() {}

    get actor() {return this._actor};

    destroy() {
        this.doomed = true;
        pm.delete(this);
        this.detach(); // Calling View clean-up.
    }

    get parent() {
        if (this.actor.parent && !this._parent) this._parent = GetPawn(this.actor.parent.id);
        return this._parent;
    }

    get children() {
        if (this.actor.children && !this._children) this.actor.children.forEach(child => { this.addChild(child.id); })
        return this._children;
    }

    addChild(id) {
        const child = GetPawn(id);
        if (!child) return;
        if (!this._children) this._children = new Set();
        this._children.add(child);
        child._parent = this;
    }

    removeChild(id) {
        const child = GetPawn(id);
        if (!child) return;
        if (this._children) this._children.delete(child);
        child._parent = null;
    }

    onParent(d) {
        if (d.o) GetPawn(d.o.id).removeChild(this.actor.id);
        if (d.v) GetPawn(d.v.id).addChild(this.actor.id);
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

    ignore(event) {
        this.unsubscribe(this.actor.id, event);
    }

    listenOnce(event, callback) {
        this.subscribe(this.actor.id, {event, handling: "oncePerFrame"}, callback);
    }

    set(options, throttle = 0) {
        this.say("_set", options, throttle);
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


