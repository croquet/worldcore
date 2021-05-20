import { Model, Constants } from "@croquet/croquet";

//------------------------------------------------------------------------------------------
//-- BehaviorManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

Constants.WC_BEHVAVIOR_REGISTRY = [];
const behaviorRegistry = {};

export function ShowBehaviorRegistry() {
    console.log(behaviorRegistry);
}

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
        this.tickSet = new Set();
        const firstDelta = Math.random() * this.tickRate; // Random first tick to stagger execution of behaviors
        if (!this.doomed) this.future(firstDelta).tick(firstDelta);
    }

    get tickRate() {
        return this._tickRate || 100;
    }

    tick(delta) {

        const ticking = new Set(this.tickSet);

        ticking.forEach(behavior => {
            if (behavior.isCancelled) return;
            behavior.tick(delta);
        })
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

}

//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Behavior {

    static register(name) {
        behaviorRegistry[name] = this;
        Constants.WC_BEHVAVIOR_REGISTRY.push(this);
    }

    constructor(actor, parent, options) {
        this.actor = actor;
        this.parent = parent;
        this.start(options);
        this.tick(0);
    }

    start(options) {}

    cancel() {
        this.isCancelled = true;
        this.actor.tickSet.delete(this);
    }

    tick(delta) {
        this.run();
    }

    succeed() {
        this.actor.tickSet.delete(this);
        if (this.parent) this.parent.reportSuccess(this);
    }

    fail() {
        this.actor.tickSet.delete(this);
        if (this.parent) this.parent.reportFailure(this);
    }

    run() {
        this.actor.tickSet.add(this);
    }
}
Behavior.register('Behavior');

//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class CompositeBehavior extends Behavior {

    get children() {return []}

    spawnChild(n) {
        let child = this.children[n];
        let options = {};
        if (child.length === 2) {
            options = child[1];
            child = child[0];
        }
        return new child(this.actor, this, options);
    }

    reportSuccess(child) {};
    reportFailure(child) {};

}
CompositeBehavior.register('CompositeBehavior');

//------------------------------------------------------------------------------------------
//-- SequenceBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in order. Fails if any of them fails. Nothing is excecuted after
// the first fail.

export class SequenceBehavior extends CompositeBehavior {

    start() {
        this.n = 0;
    }

    cancel() {
        if (this.current) this.current.cancel();
        this.current = null;
    }

    tick() {
        if (this.n < this.children.length) {
            this.current = this.spawnChild(this.n++);
        } else {
            this.succeed();
        }
    }

    reportSuccess(child) {
        this.current = null;
        this.tick();
    }

    reportFailure(child) {
        this.current = null;
        this.fail();
    }

}
SequenceBehavior.register('SequenceBehavior');

//------------------------------------------------------------------------------------------
//-- SelectorBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class SelectorBehavior extends CompositeBehavior {

    start() {
        this.n = 0;
    }

    cancel() {
        if (this.current) this.current.cancel();
        this.current = null;
    }

    reportSuccess(child) {
        this.current = null;
        this.succeed();
    }

    reportFailure(child) {
        this.current = null;
        this.tick();
    }

    tick() {
        if (this.n < this.children.length) {
            this.current = this.spawnChild(this.n++);
        } else {
            this.fail();
        }
    }
}
SelectorBehavior.register('SelectorBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSequenceBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ParallelSequenceBehavior extends CompositeBehavior {

    start() {
        this.active = new Set();
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    cancel() {
        this.active.forEach(b => b.cancel());
    }

    reportSuccess(child) {
        this.active.delete(child);
        if (this.active.size > 0) return;
        this.succeed();
    }

    reportFailure(child) {
        this.active.delete(child);
        this.active.forEach(b => b.cancel());
        this.fail();
    }


}
ParallelSequenceBehavior.register('ParallelSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSelectorBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ParallelSelectorBehavior extends CompositeBehavior {

    start() {
        this.active = new Set();
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    cancel() {
        this.active.forEach(b => b.cancel());
    }

    reportSuccess(child) {
        this.active.delete(child);
        console.log("When the selector succeeds it loops through the remaining active child behaviors to cancel them.")
        console.log(this.active);
        this.active.forEach(b => b.cancel());
        this.succeed();
    }

    reportFailure(child) {
        this.active.delete(child);
        if (this.active.size > 0) return;
        this.fail();
    }


}
ParallelSelectorBehavior.register('ParallelSelectorBehavior');




