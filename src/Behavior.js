import { Model } from "@croquet/croquet";

//------------------------------------------------------------------------------------------
//-- BehaviorManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const behaviorRegistry = {};

export class BehaviorManager extends Model {

    static types() { return behaviorRegistry; }

    init(...args) {
        super.init(...args);
        this.beWellKnownAs("BehaviorManager");
    }
}
BehaviorManager.register('BehaviorMananger');

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const AM_Behavioral = superclass => class extends superclass {

    init(...args) {
        super.init(...args);
        const firstDelta = Math.random() * this.tickRate; // Random first tick to stagger execution of behaviors
        if (!this.doomed) this.future(firstDelta).tick(firstDelta);
    }

    get behavior() {
        return this._behavior;
    }

    get tickRate() {
        return this._tickRate || 100;
    }

    tick(delta) {
        if (this.behavior) {
            this.behavior.reset();
            this.behavior.tick(this, delta);
        }
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

}

//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Behavior {

    static register(name) { behaviorRegistry[name] = this; }

    static get running() { return 0}
    static get success() { return 1}
    static get failure() { return 2}


    reset() {}
    tick(actor, delta){ return Behavior.success; }
}
Behavior.register('Behavior');

//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CompositeBehavior extends Behavior {

    get children() {return []}

}
CompositeBehavior.register('CompositeBehavior');

//------------------------------------------------------------------------------------------
//-- SequenceBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class SequenceBehavior extends CompositeBehavior {

    constructor() {
        super();
        this.n = 0;
    }

    reset() {this.n = 0};

    tick(actor, delta) {
        while (this.n < this.children.length) {
            const b = new this.children[this.n++];
            const result = b.tick(actor, delta);
            if (result === Behavior.failure) return Behavior.failure;
            if (result === Behavior.running) return Behavior.running;
        }
        return Behavior.success;
    }

}
SequenceBehavior.register('SequenceBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSequenceBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ParallelSequenceBehavior extends CompositeBehavior {

}
ParallelSequenceBehavior.register('ParallelSequenceBehavior');






