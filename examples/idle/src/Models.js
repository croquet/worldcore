import {  AccountManager, ModelRoot, Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";

//------------------------------------------------------------------------------------------
// -- BigNum -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class BigNum {

    constructor(n = 0) {
        this.a = [];
        do {
            this.a.push(n%1000);
            n = Math.floor(n/1000);
        } while (n>0);
    }

    add(bn) {
        const result = [];
        const max = Math.max(this.a.length, bn.a.length);
        let carry = 0;
        for (let n = 0; n < max; n++) {
            const sum = carry + (this.a[n] || 0) + (bn.a[n] || 0);
            result.push(sum%1000);
            carry = Math.floor(sum/1000);
        }
        if (carry>0) {
            do {
                result.push(carry%1000);
                carry = Math.floor(carry/1000);
            } while (carry>0);
        }
        const out = new BigNum();
        out.a = result;
        return out;
    }

    scale(s) {
        const result = [];
        const max = this.a.length;
        let carry = 0;
        for (let n = 0; n < max; n++) {
            const sum = carry + this.a[n] * s;
            result.push(Math.floor(sum%1000));
            carry = Math.floor(sum/1000);
        }
        if (carry>0) {
            do {
                result.push(carry%1000);
                carry = Math.floor(carry/1000);
            } while (carry>0);
        }
        const out = new BigNum();
        out.a = result;
        return out;
    }

    // sub(n) {
    // }

    get text() {
        switch (this.a.length) {
            default: return "infinity";
            case 1: return this.a[0];
            case 2: return this.a[1] + ',' + String(this.a[0]).padStart(3,'0');
            case 3: return this.a[2] + this.a[1]/1000 + " million";
            case 4: return this.a[3] + this.a[2]/1000 + " billion";
            case 5: return this.a[4] + this.a[3]/1000 + " trillion";
            case 6: return this.a[5] + this.a[4]/1000 + " quadrillion";
            case 7: return this.a[6] + this.a[5]/1000 + " quintillion";
            case 8: return this.a[7] + this.a[6]/1000 + " sextillion";
            case 9: return this.a[8] + this.a[7]/1000 + " septillion";
            case 10: return this.a[9] + this.a[8]/1000 + " octillion";
            case 11: return this.a[10] + this.a[9]/1000 + " nonillion";
            case 12: return this.a[11] + this.a[10]/1000 + " decillion";
        }
    }

}


//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Population extends Actor {

    get account() {return this._account}
    get type() {return this._type}
    get size() {return this._size || 1}

    init(options) {
        super.init(options);
        this.count = 0;
    }

    get population() {return this.count * this.size}

    buy(n) {
        this.count += n;
    }

    tick() {
        console.log(this.type + " tick");
        const food = this.account.resources.get("Food");
        food.count+=this.population;
    }

}
Population.register('Population');

//------------------------------------------------------------------------------------------
// -- Lackey -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Lackey extends Population {

    get foodCost() {return this.count * 1.5}
    get type() {return "Lackey"}

}
Lackey.register('Lackey');

//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    get population() {
        let sum = 0;
        this.domain.forEach(p => {sum += p.population});
        return sum;
    }

    init(options) {
        super.init(options);
        console.log("new account");
        this.nickname = Nickname();
        this.mood = "happy";
        this.resources = new Map();
        this.domain = new Map();
        this.resources.set("Wood", {count: 0});
        this.resources.set("Iron", {count: 0});
        this.resources.set("Stone",{count: 0});
        this.resources.set("Food", {count: 0});

        this.domain.set("Lackeys", Lackey.create({account: this}));
        // this.domain.set("Huts", Population.create({type: "Huts"}));
        // this.domain.set("Villages", Population.create({type: "Villages"}));
        // this.domain.set("Towns", Population.create({type: "Towns"}));

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);

        console.log(this.population);

        // this.future(1000).tick();
    }

    tick() {
        console.log(this.accountId + " tick");
        this.domain.forEach( p => p.tick());
        this.say("changed");
        this.future(1000).tick();
    }

    onClick(type) {
        const resource = this.resources.get(type);
        resource.count++;
        this.say("changed");
    }

    onBuyPopulation(type) {
        console.log(type);
        const pop = this.domain.get(type);
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
        const a = new BigNum(1234567890);
        const b = new BigNum(600001);
        const c = a.scale(12345678);
        const d = a.add(b);
        console.log(c.a);
        console.log(c.text);

    }

}
MyModelRoot.register("MyModelRoot");
