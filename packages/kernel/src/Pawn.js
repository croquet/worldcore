/* eslint-disable new-cap */
import { ViewService, WorldcoreView } from "./Root";

//------------------------------------------------------------------------------------------
//-- PawnManager ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let pm; // Local pointer for pawns
const PAWN_REGISTRY = new Map();

export class PawnManager extends ViewService {
    constructor(name) {
        super(name || "PawnManager");
        pm = this;
        this.pawns = new Map();

        const actorManager = this.modelService("ActorManager");
        actorManager.actors.forEach(actor => this.spawnPawn(actor));

        for(const pawn of this.pawns.values()) { pawn.link() }; // recreate child links after all pawns are spawned

        this.subscribe("actor", "createActor", this.spawnPawn);
        this.subscribe("actor", "destroyActor", this.destroyPawn);
    }

    destroy() {
        const doomed = new Map(this.pawns);
        doomed.forEach(pawn => pawn.destroy());
        pm = null;
        super.destroy();
    }

    spawnPawn(actor) {
        if (!actor.pawn) return;
        let p;
        if (typeof actor.pawn === 'string' ) {
            const cls = PAWN_REGISTRY.get(actor.pawn);
            if (!cls) {
                console.warn(actor.pawn + " does not exist in the pawn registry!");
                return;
            }
            p = new cls(actor);
        } else {
            p = new actor.pawn(actor);
        }
        p.link();
        return p;
    }

    destroyPawn(actor) {
        const p = this.get(actor.id);
        this.delete(p);
        if (p) p.destroy();
    }

    add(pawn) {  this.pawns.set(pawn.actor.id, pawn); }
    has(id) { return this.pawns.has(id); }
    get(id) { return this.pawns.get(id); }
    delete(pawn) { if (pawn) this.pawns.delete(pawn.actor.id); }

    update(time, delta) {
        for(const pawn of this.pawns.values()) { if (!pawn.parent) pawn.fullUpdate(time, delta); };
    }
}

export function GetPawn(actorId) { return pm.get(actorId); }

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
        this._sayNext = {};
        this._sayCache = {};

        this._actor = actor;
        pm.add(this);
        this.link();

        this.listen("parentSet", this.onParent);
        this.listen("pawnSet", this.onPawn);
    }

    link() { if(this.parent) this.parent.addChild(this); }

    get actor() {return this._actor};

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

    // onParent(d) {
    //     if (this.parent) this.parent.removeChild(this);
    //     // if (d.o) {
    //     //     this._parent = null;
    //     //     GetPawn(d.o.id).removeChild(this);
    //     // }
    //     if(this.parent) this.parent.addChild(this);
    // }


    onParent(d) {
        if (d.o) {
            this._parent = null;
            GetPawn(d.o.id).removeChild(this);
        }
        if(this.parent) this.parent.addChild(this);
    }

    onPawn() {
        const actor = this.actor;
        const children = new Set(this.children);
        pm.destroyPawn(actor);
        pm.spawnPawn(actor);
        children.forEach(child => {
            child._parent = null;
            child.link()
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

    // say(event, data, throttle = 0) {
    //     if (this.time < (this.sayLast[event] || 0) + throttle) {
    //         const expire = this.time + throttle;
    //         this.sayCache[event] = {data, expire};
    //     } else {
    //         this.sayLast[event] = this.time;
    //         this.publish(this.actor.id, event, data);
    //         this.sayCache[event] = null;
    //     }
    // }


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

    // fullUpdate(time, delta) {
    //     this.preUpdate(time, delta);
    //     this.update(time, delta);
    //     this.postUpdate(time, delta);

    //     for (const event in this.sayCache) { // Flushes expired cached events from throttled says
    //         const cache = this.sayCache[event];
    //         // console.log(cache);
    //         if (cache) {
    //             console.log("flush");
    //             this.sayLast[event] = this.time;
    //             this.publish(this.actor.id, event, cache.data);
    //             this.sayCache[event] = null;
    //             // console.log(this.sayCache[event]);
    //         }
    //     }

    //     if (this.children) this.children.forEach(child => child.fullUpdate(time, delta));
    // }

}
Pawn.register("Pawn");


