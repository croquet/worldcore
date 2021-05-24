import { Model } from "@croquet/croquet";
import { Shuffle } from "./Utilities";

// Implements a Behavior Tree system. Actors that are driven by behaviors should have the
// AM_Behavioal Mixin. Every tick the actor advances the start of its behavior tree.
//
// New behaviors are defined by defining classes that inherit from the Behavior base class.

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// StartBehavior sets the actor's current root behavior.

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
        if (this.behavior) this.behavior.destroy();
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

// All behaviors are derived from this base class. The behavior holds pointers to the actor
// its controlling, and the parent behavior it should report to when it completes.
//
// Behaviors can SAY and LISTEN using the same message scope as their actor.
//
// All of the work a behavior does should be contained within DO. Do should
// exit with either:
//
// RUN -- Continue exeuction at the next actor tick.
// SUCCEED -- Report success to your parent and destroy yourself.
// FAIL -- Report failure to your parent and destroy yourself.

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

    say(event, data) {
        this.publish(this.actor.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.actor.id, event, callback);
    }

    ignore(event) {
        this.unsubscribe(this.actor.id, event);
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

// Behaviors with children. They don't tick themselves, but respond to reported success or
// failure by their children who are ticking.

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

// Executes all childred simultaenously. Succeeds if all children succeed.
// Fails if one child fails. Aborts other children after first failure.
//
// NOTE -- The order children are defined does not determine priority during
// simultaneous completion. Instantaneous behaviors may complete in any order.

export class ParallelSequenceBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.active = new Set();
    }

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    do() {
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    reportSuccess(child) {
        this.active.delete(child);
        if (this.active.size > 0) return;
        this.succeed();
    }

    reportFailure(child) {
        this.active.delete(child);
        this.active.forEach(b => b.destroy());
        this.fail();
    }

}
ParallelSequenceBehavior.register('ParallelSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelPrimaryBehavior ---------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all childred simultaenously. Only reports success or failure of primary behavior.
// Other behaviors that are still running are aborted when the primary behavior finishes.
//
// NOTE -- The order children are defined does not determine priority during
// simultaneous completion. Instantaneous behaviors may complete in any order.

export class ParallelPrimaryBehavior extends ParallelSequenceBehavior {

    do() {
        if (this.children.length === 0) return;
        this.primary = this.spawnChild(0);
        this.active.add(this.primary);
        for (let n = 1; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    reportSuccess(child) {
        this.active.delete(child);
        if (child !== this.primary) return;
        this.active.forEach(b => b.destroy());
        this.succeed();
    }

    reportFailure(child) {
        this.active.delete(child);
        if (child !== this.primary) return;
        this.active.forEach(b => b.destroy());
        this.fail();
    }

}
ParallelPrimaryBehavior.register('ParallelPrimaryBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSelectorBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all childred simultaenously. Fails if all children fail.
// Succeeds if one child succeeds. Aborts other children after first success.
//
// NOTE -- The order children are defined does not determine priority during
// simultaneous completion. Instantaneous behaviors may complete in any order.

export class ParallelSelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.active = new Set();
    }

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    do() {
        for (let n = 0; n < this.children.length; n++) {
            this.active.add(this.spawnChild(n));
        }
    }

    reportSuccess(child) {
        this.active.delete(child);
        this.active.forEach(b => b.destroy());
        this.succeed();
    }

    reportFailure(child) {
        this.active.delete(child);
        if (this.active.size > 0) return;
        this.fail();
    }


}
ParallelSelectorBehavior.register('ParallelSelectorBehavior');

//------------------------------------------------------------------------------------------
//-- DecoratorBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Passes on its completion status when it fnishes.

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

    reportSuccess() {this.succeed()};
    reportFailure() {this.fail()};

}
DecoratorBehavior.register('DecoratorBehavior');

//------------------------------------------------------------------------------------------
//-- InvertBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Inverts its completion status when it fnishes.

export class InvertBehavior extends DecoratorBehavior {

    reportSuccess() {this.fail()};
    reportFailure() {this.succeed()};

}
InvertBehavior.register('InvertBehavior');

//------------------------------------------------------------------------------------------
//-- SucceedBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Always returns success when it finishes.

export class SucceedBehavior extends DecoratorBehavior {

    reportSuccess() {this.succeed()};
    reportFailure() {this.succeed()};

}
SucceedBehavior.register('SucceedBehavior');

//------------------------------------------------------------------------------------------
//-- FailBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Always returns failure when it finishes.

export class FailBehavior extends DecoratorBehavior {

    reportSuccess() {this.fail()};
    reportFailure() {this.fail()};

}
FailBehavior.register('FailBehavior');

//------------------------------------------------------------------------------------------
//-- LoopBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Will repeatedly execute it until count is reached, as long
// as it succeeds. If it fails, the loop returns failure.
//
// If the count is set to 0, it executes indefinitely.

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

//------------------------------------------------------------------------------------------
//-- DelayBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Runs until the delay time is reached. Note that the accuracy of the delay depends upon
// the granularity of the actor's tick rate.

export class DelayBehavior extends Behavior {

    get delay() {return 1000} // Delay in milliseconds.

    init(options) {
        super.init(options);
        this.elapsed = 0;
    }

    do(delta) {
        this.elapsed += delta
        if (this.elapsed < this.delay) {
            this.run();
        } else {
            this.succeed();
        }
    }
}
DelayBehavior.register("DelayBehavior");





