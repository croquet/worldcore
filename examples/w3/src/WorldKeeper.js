import { ModelService } from "@croquet/worldcore-kernel";
import { RoadActor, TreeActor } from "./Props";

//------------------------------------------------------------------------------------------
//-- WorldKeeper ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Saves and loads a world.

export class WorldKeeper extends ModelService {

    init() {
        super.init('WorldKeeper');

        // persist now and then every minute
        this.keep();

        // this first persist call during init() will not actually upload the world,
        // but it will set the persistence hash so we do not persist until the world
        // is actually modified

        // if there was a persisted world, the root model will call our restore()
        // very soon after this init() call
    }

    keep() {
        this.persist();
        this.future(60_000).keep();
    }

    persist() {
        // no-op if the world was not modified since the last persist
        this.wellKnownModel("modelRoot").persistSession(() => this.store());
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

    // called from the root model's init if there is a persisted world
    restore(saved) {
        try {
            const { voxels, water, props } = saved;
            this.service("Voxels").restore(voxels);
            this.service("Water").restore(water);
            this.service("Props").restore(props);
            // since this is executed during root's init,
            // this persist call will not actually upload the world,
            // but it will set the persistence hash so we do not persist
            // until the world is actually modified
            this.persist();
        } catch (e) {
            console.error("Failed to restore world:", e);
            // prevent random world corruption
            console.warn("Disabling world keeper. After fixing the bug, reload the page.");
            this.cancelFuture(this.keep);
            debugger;
        }
    }
}
WorldKeeper.register('WorldKeeper');
