import { Pawn } from "./Pawn";
import { ModelService, WorldcoreModel } from "./Root";

//------------------------------------------------------------------------------------------
//-- ActorManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ActorManager extends ModelService {
    init(name) {
        super.init(name || 'ActorManager');
        this.actors = new Map();
    }

    add(actor) {
        this.actors.set(actor.id, actor);
    }

    has(id) {
        return this.actors.has(id);
    }

    get(id) {
        return this.actors.get(id);
    }

    delete(actor) {
        this.actors.delete(actor.id);
    }

}
ActorManager.register("ActorManager");

//------------------------------------------------------------------------------------------
//-- Actor ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Actor extends WorldcoreModel {
    get pawn() {return null;}
    get doomed() {return this._doomed} // About to be destroyed. This is used to prevent creating new future messages.
    get parent() { return this._parent; }
    get name() {return this._name || "Actor"}

    init(options) {
        super.init();
        this.set(options);
        this.listen("_set", this.set);
        this.service('ActorManager').add(this);
        this.publish("actor", "createActor", this);
    }

    destroy() {
        if (this.children) new Set(this.children).forEach(child => child.destroy());
        this.set({parent: null});
        this._doomed = true; // About to be destroyed. This is used to prevent creating new future messages.
        this.say("destroyActor");
        this.service('ActorManager').delete(this);
        super.destroy();
    }

    set(options = {}) {
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const name = option[0];
            const value = option[1];
            const ul = "_" + name;
            const nameSet = name+'Set';
            const old = this[ul];
            this[ul] = value;
            if (this[nameSet]) this[nameSet](value,old);
            const data = {old, value, o: old, v: value}
            this.say(nameSet, data);
        }
        return sorted;
    }

    snap(options = {}) {
        const sorted = this.set(options);
        for (const option of sorted) {
            const name = option[0];
            const value = option[1];
            const nameSnap = name+'Snap';
            if (this[nameSnap]) this[nameSnap](value)
            this.say(nameSnap, value);
        }
    }

    parentSet(value, old) {
        if(old) old.removeChild(this);
        if(value) value.addChild(this);
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    // onParent(d) {
    //     if (d.o) d.o.removeChild(this);
    //     if (d.v) d.v.addChild(this);
    // }

    say(event, data) {
        this.publish(this.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.id, event, callback);
    }

    ignore(event) {
        this.unsubscribe(this.id, event);
    }

    actorFromId(id) {
        return this.service("ActorManager").get(id);
    }

}
Actor.register("Actor");

