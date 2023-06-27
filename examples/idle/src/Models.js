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

    increment(bn) {
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
        this.a = result;
    }

    decrement(bn) {
        let result = [];
        const amax = this.a.length-1;
        const bmax = bn.a.length-1;
        if (bmax > amax) {
            this.a = [0];
            return;
        }

        if (amax === 0) {
            this.a = [Math.max(0, this.a[0]-bn.a[0])];
            return;
        }

        let borrow = 0;
        for (let n = 0; n < amax; n++) {
            let diff = this.a[n] - borrow - (bn.a[n] || 0);
            if (diff<0) {
                diff += 1000;
                borrow = 1;
            }
            result.push(diff%1000);
        }

        const diff = this.a[amax] - borrow - (bn.a[amax] || 0);
        if (diff>0) result.push(diff%1000);
        if (diff<0) result = [0];

        this.a = result;

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
        this.a = result;
    }

    // compress() {
    //     do {
    //         const test = this.a.pop();
    //         if (test>0) {
    //             this.a.push(test);
    //             break;
    //         }
    //     } while (this.a.length>1);
    // }

    get text() {
        switch (this.a.length) {
            default: return "infinity";
            case 1: return this.a[0].toString();
            case 2: return this.a[1] + ',' + String(this.a[0]).padStart(3,'0');
            case 3: return (this.a[2] + this.a[1]/1000).toFixed(3) + " million";
            case 4: return (this.a[3] + this.a[2]/1000).toFixed(3) + " billion";
            case 5: return (this.a[4] + this.a[3]/1000).toFixed(3) + " trillion";
            case 6: return (this.a[5] + this.a[4]/1000).toFixed(3) + " quadrillion";
            case 7: return (this.a[6] + this.a[5]/1000).toFixed(3) + " quintillion";
            case 8: return (this.a[7] + this.a[6]/1000).toFixed(3) + " sextillion";
            case 9: return (this.a[8] + this.a[7]/1000).toFixed(3) + " septillion";
            case 10: return (this.a[9] + this.a[8]/1000).toFixed(3) + " octillion";
            case 11: return (this.a[10] + this.a[9]/1000).toFixed(3) + " nonillion";
            case 12: return (this.a[11] + this.a[10]/1000).toFixed(3) + " decillion";
        }
    }

}


//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Population extends Actor {

    get cost() {return this._cost || [5]}
    get account() {return this._account}
    get type() {return this._type}
    get size() {return this._size || 1}
    get harvest() { return this._harvest || [0]}

    init(options) {
        super.init(options);
        this.count = 0;
    }

    get population() {return this.count * this.size}

    // buy() {
    //     this.count += 1;
    //     for (let n = 0; n < this.cost.length; n++) {
    //     }
    // }


    tick() {
        for (const n of this.harvest) {
            const amount = new BigNum(this.population);
            this.account.counts[n].increment(amount);
        }
    }

}
Population.register('Population');

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
        this.domain = new Map();

        this.resources = [
            new BigNum(0),
            new BigNum(0),
            new BigNum(0),
        ];

        this.domain.set("Lackeys", Population.create({account: this, type: "Lackeys"}));

        this.listen("clickResource", this.onClick);
        this.listen("buyPopulation", this.onBuyPopulation);

        // this.future(1000).tick(1000);
    }

    tick() {
        // console.log(this.accountId + " tick");
        this.domain.forEach( p => p.tick());
        this.say("changed");
        this.future(1000).tick(1000);
    }

    onClick(n) {
        this.resources[n].increment(new BigNum(5));
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
        console.log("Start root model!");
    }

}
MyModelRoot.register("MyModelRoot");
