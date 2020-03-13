import { View } from "@croquet/teatime";

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
        namedViews.set(name, this);
    }

    destroy() {
        super.detach();
        namedViews.delete(this.name);
    }
}

// This lets a view get directly to a well-known model.

export function GetNamedModel(name) {
    return GetNamedView("ViewRoot").model.wellKnownModel(name);
}
