import { RegisterMixin, WorldcoreModel, Shuffle, Actor,  Pawn, GetPawn,Constants } from "@croquet/worldcore-kernel";

Constants.WC_BEHAVIORS = new Map();

// import * as Worldcore from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

 // Mixin to allow actors to use behavior trees.

 // StartBehavior sets the actor's current root behavior.

 export const AM_Behavioral = superclass => class extends superclass {

    init(...args) {
        super.init(...args);
        // this.listen("setBehaviorCode", this.setBehaviorCode);
    }

    destroy() {
        super.destroy();
        if (this.behavior) this.behavior.destroy();
    }

    startBehavior(behaviorName, options = {}) {
        const behavior = Constants.WC_BEHAVIORS.get(behaviorName);
        if (this.behavior) this.behavior.destroy();
        options.actor = this;
        this.behavior = behavior.create(options);
    }

}
RegisterMixin(AM_Behavioral);

//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Behavior extends Actor {

    static register(name) {
        super.register(name);
        Constants.WC_BEHAVIORS.set(name, this);
    }

    init(options) {
        super.init(options);

        this.onStart();

        if (this.tickRate) {
            const firstDelta = Math.random() * this.tickRate;
            this.future(firstDelta).tick(firstDelta);
        }
    }

    get actor() { return this._actor}
    get tickRate() { return this._tickRate || 100}
    set tickRate(t) { this._tickRate = t}

    tick(delta) {
        if (this.doomed) return;
        this.do(delta);
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

    startChild(behaviorName, options = {}) {
        const behavior = Constants.WC_BEHAVIORS.get(behaviorName);
        options.actor = this.actor;
        options.parent = this;
        behavior.create(options);
    }

    succeed(data) {
        if (this.parent) this.parent.onSucceed(this, data);
        this.destroy();
    }

    fail(data) {
        if (this.parent) this.parent.onFail(this, data);
        this.destroy();
    }

    onStart() {}
    do(delta) {}
    onSucceed(child, data) { this.succeed(data) };
    onFail(child, data) { this.fail(data) };

}
Behavior.register('Behavior');


//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const b = {
    behavior: "FallBehavior",
    options: {gravity: 9.8}
}

// if You set the behaviors, do kill all children and do onStart again.

// Behaviors with multiple child behaviors. They don't tick themselves, but respond to reported success or
// failure by their children who are ticking.

export class CompositeBehavior extends Behavior {

    get tickRate() { return 0 }
    // get behaviors() {return []}
     get behaviorNames() {return this._behaviorNames || []}
    get isParallel() { return this._parallel }
    get isShuffle() { return this._shuffle }

    onStart() {
        this.n = 0;
        this.pending = this.behaviorNames.length;
        if (this.isShuffle) this.deck = Shuffle(this.behaviorNames.length);
        this.isParallel ? this.startAll() : this.startNext();
    }

    startAll() {
        for (let i = 0; i < this.behaviorNames.length; i++ ) {
            if (this.doomed) return;
            this.isShuffle ? this.startChild(this.behaviorNames[this.deck[i]]) : this.startChild(this.behaviorNames[i]);
        }
    }

    startNext() {
        if (this.isParallel) return;
        this.isShuffle ? this.startChild(this.behaviorNames[this.deck[this.n++]]) : this.startChild(this.behaviorNames[this.n++]);
    }

}
CompositeBehavior.register('CompositeBehavior');

//------------------------------------------------------------------------------------------
//-- SequenceBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes a sequence of behaviors in order. Fails if any of them fails. Nothing is
// executed after the first fail. Succeeds if all of them succeed.

// The equivalent of a logical AND

export class SequenceBehavior extends CompositeBehavior {

    onSucceed() { --this.pending ? this.startNext() : this.succeed(); }
    onFail() { this.fail(); }

}
SequenceBehavior.register('SequenceBehavior');

//------------------------------------------------------------------------------------------
//-- SelectorBehavior ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Executes behaviors in order. Succeeds if any of them succeeds. Nothing is executed after
// the first success. Fails if all of them fail.

// The equivalent of a logical OR

export class SelectorBehavior extends CompositeBehavior {

    onSucceed() { this.succeed(); }
    onFail() { --this.pending ? this.startNext() : this.fail(); }


}
SelectorBehavior.register('SelectorBehavior');

//------------------------------------------------------------------------------------------
//-- DecoratorBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a single child behavior. Passes on its completion status when it finishes.

export class DecoratorBehavior extends Behavior {

    get tickRate() { return 0 }
    get behaviorName() { return this._behaviorName }

    onStart() { this.startChild(this.behaviorName); }

}
DecoratorBehavior.register('DecoratorBehavior');

//------------------------------------------------------------------------------------------
//-- InvertBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Inverts completion status when child finishes.

export class InvertBehavior extends DecoratorBehavior {

    onSucceed(child, data) {this.fail(data)};
    onFail(child, data) {this.succeed(data)};

}
InvertBehavior.register('InvertBehavior');

//------------------------------------------------------------------------------------------
//-- SucceedBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Always returns success when the child finishes.

export class SucceedBehavior extends DecoratorBehavior {

    onSucceed(child, data) { this.succeed(data) };
    onFail(child, data) { this.succeed(data) };

}
SucceedBehavior.register('SucceedBehavior');

//------------------------------------------------------------------------------------------
//-- FailBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Always returns fail when the child finishes.

export class FailBehavior extends DecoratorBehavior {

    onSucceed(child, data) {this.fail(data)};
    onFail(child, data) {this.fail(data)};

}
FailBehavior.register('FailBehavior');

//------------------------------------------------------------------------------------------
//-- DelayBehavior -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Succeeds when delay time is reached.

export class DelayBehavior extends Behavior {

    get tickRate() { return 0 }
    get delay() { return this._delay || 1000};

    onStart() { this.future(this.delay).succeed(); }

}
DelayBehavior.register("DelayBehavior");

//------------------------------------------------------------------------------------------
//-- LoopBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Repeatedly executes a child behavior until count is reached, as long
// as it succeeds. If it fails, the loop returns failure. If the count is set to 0, it executes indefinitely.

export class LoopBehavior extends DecoratorBehavior {

    get count() {return this._count || 0}

    onStart() {
        this.n = 0;
        this.startChild(this.behaviorName);
    }

    onSucceed() { ++this.n === this.count ? this.succeed() : this.startChild(this.behavior);   }
    onFail() { this.fail(); }

}
LoopBehavior.register('LoopBehavior');


// console.log(Constants.WC_BEHAVIORS);