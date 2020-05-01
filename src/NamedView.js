import { View } from "@croquet/croquet";

const namedViews = new Map();

export function ClearNamedViews() {
    namedViews.clear();
}

export function GetNamedView(name) {
    return namedViews.get(name);
}

export class NamedView extends View {
    constructor(name) {
        super();
        this.name = name;
        if (!name) console.error("All named views must have public names!");
        else this.registerName();
    }

    registerName() {
        namedViews.set(this.name, this);
    }

    reattach() {
        super.reattach();
        this.registerName();
    }

    destroy() {
        this.detach();
    }

    detach() {
        super.detach();
        namedViews.delete(this.name);
    }
}

// This lets a view get directly to a well-known model.

export function GetNamedModel(name) {
    return GetNamedView("ViewRoot").model.wellKnownModel(name);
}
