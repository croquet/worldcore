
import { BigNum } from "./BigNum";

//------------------------------------------------------------------------------------------
// -- Resource -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Resource {

    constructor() {
        this.count = new BigNum(0);
        this.production = new BigNum(0);
        this.multiplier = 1;
    }

    get perSecond() {
        const production = this.production.clone();
        production.scale(10*this.multiplier);
        return production;
    }

    produce() {
        const production = this.production.clone();
        production.scale(this.multiplier);
        this.count.increment(production);
    }

}
