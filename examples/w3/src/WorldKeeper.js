import { ModelService } from "@croquet/worldcore-kernel";
import { RoadActor, TreeActor } from "./Props";

//------------------------------------------------------------------------------------------
//-- WorldKeeper ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Saves and loads a world.

export class WorldKeeper extends ModelService {

    init() {
        super.init('WorldKeeper');

        // persist every minute
        this.future(60000).keep();
    }

    persist() {
        // no-op if the world was not modified since the last persist
        this.wellKnownModel("modelRoot").persistSession(() => this.store());
    }

    keep() {
        this.persist();
        this.future(60000).keep();
    }

    store() {
        // we are not storing the people, because we want to only
        // store when the world was modified, not when a person moved.

        const voxels = this.service("Voxels").store();
        const water = this.service("Water").store();
        const props = this.service("Props").store();

        const data = { voxels, water, props };
        // console.log(data);
        return data;
    }

    restore(saved) {
        try {
            const { voxels, water, props } = saved;
            this.service("Voxels").restore(voxels);
            this.service("Water").restore(water);
            this.service("Props").restore(props);
        } catch (e) {
            console.error("Failed to restore world: ", e);
            // prevent random world corruption
            console.log("Disabling world keeper. After fixing the bug, restart the world.");
            this.cancelFuture(this.keep);
            debugger;
        }
    }
}
WorldKeeper.register('WorldKeeper');
