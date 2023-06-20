import { Constants } from "@croquet/croquet";
import { Pawn } from "./Pawn";
import { ModelService, WorldcoreModel } from "./Root";

//------------------------------------------------------------------------------------------
//-- ActorManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ActorManager extends ModelService {
    init() {
        super.init('ActorManager');
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

Constants.WC_SAVE = new Map();

export class Actor extends WorldcoreModel {

    static okayToIgnore() {return ["$local", "$global"] }

    get pawn() {return this._pawn}
    get doomed() {return this._doomed} // About to be destroyed. This is used to prevent creating new future messages.
    get parent() { return this._parent}
    get children() { return this._children || new Set() }
    get name() {return this._name || "Actor"}

    get tags() {  return this.__tags || new Set() }
    set _tags(tags) {
        if (!this.__tags) this.__tags = new Set();
        for (const tag of tags) this.__tags.add(tag);
    }

    init(options) {
        super.init();
        this.set(options);
        this.listen("_set", this.set);
        this.listen("_snap", this.snap);
        this.service('ActorManager').add(this);
        this.publish("actor", "createActor", this);
    }

    destroy() {
        this.destroyChildren();
        this.set({parent: null});
        this._doomed = true; // About to be destroyed. This is used to prevent creating new future messages.
        this.publish("actor", "destroyActor", this);
        this.service('ActorManager').delete(this);
        super.destroy();
    }

    destroyChildren() {
        new Set(this.children).forEach(child => child.destroy());
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
            const data = {old, value, o: old, v: value};
            this._say(nameSet, data);
        }
        return sorted;
    }

    snap(options = {}) {
        const sorted = this.set(options);
        for (const option of sorted) {
            const name = option[0];
            const value = option[1];
            const nameSnap = name+'Snap';
            if (this[nameSnap]) this[nameSnap](value);
            this._say(nameSnap, value);
        }
    }

    parentSet(value, old) {
        if (old) old.removeChild(this);
        if (value) value.addChild(this);
    }

    addChild(child) {
        if (!this._children) this._children = new Set();
        this._children.add(child);
    }

    removeChild(child) {
        this.children.delete(child);
    }

    removeTag(tag) {
        this.tags.delete(tag);
    }

    say(event, data) {
        // an explicit say(), as opposed to the automatically generated _say().
        // we publish in the normal way, but also as arguments to a generic event
        // type that a client such as a bridge can subscribe to in order to capture
        // and forward all the explicit say() occurrences.
        this.publish(this.id, event, data);
        this.publish("__wc", "say", [ this.id, event, data ]);
    }

    _say(event, data) {
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

