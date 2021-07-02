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

    // destroyAll() {
    //     const doomed = new Map(this.actors);
    //     doomed.forEach(actor => actor.destroy());
    // }

}
ActorManager.register("ActorManager");

//------------------------------------------------------------------------------------------
//-- Actor ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Actor extends WorldcoreModel {
    get pawn() {return Pawn}

    init(options) {
        super.init();
        this.set(options);
        this.service('ActorManager').add(this);
        this.publish("actor", "createActor", this);
    }

    // get userId() { return this._userId; }

    destroy() {
        this.doomed = true; // About to be destroyed. This is used to prevent creating new future messages.
        this.say("destroyActor");
        this.service('ActorManager').delete(this);
        super.destroy();
    }

    set(options) {
        for (const option in options) {
            const n = "_" + option;
            const v = options[option];
            if (!deepEquals(this[n], v)) {
                const o = this[n];
                this[n] = v;
                this.say(n, {o,v});
            }
        }
    }

    say(event, data) {
        this.publish(this.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.id, event, callback);
    }

    ignore(event) {
        this.unsubscribe(this.id, event);
    }

}
Actor.register("Actor");


function deepEquals(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const al = a.length;
    const bl = b.length;
    if (!al || !bl) return false;
    if (al !== bl) return false;
    for (let i = 0; i < al; i++) if (a[i] !== b[i]) return false;
    return true;
}
