import { RegisterMixin, WorldcoreModel, Shuffle, Actor,  Pawn, GetPawn,Constants } from "@croquet/worldcore-kernel";


Constants.WC_BEHAVIORS = new Map();

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

 // Mixin to allow actors to use behavior trees.

 // StartBehavior sets the actor's current root behavior.

 export const AM_Behavioral = superclass => class extends superclass {

    init(options) {
        super.init(options);
        this.behavior = Behavior.create({actor: this});
    }

    destroy() {
        super.destroy();
        if (this.behavior) this.behavior.destroy();
    }

    // startBehavior(behavior) {
    //     if (!behavior) return;
    //     if (this.behavior) this.behavior.destroy();
    //     const name = behavior.name || behavior;
    //     const options = behavior.options || {};
    //     options.actor = this;
    //     const b = Constants.WC_BEHAVIORS.get(name);
    //     if (b) {
    //         this.behavior = b.create(options);
    //     } else{
    //         console.warn("Behavior "+ name + " not found!")
    //     }
    // }

    startBehavior(behavior) {
        console.log("obsolete");
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
        if (!this.doomed && this.tickRate && this.do) {
            const firstDelta = Math.random() * this.tickRate;
            this.future(firstDelta).tick(firstDelta);
        }
    }

    destroy() {
        this.onDestroy();
        super.destroy();
    }

    get actor() { return this._actor}
    get tickRate() { return this._tickRate || 100}
    set tickRate(t) { this._tickRate = t}

    tick(delta) {
        if (this.actor && this.actor.doomed) return;
        if (this.doomed) return;
        this.do(delta);
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

    kill(behavior) {
        const name = behavior.name || behavior;
        const b = Constants.WC_BEHAVIORS.get(name);
        if (!b || !this.children) return;

        for (const child of this.children) {
            if (child instanceof b) {
                child.destroy();
            }
        }
    }

    isRunning(behavior) {
        if (!this.children) return false;
        for (const child of this.children) if (child instanceof behavior) return child;;
        return false;
    }

    start(behavior) {
        if (!behavior) return;
        const name = behavior.name || behavior;
        const options = behavior.options || {};
        options.actor = this.actor;
        options.parent = this;
        const b = Constants.WC_BEHAVIORS.get(name);
        let out;
        if (b) {
            out = this.isRunning(b) || b.create(options);
        } else{
            console.warn("Behavior "+ name + " not found!")
        }
        return out;
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
    onDestroy() {}
    onSucceed(child, data) {};
    onFail(child, data) {};

}
Behavior.register('Behavior');

//------------------------------------------------------------------------------------------
//-- DestroyBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Immediately destroys the actor (and itself)

export class DestroyBehavior extends Behavior {

    get tickRate() { return 0 }

    onStart() { this.actor.destroy(); }

}
DestroyBehavior.register('DestroyBehavior');

//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Behaviors with multiple child behaviors. They don't tick themselves, but respond to reported success or
// failure by their children who are ticking.

export class CompositeBehavior extends Behavior {

    get tickRate() { return 0 }
    get behaviors() {return this._behaviors || []}
    get isParallel() { return this._parallel }
    get isShuffle() { return this._shuffle }

    behaviorsSet(b) { // Changing the behaviors in a composite while its running destroys all the old children and starts the new ones.
        if (this.children && this.children.size) {
            new Set(this.children).forEach(child => child.destroy());
            this.onStart();
        }
    }

    onStart() {
        this.n = 0;
        this.pending = this.behaviors.length;
        if (this.isShuffle) this.deck = Shuffle(this.behaviors.length);
        this.isParallel ? this.startAll() : this.startNext();
    }

    startAll() {
        for (let i = 0; i < this.behaviors.length; i++ ) {
            if (this.doomed) return;
            this.isShuffle ? this.startChild(this.behaviors[this.deck[i]]) : this.startChild(this.behaviors[i]);
        }
    }

    startNext() {
        if (this.isParallel) return;
        this.isShuffle ? this.startChild(this.behaviors[this.deck[this.n++]]) : this.startChild(this.behaviors[this.n++]);
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
    get behavior() { return this._behavior }

    behaviorSet(b) { // Changing the behavior in a decorator while it's running destroys the old children and starts the new one.
        if (this.children && this.children.size ) {
            new Set(this.children).forEach(child => child.destroy());
            this.onStart();
        }
    }

    onStart() { this.startChild(this.behavior); }

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
