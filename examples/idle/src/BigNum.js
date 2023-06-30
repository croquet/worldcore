
//------------------------------------------------------------------------------------------
// -- BigNum -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class BigNum {

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
        if (!this.greaterThan(bn)) {
            this.a = [0];
            return;
        }

        let result = [];
        const amax = this.a.length-1;
        const bmax = bn.a.length-1;

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

    greaterThan(bn) {
        const amax = this.a.length-1;
        const bmax = bn.a.length-1;
        if (amax > bmax) return true;
        if (amax < bmax) return false;
        return this.a[bmax] > bn.a[bmax];
    }

    get text() {
        switch (this.a.length) {
            default: return "infinity";
            case 1: return this.a[0].toFixed(0);
            case 2: return this.a[1].toFixed(0) + ',' + this.a[0].toFixed(0).padStart(3,'0');
            // case 2: return this.a[1].toFixed(0) + ',' + String(this.a[0]).padStart(3,'0');
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
