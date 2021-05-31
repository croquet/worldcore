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
        // const firstDelta = 0; // Random first tick to stagger execution of behaviors
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
        this.behavior.start();
    }

    get tickRate() {
        return this._tickRate || 100;
    }

    tick(delta) {
        const ticking = new Set(this.tickSet);
        ticking.forEach(behavior => {
            behavior.tick(delta);
        })
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
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
        // this.future(0).tick(0);
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

    // Start runs immediatel yafter the behavior is created, but before the first tick.
    // This is where set-up happens.
    // It should exit with SUCCEED, FAIL or RUN. (Unless this behavior has children.)
    start() {
        this.run();
    }

    tick(delta) {
        if (this.doomed) return;
        this.do(delta);
    }

    // Do runs on every tick.
    // This is where the work of the behavior happens.
    // It should exit with SUCCEED, FAIL or RUN. (Unless this behavior has children.)
    do(delta) {
        this.run();
    }

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

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    start() {
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.children.length) {
            this.active = this.spawnChild(this.n++);
            this.active.start();
        } else {
            this.succeed();
        }
    }

    reportSuccess(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        this.next();
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

    start() {
        this.order = Shuffle(this.children.length);
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.children.length) {
            const pick = this.order[this.n++];
            this.active = this.spawnChild(pick);
            this.active.start();
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

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    start() {
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.children.length) {
            this.active = this.spawnChild(this.n++);
            this.active.start();
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
        this.next();
    }

}
SelectorBehavior.register('SelectorBehavior');

//------------------------------------------------------------------------------------------
//-- RandomSelectorBehavior ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in random order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class RandomSelectorBehavior extends SelectorBehavior {

    start() {
        this.order = Shuffle(this.children.length);
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.children.length) {
            const pick = this.order[this.n++];
            this.active = this.spawnChild(pick);
            this.active.start();
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
// NOTE -- If children complete instantly, they will be resolved in the order they were declared.

export class ParallelSequenceBehavior extends CompositeBehavior {

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    start() {
        this.active = new Set();
        const spawned = [];
        for (let n = 0; n < this.children.length; n++) {
            const child = this.spawnChild(n);
            this.active.add(child);
            spawned.push(child);
        }
        spawned.forEach(child => {
            if (this.doomed) return;
            child.start();
        });
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
// NOTE -- If children complete instantly, they will be resolved in the order they were declared.

export class ParallelPrimaryBehavior extends CompositeBehavior {

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    start() {
        if (this.children.length === 0) return;
        this.active = new Set();
        const spawned = [];
        this.primary = this.spawnChild(0);
        this.active.add(this.primary);
        spawned.push(this.primary);
        for (let n = 1; n < this.children.length; n++) {
            const child = this.spawnChild(n);
            this.active.add(child);
            spawned.push(child);
        }
        spawned.forEach(child => {
            if (this.doomed) return;
            child.start();
        });
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
// NOTE -- If children complete instantly, they will be resolved in the order they were declared.

export class ParallelSelectorBehavior extends CompositeBehavior {

    destroy() {
        super.destroy();
        this.active.forEach(b => b.destroy());
    }

    start() {
        this.active = new Set();
        const spawned = [];
        for (let n = 0; n < this.children.length; n++) {
            const child = this.spawnChild(n);
            this.active.add(child);
            spawned.push(child);
        }
        spawned.forEach(child => {
            if (this.doomed) return;
            child.start();
        });
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

// Holds a single child behavior. Passes on its completion status when it finishes.

export class DecoratorBehavior extends Behavior {

    get child() {}

    destroy() {
        super.destroy();
        if (this.active) this.active.destroy();
    }

    start() {
       this.active =  this.child.create({actor: this.actor, parent: this});
       this.active.start();
    }

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
        if (this.count) this.n = 1;
        super.init(options);
    }

    do() {
        if (!this.active) this.start();
    }

    reportSuccess(child) {
        if (child != this.active) console.log("error");
        this.active = null;
        if (this.count && this.n++ === this.count) {
            this.succeed();
        } else {
            this.run(); // Loop will start again on next tick.
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

    start() {
        this.elapsed = 0;
        this.run();
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

//------------------------------------------------------------------------------------------
//-- DestroyBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Destroys the actor

export class DestroyBehavior extends Behavior {

    start() { this.actor.destroy(); }
}
DestroyBehavior.register("DestroyBehavior");



