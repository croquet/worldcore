import { BigNum } from "./BigNum";

//------------------------------------------------------------------------------------------
// -- Population ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Population {

    constructor() {
        this.count = 0;
        this.size = 1;
    }

    get population() {return this.count * this.size}
    get markup() {return  1.15**this.count}

}

//------------------------------------------------------------------------------------------
// -- Lackeys ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Lackeys extends Population {

    constructor() {
        super();
        this.name = "Lackeys";
        this.size = 1;
    }

    get price() {
        const food = new BigNum(15);
        food.scale(this.markup);
        return {food};
    }

    get production() {
        const scale = this.population/10; //per tick
            return {
                food: new BigNum(1*scale),
                wood: new BigNum(0.1*scale)
            };
    }

}
