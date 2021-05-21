import { Model, Constants } from "@croquet/croquet";
import { Shuffle } from "./Utilities";

//------------------------------------------------------------------------------------------
//-- BehaviorManager -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Constants.WC_BEHVAVIOR_REGISTRY = [];
// const behaviorRegistry = {};

// export function ShowBehaviorRegistry() {
//     console.log(behaviorRegistry);
// }

// export class BehaviorManager extends Model {

//     static types() { return behaviorRegistry; }

//     init(...args) {
//         super.init(...args);
//         this.beWellKnownAs("BehaviorManager");
//     }
// }
// BehaviorManager.register('BehaviorMananger');

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

    destroy() {
        super.destroy();
        if (this.behavior) this.behavior.destroy();
    }

    startBehavior(behavior, options = {}) {
        options.actor = this;
        this.behavior = behavior.create(options);
    }

    get tickRate() {
        return this._tickRate || 100;
    }

    tick(delta) {
        if (this.doomed) return;
        const ticking = new Set(this.tickSet);
        ticking.forEach(behavior => {
            behavior.tick(delta);
        })
        this.future(this.tickRate).tick(this.tickRate);
    }

}

//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Behavior extends Model {

    init(options) {
        super.init(options);
        this.actor = options.actor;
        this.parent = options.parent;
        this.future(0).tick(0);
    }

    destroy() {
        super.destroy();
        this.doomed = true;
        this.actor.tickSet.delete(this);
    }

    tick(delta) {
        if (this.doomed) return;
        this.do(delta);
    }

    do(delta) {}

    succeed() {
        if (this.parent) this.parent.reportSuccess(this);
        this.destroy();
    }

    fail() {
        if (this.parent) this.parent.reportFailure(this);
        this.destroy();
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
        return this.children[n].create({actor: this.actor, parent: this});
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

    init(options) {
        super.init(options);
        this.n = 0;
        // console.log(this.Test);
    }

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    do() {
        if (this.n < this.children.length) {
            this.active = this.spawnChild(this.n++);
        } else {
            this.succeed();
        }
    }

    reportSuccess(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.tick();
    }

    reportFailure(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.fail();
    }

}
SequenceBehavior.register('SequenceBehavior');

//------------------------------------------------------------------------------------------
//-- RandomSequenceBehavior ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in random order. Fails if any of them fails. Nothing is excecuted after
// the first fail.

export class RandomSequenceBehavior extends SequenceBehavior {

    init(options) {
        super.init(options);
        this.order = Shuffle(this.children.length);
    }

    do() {
        if (this.n < this.children.length) {
            const pick = this.order[this.n++];
            this.active = this.spawnChild(pick);
        } else {
            this.succeed();
        }
    }
}
RandomSequenceBehavior.register('RandomSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- SelectorBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class SelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.n = 0;
    }

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    do() {
        if (this.n < this.children.length) {
            this.active = this.spawnChild(this.n++);
        } else {
            this.fail();
        }
    }

    reportSuccess(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.succeed();
    }

    reportFailure(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.tick();
    }

}
SelectorBehavior.register('SelectorBehavior');

//------------------------------------------------------------------------------------------
//-- RandomSelectorBehavior ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in random order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class RandomSelectorBehavior extends SelectorBehavior {

    init(options) {
        super.init(options);
        this.order = Shuffle(this.children.length);
    }

    do() {
        if (this.n < this.children.length) {
            const pick = this.order[this.n++];
            this.active = this.spawnChild(pick);
        } else {
            this.fail();
        }
    }
}
RandomSelectorBehavior.register('RandomSelectorBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSequenceBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ParallelSequenceBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);

        this.active = new Set();
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    reportSuccess(child) {
        console.log("success " + child);
        this.active.delete(child);
        if (this.active.size > 0) return;
        console.log("Parallel sequence success");
        this.succeed();
    }

    reportFailure(child) {
        console.log("failure " + child);
        this.active.delete(child);
        this.active.forEach(b => b.destroy());
        console.log("Parallel sequence failure");
        this.fail();
    }

}
ParallelSequenceBehavior.register('ParallelSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSelectorBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ParallelSelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);

        this.active = new Set();
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    reportSuccess(child) {
        console.log("success " + child);
        this.active.delete(child);
        this.active.forEach(b => b.destroy());
        console.log("Parallel selector success");
        this.succeed();
    }

    reportFailure(child) {
        console.log("failure " + child);
        this.active.delete(child);
        if (this.active.size > 0) return;
        console.log("Parallel selector failure");
        this.fail();
    }


}
ParallelSelectorBehavior.register('ParallelSelectorBehavior');

//------------------------------------------------------------------------------------------
//-- DecoratorBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class DecoratorBehavior extends Behavior {

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    spawnChild() {
        return this.child.create({actor: this.actor, parent: this});
    }

    do() {
        this.active = this.spawnChild();
    }

    get child() {}

    reportSuccess() {};
    reportFailure() {};

}
DecoratorBehavior.register('DecoratorBehavior');

//------------------------------------------------------------------------------------------
//-- InvertBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class InvertBehavior extends DecoratorBehavior {

    reportSuccess() {this.fail()};
    reportFailure() {this.succeed()};

}
InvertBehavior.register('InvertBehavior');

//------------------------------------------------------------------------------------------
//-- LoopBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class LoopBehavior extends DecoratorBehavior {

    get count() {return 0}

    init(options) {
        super.init(options);
        if (this.count) this.n = 1;
    }

    reportSuccess(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        if (this.count && this.n++ === this.count) {
            this.succeed();
        } else {
            this.tick();
        }
    }

    reportFailure(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.fail();
    }

}
LoopBehavior.register('LoopBehavior');



// Decorators
// Conditional decorators
// Backboard?
// Side behaviors -- primary cancels secondary
// Event decorators ... for example a message-driven abort
// Repeaters
// Priortiy queue selectors




