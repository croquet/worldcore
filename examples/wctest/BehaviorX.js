import { RegisterMixin, WorldcoreModel, Shuffle } from "@croquet/worldcore-kernel";

import * as Worldcore from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- Behavioral ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// StartBehavior sets the actor's current root behavior.

export const AM_BehavioralX = superclass => class extends superclass {

    // init(options={}) {
    //     super.init(options);
    // }

    destroy() {
        super.destroy();
        if (this.behavior) this.behavior.destroy();
    }

    startBehavior(behavior, options = {}) {
        if (this.behavior) this.behavior.destroy();
        options.actor = this;
        const target = behavior.create(options);
        this.behavior = target;
    }

}
RegisterMixin(AM_BehavioralX);

//------------------------------------------------------------------------------------------
//-- Handler -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Handler  { // Better name!

    get(target, prop, receiver) {
        if(this[prop]) return this[prop];
        if(prop === "base") return target;
        return Reflect.get(...arguments);
    }

    foo() {
        console.log("proxy foo")
        this.base.foo();
    }

    do(delta) {
        this.base.do(delta); // The base handler provide fall thru to the behavior
    }

}


//------------------------------------------------------------------------------------------
//-- Behavior ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BehaviorX extends WorldcoreModel {
    init(options) {
        super.init();

        this.set(options);
        if (this.parent) this.parent.addChild(this);

        if (this.tickRate) {
            const firstDelta = Math.random() * this.tickRate;
            this.future(firstDelta).tick(firstDelta);
        }

        // this.proxy.foo();

        // const xxx = this.do.toString();
        // const xxx = this.do.toString(); // It would be nice to extract the code to initialize the code string, but has package dependencies
        // console.log(xxx);

        // this.doCode = `
        //     console.log("do!");
        //     super.do(delta);
        // `

        this.set({
            doCode:
        `
        console.log("do!");
        super.do(delta);
        `
        });

        console.log(this.doCode);
    }

    get proxy() {
        if (!this.$proxy) {

            const factoryCode = `return class extends superclass { do(delta) {${this.doCode}} }`;
            const factory = new Function('superclass', 'Worldcore', factoryCode); // Need a better way to handle package dependencies!
            const cls = factory(Handler, Worldcore);

            this.$proxy = new Proxy(this, cls.prototype);
            // this.$proxy = new Proxy(this, Handler.prototype); / For testing the raw handler
        }
        return this.$proxy;
    }

    foo() {
        console.log("base foo");
    }

    get doCode() { return this._doCode}  // Combine start succeed and fail?  Maybe onStart, onSucceed, on Failure yes combine so you can create helper methods in the code block

    destroy() {
        super.destroy();
        if (this.parent) this.parent.removeChild(this);
        this.doomed = true;
    }

    set(options = {}) { // Need to clear $proxy if code is set.
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) this["_" + option[0]] = option[1];
    }

    get actor() { return this._actor}
    get parent() { return this._parent}
    get tickRate() { return this._tickRate || 100}

    tick(delta) {
        if (this.doomed) return;
        this.proxy.do(delta);
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
BehaviorX.register('BehaviorX');