import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";
import { BigNum } from "./BigNum";

//------------------------------------------------------------------------------------------
// -- Resource -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Resource extends Actor {


    get account() {return this._account}
    get key() {return this._key}

    init(options) {
        super.init(options);
        this.count = new BigNum(0);
        this.multiplier = 1;
        this.boost = 0;
    }

    increment(bn) {
        this.count.increment(bn);
    }

    get production() { // per tick
        const total = new BigNum();
        this.account.domain.forEach(pop => {
            const prod = pop.production(this.key);
            total.increment(prod);
        });
        total.scale(this.multiplier);
        return total;
    }

    produce() {
        this.increment(this.production);
    }

}
Resource.register('Resource');

//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Population extends Actor {

    get account() {return this._account}

    init(options) {
        super.init(options);
        this.count = 0;
        this.size = 1;
    }

    get population() {return this.count * this.size}

    buy() {
        const price = this.price;
        if (!this.account.canAfford(price)) {
            console.log("Too much!"); return;
        }
        this.account.spend(price);
        this.count += 1;
    }

}
Population.register('Population');

//------------------------------------------------------------------------------------------
// -- Lackeys ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Lackeys extends Population {

    init(options) {
        super.init(options);
        this.count = 0;
        this.subscribe("input", "xDown", this.test);
    }

    get price() {
        const base = { Food: new BigNum(15)};
        const markup = 1.15**this.count;
        base.Food.scale(markup);
        return base;
    }

    production(key) {
        const scale = this.population/20; //per tick
        switch (key) {
            default: return new BigNum();
            case "Food": return new BigNum(1*scale);
            case "Wood": return new BigNum(0.1*scale);
        }
    }

    test() {
        console.log(this.production.Food.text);
        console.log(this.production.Wood.text);
    }


}
Lackeys.register('Lackeys');

//------------------------------------------------------------------------------------------
// -- Tech ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Tech extends Actor {

    get account() {return this._account}
    get price() {return { Wood: new BigNum(20)}}
    get name() { return "Basketweaving" }
    get hint() { return "+1% food production" }
    get effect() { return {Food: 0.01}}

    init(options) {
        super.init(options);
        this.subscribe("input", "tDown", this.buy);
    }

    buy() {
        const price = this.price;
        if (!this.account.canAfford(price)) {
            console.log("Too much!"); return;
        }

        console.log("Bought Tech!");

        // const account = this.account;
        // for (const key in this.effect) {
        //     const resource = account.resources.get(key);
        //     if (resource) resource.multiplier += this.effect.key;
        // }

        const food = this.account.resources.get("Food");
        food.multiplier += 0.01;
        this.account.say("changed");
    }

}
Tech.register('Tech');

//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    static types() {
        return {
            "BigNum": BigNum
        };
    }

    get population() {
        let sum = 0;
        this.domain.forEach(p => {sum += p.population});
        return sum;
    }

    init(options) {
        super.init(options);
        this.nickname = Nickname();
        this.mood = "happy";


        this.resources = new Map();
        this.resources.set("Food", Resource.create({account: this, key: "Food"}));
        this.resources.set("Wood", Resource.create({account: this, key: "Wood"}));
        this.resources.set("Stone", Resource.create({account: this, key: "Stone"}));
        this.resources.set("Iron", Resource.create({account: this, key: "Iron"}));

        this.domain = new Map();
        this.domain.set("Lackeys", Lackeys.create({account: this}));

        this.tech = Tech.create({account: this});

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);


        this.future(50).tick();
    }

    tick(delta) {
        this.resources.forEach(resource => resource.produce(delta));

        this.say("changed");
        this.future(50).tick();
    }

    onClick(n) {
        this.resources.get(n).increment(new BigNum(10));
        this.say("changed");
    }

    spend(amount) {
        for (const key in amount) {
            console.log(key + ": " + amount[key].text);
            this.resources.get(key).count.decrement(amount[key]);
        }
    }

    canAfford(amount) {
        for (const key in amount) {
            if (amount[key].greaterThan(this.resources.get(key).count)) return false;
        }
        return true;
    }

    onBuyPopulation(key) {
        // console.log("buy " + key);
        const pop = this.domain.get(key);
        if (pop) pop.buy(1);
        this.say("changed");
    }

}
MyAccount.register('MyAccount');

class MyAccountManager extends AccountManager {

    get defaultAccount() {return MyAccount}

}
MyAccountManager.register('MyAccountManager');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyAccountManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
    }

}
MyModelRoot.register("MyModelRoot");
