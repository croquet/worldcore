import { RegisterMixin, WorldcoreModel, Shuffle } from "@croquet/worldcore-kernel";
// import {  } from "@croquet/worldcore-kernel";
// import { Shuffle } from "./Utilities";

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// StartBehavior sets the actor's current root behavior.

export const AM_Behavioral = superclass => class extends superclass {

    destroy() {
        super.destroy();
        if (this.behavior) this.behavior.destroy();
    }

    startBehavior(behavior, options = {}) {
        if (this.behavior) this.behavior.destroy();
        options.actor = this;
        this.behavior = behavior.create(options);
    }

}
RegisterMixin(AM_Behavioral);

//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Behavior extends WorldcoreModel {
    init(options) {
        super.init();
        this.set(options);
        if (this.parent) this.parent.addChild(this);

        if (this.tickRate) {
            const firstDelta = Math.random() * this.tickRate;
            this.future(firstDelta).tick(firstDelta);
        }
    }

    destroy() {
        super.destroy();
        if (this.parent) this.parent.removeChild(this);
        this.doomed = true;
    }

    set(options) {
        for (const option in options) {
            this["_" + option] = options[option];
        }
    }

    get actor() { return this._actor}
    get parent() { return this._parent}
    get tickRate() { return this._tickRate || 100}

    tick(delta) {
        if (this.doomed) return;
        this.do(delta);
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

    do(delta) {}

    succeed(data) {
        if (this.parent) this.parent.reportSuccess(this, data);
        this.destroy();
    }

    fail(data) {
        if (this.parent) this.parent.reportFailure(this, data);
        this.destroy();
    }

}
Behavior.register('Behavior');

//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Behaviors with children. They don't tick themselves, but can respond to reported success or
// failure by their children who are ticking.

export class CompositeBehavior extends Behavior {

    get tickRate() { return 0 }
    get behaviors() {return []}

    destroy() {
        super.destroy();
        new Set(this.children).forEach(child => child.destroy());
    }

    startChild(behavior, options = {}) {
        options.actor = this.actor;
        options.parent = this;
        behavior.create(options);
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    reportSuccess(child, data) {};
    reportFailure(child, data) { this.fail(data)};

}
CompositeBehavior.register('CompositeBehavior');

//------------------------------------------------------------------------------------------
//-- SequenceBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes a sequence of behaviors in order. Fails if any of them fails. Nothing is
// excecuted after the first fail.

export class SequenceBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.behaviors.length) {
            this.startChild(this.behaviors[this.n++]);
        } else {
            this.succeed();
        }
    }

    reportSuccess() { this.next(); }
    // reportFailure() { this.fail(); }

}
SequenceBehavior.register('SequenceBehavior');

//------------------------------------------------------------------------------------------
//-- RandomSequenceBehavior ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all children in random order. Fails if any of them fails. Nothing is excecuted after
// the first fail.

export class RandomSequenceBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.n = 0;
        this.order = Shuffle(this.behaviors.length);
        this.next();
    }

    next() {
        if (this.n < this.behaviors.length) {
            const pick = this.order[this.n++];
            this.startChild(this.behaviors[pick]);
        } else {
            this.succeed();
        }
    }

    reportSuccess() { this.next(); }
    // reportFailure() { this.fail(); }

}
RandomSequenceBehavior.register('RandomSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSequenceBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all childred simultaenously. Succeeds if all children succeed.
// Fails if one child fails. Aborts other children after first failure.

export class ParallelSequenceBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.behaviors.forEach (behavior => {
            if (this.doomed) return;
            this.startChild(behavior)
        })
    }

    reportSuccess() {
        if (this.children.size > 0) return;
        this.succeed();
    }

    // reportFailure() { this.fail(); }

}
ParallelSequenceBehavior.register('ParallelSequenceBehavior');

//------------------------------------------------------------------------------------------
//-- SelectorBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes behaviors in order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class SelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.behaviors.length) {
            this.startChild(this.behaviors[this.n++]);
        } else {
            this.fail();
        }
    }

    reportSuccess() { this.succeed(); }
    reportFailure() { this.next(); }

}
SelectorBehavior.register('SelectorBehavior');

//------------------------------------------------------------------------------------------
//-- RandomSelectorBehavior ----------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes behaviors in random order. Succeeds if any of them succeeds. Nothing is executed after
// the first success.

export class RandomSelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.order = Shuffle(this.behaviors.length);
        this.n = 0;
        this.next();
    }

    next() {
        if (this.n < this.behaviors.length) {
            const pick = this.order[this.n++];
            this.startChild(this.behaviors[pick]);
        } else {
            this.fail();
        }
    }

    reportSuccess() { this.succeed(); }
    reportFailure() { this.next(); }

}
RandomSelectorBehavior.register('RandomSelectorBehavior');

//------------------------------------------------------------------------------------------
//-- ParallelSelectorBehavior --------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes all childred simultaenously. Fails if all children fail.
// Succeeds if one child succeeds. Aborts other children after first success.

export class ParallelSelectorBehavior extends CompositeBehavior {

    init(options) {
        super.init(options);
        this.behaviors.forEach (behavior => {
            if (this.doomed) return;
            this.startChild(behavior)
        })
    }

    reportSuccess() { this.succeed(); }

    reportFailure() {
        if (this.children.size > 0) return;
        this.fail();
    }

}
ParallelSelectorBehavior.register('ParallelSelectorBehavior');

//------------------------------------------------------------------------------------------
//-- DecoratorBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Passes on its completion status when it finishes.

export class DecoratorBehavior extends Behavior {

    get tickRate() { return 0 }
    get behavior() { return null}

    init(options) {
        super.init(options);
        this.startChild();
    }

    destroy() {
        super.destroy();
        if (this.child) this.child.destroy();
    }

    startChild(options = {}) {
        options.actor = this.actor;
        options.parent = this;
        this.behavior.create(options);
    }

    addChild(child) {
        this.child = child;
    }

    removeChild(child) {
        if (this.child === child) this.child = null;
    }

    reportSuccess(child, data) {this.succeed(data)};
    reportFailure(child, data) {this.fail(data)};

}
DecoratorBehavior.register('DecoratorBehavior');

//------------------------------------------------------------------------------------------
//-- InvertBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Inverts its completion status when it fnishes.

export class InvertBehavior extends DecoratorBehavior {

    reportSuccess(child, data) {this.fail(data)};
    reportFailure(child, data) {this.succeed(data)};

}
InvertBehavior.register('InvertBehavior');

//------------------------------------------------------------------------------------------
//-- SucceedBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Always returns success when it finishes.

export class SucceedBehavior extends DecoratorBehavior {

    reportSuccess(child, data) {this.succeed(data)};
    reportFailure(child, data) {this.succeed(data)};

}
SucceedBehavior.register('SucceedBehavior');

//------------------------------------------------------------------------------------------
//-- FailBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Always returns failure when it finishes.

export class FailBehavior extends DecoratorBehavior {

    reportSuccess(child, data) {this.fail(data)};
    reportFailure(child, data) {this.fail(data)};

}
FailBehavior.register('FailBehavior');

//------------------------------------------------------------------------------------------
//-- LoopBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Will repeatedly execute it until count is reached, as long
// as it succeeds. If it fails, the loop returns failure.
//
// If the count is set to 0, it executes indefinitely.
//
// Note that if the child completely instantly and the count is high, you will probably overrun
// the call stack.

export class LoopBehavior extends DecoratorBehavior {

    get count() {return this._count || 0}

    init(options) {
        super.init(options);
        if (this.count) this.n = 0;
    }

    reportSuccess(child, data) {
        if (this.count) {
            this.n++;
            if (this.n === this.count) {
                this.succeed();
                return;
            }
        }
        this.startChild();
    }

}
LoopBehavior.register('LoopBehavior');

//------------------------------------------------------------------------------------------
//-- DestroyBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Destroys the actor

export class DestroyBehavior extends Behavior {

    init(options) {
        super.init(options);
        this.actor.destroy();
    }
}
DestroyBehavior.register("DestroyBehavior");

//------------------------------------------------------------------------------------------
//-- DelayBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Succeeds when delay time is reached.

export class DelayBehavior extends Behavior {

    get tickRate() { return 0 }
    get delay() { return this._delay || 1000};

    init(options) {
        super.init(options);
        this.future(this.delay).succeed();
    }

}
DelayBehavior.register("DelayBehavior");
