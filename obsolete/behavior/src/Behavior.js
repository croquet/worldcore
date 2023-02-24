// import { RegisterMixin, WorldcoreModel, Shuffle, Actor,  Pawn, GetPawn,Constants } from "@croquet/worldcore-kernel";
import { RegisterMixin, Shuffle, Actor,Constants } from "@croquet/worldcore-kernel";


Constants.WC_BEHAVIORS = new Map();

//------------------------------------------------------------------------------------------
//-- Utilities -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function fromS(s) {return 1000*s}
export function fromM(m) {return 60000*m}
export function fromH(h) {return 60*fromM(h)}
export function fromD(d) {return 24*fromH(d)}

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
        this.future(0).onStart();
        if (!this.doomed && this.tickRate && this.do) {
            const firstDelta = Math.random() * this.tickRate;
            this.future(firstDelta).tick(firstDelta);
        }
    }

    destroy() {
        this.onDestroy();
        super.destroy();
    }

    get name() {return this._name || "Behavior"}
    get actor() { return this._actor}
    get tickRate() { return this._tickRate || 100}
    get isPaused() { return this._pause};

    pause() { this.set({pause:true})}
    resume() { this.set({pause:false})}

    pauseSet(pause) {
        this._children.forEach(child => child.set({pause}));
    }

    set tickRate(t) { this._tickRate = t}

    tick(delta) {
        if (this.actor && this.actor.doomed) return;
        if (this.doomed) return;
        if (!this.isPaused) this.do(delta);
        if (!this.doomed) this.future(this.tickRate).tick(this.tickRate);
    }

    kill(name) {
        const victim = this.get(name)
        if (victim) victim.destroy();
    }

    get(name) {
        const b = Constants.WC_BEHAVIORS.get(name);
        if (!b) return;
        for (const child of this.children) if (child instanceof b) return child;
    }

    start(behavior) {
        if (!behavior) return;
        let name = behavior;
        let options = {};
        if (behavior.name) {
            name = behavior.name;
            options = behavior;
        }
        options.actor = this.actor;
        options.parent = this;

        const b = Constants.WC_BEHAVIORS.get(name);
        if (b) {
            return b.create(options);
        } else{
            console.warn("Behavior "+ name + " not found!")
        }
    }

    succeed(data) {
        if (this.parent) this.parent.onSucceed(this, data);
        this.destroy();
    }

    progress(data) {
        if (this.parent) this.parent.onProgress(this, data);
    }

    fail(data) {
        if (this.parent) this.parent.onFail(this, data);
        this.destroy();
    }

    onStart() {}
    onDestroy() {}
    onSucceed(child, data) {};
    onProgress(child, percent) { this.progress(percent)};
    onFail(child, data) {};

}
Behavior.register('Behavior');

//------------------------------------------------------------------------------------------
//-- DestroyBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Immediately destroys the actor (and itself)

export class DestroyBehavior extends Behavior {

    onStart() { this.actor.destroy(); }

}
DestroyBehavior.register('DestroyBehavior');

//------------------------------------------------------------------------------------------
//-- PrintBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Prints to the console

export class PrintBehavior extends Behavior {

    get text() { return this._text || "test"}

    onStart() {
        console.log(this.text);
        this.succeed();
    }

}
PrintBehavior.register('PrintBehavior');

//------------------------------------------------------------------------------------------
//-- SubscribeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Succeeds when an event is received.

export class SubscribeBehavior extends Behavior {

    get scope() { return this._scope || this.actor.id}
    get event() { return this._event || "event"}
    get data() { return this._data}

    onStart() {
        this.subscribe(this.scope, this.event, this.succeed);
    }


}
SubscribeBehavior.register('SubscribeBehavior');

//------------------------------------------------------------------------------------------
//-- PublishBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Publishes an event and immediately succeeds

export class PublishBehavior extends Behavior {

    get scope() { return this._scope || this.actor.id}
    get event() { return this._event || "event"}
    get data() { return this._data}

    onStart() {
        this.publish(this.scope, this.event, this.data);
        this.succeed();
    }

}
PublishBehavior.register('PublishBehavior');

//------------------------------------------------------------------------------------------
//-- RandomBehavior -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Runs a random behavior from its list of descriptors

export class RandomBehavior extends Behavior {

    get behaviors() {return this._behaviors || []}

    onStart() {
        if (this.behaviors.length === 0) {
            this.fail();
            return;
        }

        let total = 0;
        for (let i = 0; i < this.behaviors.length; i++) {
            let weight = this.behaviors[i].weight;
            if (weight===undefined) weight = 1;
            total += weight;
        }

        if (total === 0) {
            console.warn("RandomBehavior: All weights are 0!")
            this.start(this.behaviors[0]);
            return;
        }

        const pick = total * this.random();

        total = 0;
        for (let i = 0; i < this.behaviors.length; i++) {
            let weight = this.behaviors[i].weight;
            if (weight===undefined) weight = 1;
            total += weight;
            if (pick <= total) {
                this.start(this.behaviors[i]);
                return;
            }
        }

        this.fail();

    }

    onSucceed() { this.succeed() }
    onFail() { this.fail(); }

}
RandomBehavior.register('RandomBehavior');

//------------------------------------------------------------------------------------------
//-- CompositeBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Behaviors with multiple child behaviors. They don't tick themselves, but respond to reported success or
// failure by their children who are ticking.

export class CompositeBehavior extends Behavior {

    get behaviors() {return this._behaviors || []}
    get isParallel() { return this._parallel }
    get isShuffle() { return this._shuffle }

    onStart() {
        this.n = 0;
        this.pending = this.behaviors.length;
        if (this.isShuffle) this.deck = Shuffle(this.behaviors.length);
        this.isParallel ? this.startAll() : this.startNext();
    }

    startAll() {
        for (let i = 0; i < this.behaviors.length; i++ ) {
            if (this.doomed) return;
            this.isShuffle ? this.start(this.behaviors[this.deck[i]]) : this.start(this.behaviors[i]);
        }
    }

    startNext() {
        if (this.isParallel) return;
        this.isShuffle ? this.start(this.behaviors[this.deck[this.n++]]) : this.start(this.behaviors[this.n++]);
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

    get behavior() { return this._behavior }

    onStart() { this.child = this.start(this.behavior); }

    onSucceed(child, data) {if (this.child = child) this.succeed(data)}
    onFail(child, data) {if (this.child = child) this.fail(data)}

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
// as it succeeds. If it fails, the loop returns failure.
// If the count is set to 0, it executes indefinitely. BEWARE: if the behavior succeeds on start in an infinite loop you will exceed thr call stack

export class LoopBehavior extends DecoratorBehavior {

    get count() {return this._count || 0}

    onStart() {
        this.n = 1;
        this.start(this.behavior);
    }

    onSucceed() {
        this.progress(this.n);
        if (!this.count || this.n < this.count) {
            this.n++
            this.start(this.behavior)
        } else { this.succeed()}
    }

    onFail() { this.fail(); }

}
LoopBehavior.register('LoopBehavior');

//------------------------------------------------------------------------------------------
//-- TryBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Repeatedly tries a child until it succeeds. Delays between each trial

export class TryBehavior extends DecoratorBehavior {

    get delay() {return this._delay || fromS(1)} // one second

    // onStart() {
    //     this.start(this.behavior);
    // }

    onSucceed() { this.succeed()}
    onFail() { this.future(this.delay).onStart(); }
}
TryBehavior.register('TryBehavior');

//------------------------------------------------------------------------------------------
//-- RetryBehavior ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Keeps trying a child until it fails. Delays between each trial

export class RetryBehavior extends DecoratorBehavior {

    get delay() {return this._delay || 1000} //

    onSucceed() { this.future(this.delay).onStart();}
    onFail() { this.fail(); }
}
RetryBehavior.register('RetryBehavior');

//------------------------------------------------------------------------------------------
//-- BranchBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BranchBehavior extends DecoratorBehavior {

    get then() { return this._then}
    get else() { return this._else}

    onStart() {
        this.conditionChild = this.start(this.behavior);
    }

    onSucceed(child) {
        if (child === this.conditionChild) {
            this.conditionChild === null;
            if (this.then) this.start(this.then)
        } else {
            this.succeed();
        }
    }

    onFail(child) {
        if (child === this.conditionChild){
            this.condition === null;
            if (this.else) this.start(this.else)
        } else {
            this.fail();
        }
    }

}
BranchBehavior.register('BranchBehavior');

//------------------------------------------------------------------------------------------
//-- InterruptBehavior ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class InterruptBehavior extends DecoratorBehavior {

    get watch() { return this._interrupt}

    onStart() {
        this.primaryChild = this.start(this.behavior);
        this.watchChild = this.start(this.watch);
    }

    onProgress(child, percent) {
        if (child === this.watchChild) {
            // console.log("on progress: " + percent)
            if (percent===0) {
                // console.log("interrupt!")
                this.primaryChild.destroy();
            }
            if (percent===1) {
                // console.log("resume!")
                this.primaryChild = this.start(this.behavior);
            }
        } else {
            this.progress(this, percent);
        }

    }

    // onSucceed(child, data) {
    //     // console.log("s:" + child);
    //     super.onSucceed(child, data);

    // }

    // onFail(child, data) {
    //     // console.log("f:" + child);
    //     super.onFail(child, data);
    // }

}
InterruptBehavior.register('InterruptBehavior');
