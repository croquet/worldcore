import { Model } from "@croquet/teatime";

//------------------------------------------------------------------------------------------
//-- ActorManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ActorManager extends Model {
    init() {
        super.init();
        this.beWellKnownAs('ActorManager');
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

    destroyAll() {
        const doomed = new Map(this.actors);
        doomed.forEach(actor => actor.destroy());
    }

}
ActorManager.register("ActorManager");

//------------------------------------------------------------------------------------------
//-- Actor ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Actor extends Model {
    init(pawnType = 'Pawn') {
        super.init();
        this.pawnType = pawnType;
        this.wellKnownModel('ActorManager').add(this);
        this.publish("actor", "createActor", this);
    }

    destroy() {
        this.doomed = true; // About to be destroyed. This is used to prevent creating new future messages.
        this.say("destroyActor");
        this.wellKnownModel('ActorManager').delete(this);
        super.destroy();
    }

    say(event, data) {
        this.publish(this.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.id, event, callback);
    }

}
Actor.register("Actor");
