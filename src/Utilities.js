//------------------------------------------------------------------------------------------
//-- PriorityQueue -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Implements a basic priority queue.

// If you wanted to set up a queue that sorted on key/value pairs it would look like this:
// const q = new PriorityQueue((a, b) => a.key < b.key);

const defaultComparator = (a, b) => a < b;

export class PriorityQueue {

    constructor(comparator = defaultComparator) {
        this.items = [];
        this.comparator = comparator;
    }

    get isEmpty() { return (this.items.length === 0); }
    get count() { return this.items.length; }
    get top() { return this.items[0]; }

    clear() { this.items.length = 0; }

    push(item) {
        let n = this.items.length;
        while (n > 0 && !this.comparator(this.items[n >> 1], item)) {
            this.items[n] = this.items[n >> 1];
            n >>= 1;
        }
        this.items[n] = item;
    }

    pop() {
        const top = this.items[0];
        const last = this.items.pop();
        if (this.items.length > 0) {
            this.items[0] = last;
            this.heapify(0);
        }
        return top;
    }

    traverse(callback) {
        this.items.forEach(callback);
    }

    heapify(n) {
        let m = n;
        const left = n << 1;
        const right = left + 1;
        if (left < this.items.length && this.comparator(this.items[left], this.items[m])) m = left;
        if (right < this.items.length && this.comparator(this.items[right], this.items[m])) m = right;
        if (m === n) return;
        const swap = this.items[n];
        this.items[n] = this.items[m];
        this.items[m] = swap;
        this.heapify(m);
    }
}
