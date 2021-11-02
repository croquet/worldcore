import { Constants, q_multiply, v3_sub, v2_sub, v2_scale, v2_magnitude, sphericalRandom, q_axisAngle } from "@croquet/worldcore-kernel";
import { Behavior, CompositeBehavior } from "@croquet/worldcore-behavior";
import { Voxels } from "./Voxels";
import { RoadActor } from "./Props";

//------------------------------------------------------------------------------------------
//-- FallBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Gives the actor an upward impulse and a random spin. Destroys the actor when it hits the terrain.

export class FallBehavior extends Behavior {

    init(options) {
        super.init(options);
        this.velocity = -7 + this.random()*(-1);   // m/s
        this.axis = sphericalRandom();
        this.spin = 0.1 + this.random() * 0.9;
        this.startHeight = this.actor.translation[2];
    }

    do(delta) {
        const gravity = 9.8;
        this.velocity = this.velocity + gravity *  delta/1000;
        const t0 = this.actor.translation;
        const t1 = v3_sub(t0, [0, 0, this.velocity * delta/1000]);
        if (this.collide(t0,t1)) {
            this.actor.destroy();
        } else {
            this.actor.rotateTo(q_multiply(this.actor.rotation, q_axisAngle(this.axis, this.spin * delta/1000)));
            this.actor.moveTo(t1);
        }
    }

    collide(t0, t1) {
        if (t1[2] > this.startHeight) return undefined; // Don't collide if above start height
        const voxels = this.service('Voxels');
        const v0 = Voxels.toClippedVoxelXYZ(...t0);
        const v1 = Voxels.toClippedVoxelXYZ(...t1); // May be a bug here
        const x = v0[0];
        const y = v0[1];
        let z = v0[2];
        const bottom = Math.max(0, v1[2]);
        if (z < bottom) return undefined; // Don't collide if moving up.
        do {
            if (voxels.get(x,y,z)) return [x,y,z];
        } while (z-- > bottom);
        return undefined;
    }

}
FallBehavior.register("FallBehavior");

//------------------------------------------------------------------------------------------
//-- PersonBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Top level behavior for people.

export class PersonBehavior extends CompositeBehavior {
    init(options) {
        super.init(options);
        this.startChild(TestTerrain, {tickRate:200});
        this.startChild(WanderBehavior);
    }
}
PersonBehavior.register('PersonBehavior');

//------------------------------------------------------------------------------------------
//-- TestTerrain ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Checks if the animal has been buried in a solid voxel, or had its floor collapse. Run in parallel
// with other behaviors.

class TestTerrain extends Behavior {
    do() {
        const voxels = this.service("Voxels");
        const water = this.service("Water");
        const surfaces = this.service("Surfaces");
        if (voxels.get(...this.actor.xyz)) { // Buried
            this.actor.destroy();
        } else if (water.getVolume(...this.actor.xyz) > Constants.path.maxWaterDepth + this.actor.fraction[2] ) { // Drowned
            console.log("Drowned!");
            this.actor.startBehavior(FallBehavior, {tickRate: 50});
        } else {
            const s = surfaces.get(this.actor.key);
            if (!s || !s.hasFloor()) {
                this.actor.startBehavior(FallBehavior, {tickRate: 50});
            } else {
                const x = this.actor.fraction[0];
                const y = this.actor.fraction[1];
                const z = s.elevation(x,y);
                this.actor.voxelMoveTo(this.actor.xyz, [x,y,z]);
            }
        }

    }
}
TestTerrain.register('TestTerrain');

//------------------------------------------------------------------------------------------
//-- WanderBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Picks a random location, walks to it, then picks another.

class WanderBehavior extends CompositeBehavior {
    init(options) {
        super.init(options);
        this.startChild(SeekBehavior, {tickRate: 500});
    }

    reportSuccess(child, data) {
        if (child instanceof SeekBehavior) {
            const path = data;
            this.startChild(WalkToBehavior, {tickRate: 50, path});
        } else if (child instanceof WalkToBehavior) {
            this.startChild(SeekBehavior, {tickRate: 500});
        }
    };

    reportFailure(child, data) {
        if (child instanceof SeekBehavior) {
            this.fail();
        } else if (child instanceof WalkToBehavior) {
            this.startChild(SeekBehavior, {tickRate: 500});
        }
    };

}
WanderBehavior.register('WanderBehavior');

//------------------------------------------------------------------------------------------
//-- SeekBehavior --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Picks a random location to walk to.

class SeekBehavior extends Behavior {
    init(options) {
        super.init(options);
        this.seek();
    }

    do() { this.seek(); }

    seek() {
        const surfaces = this.service("Surfaces");
        const paths = this.service('Paths');
        const key = surfaces.randomFloor();
        const path = paths.findPath(this.actor.key, key);
        if (path.length > 0) this.succeed(path);
    }

}
SeekBehavior.register('SeekBehavior');

//------------------------------------------------------------------------------------------
//-- WalkToBehavior ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Walk to a locaton.
// Can be started with either an xyz destination or a path. You can also
// set fraction to determine where in the final voxel you go.

class WalkToBehavior extends Behavior {

    get xyz() { return this._xyz}
    get fraction() { return this._fraction || [0.5, 0.5, 0]}
    get speed() { return this._speed || 1}; // Voxels traversed per second.
    get path() { return this._path};

    init(options) {
        super.init(options);

        if (this.path){
            const xyz = Voxels.unpackKey(this.path[this.path.length-1]);
            this.set({xyz});
        } else {
            const paths = this.service('Paths');
            const start = this.actor.key;
            const end = Voxels.packKey(...this.xyz);
            const path = paths.findPath(start, end);
            this.set({path});
        }

        this.step = 0;

        if (this.path.length < 1) { // No path was found
            this.fail();
            return;
        } else if (this.path.length === 1) { // Already at end voxel.
            this.exit = this.fraction;
        } else {
            const here = Voxels.unpackKey(this.path[0]);
            const there = Voxels.unpackKey(this.path[1]);
            this.exit = this.findExit(here, there);
        }

        this.forward = v2_sub(this.exit, this.actor.fraction);

        const mag = v2_magnitude(this.forward);
        if (mag > 0) {
            this.forward = v2_scale(this.forward, 1/mag);
        } else {    // Starting at exit point, so any forward vector will work
            this.forward = [1,0];
        }

        this.rotateToFacing(this.forward);
    }

    do(delta) {

        const water = this.service('Water');
        const props = this.service('Props');

        let xyz = this.actor.xyz;
        let fraction = this.actor.fraction;

        let freedom = 1;
        const depth = water.getVolume(...xyz) - fraction[2];
        if (depth > Constants.path.deepWaterDepth) freedom /= Constants.path.deepWaterWeight;
        if (props.getRoad(this.actor.key)) freedom *= Constants.path.roadSpeed;

        let travel = freedom * this.speed * delta / 1000;
        let remaining = v2_sub(this.exit, fraction); // remaing distance to exit
        let advance = v2_scale(this.forward, travel); // amount traveled this tick

        while (Math.abs(advance[0]) > Math.abs(remaining[0]) || Math.abs(advance[1]) > Math.abs(remaining[1])) { // Moved past exit
            if (this.step === this.path.length-1) { // We've arrived!
                this.reposition(this.xyz, this.fraction);
                this.succeed();
                return;
            } else { // Skip to next voxel

                const nextKey = this.path[this.step+1];
                const paths = this.service("Paths");
                if (!paths.hasExit(this.actor.key, nextKey)) { // Route no longer exists
                    this.fail();
                    return;
                }

                const maxDepth = Constants.path.maxDepth;
                if (water.getVolumeByKey(nextKey) > maxDepth) { // Route is flooded
                    this.fail();
                    return;
                }

                this.step++;

                const previous = xyz;
                xyz = Voxels.unpackKey(this.path[this.step]);
                fraction = this.findEntrance(xyz, previous);

                if (this.step === this.path.length-1) { // We've entered the final voxel
                    this.exit = this.fraction;
                } else {
                    const next = Voxels.unpackKey(this.path[this.step+1]);
                    this.exit = this.findExit(xyz, next);
                }

                travel -= v2_magnitude(remaining);
                remaining = v2_sub(this.exit, fraction);

                const mag = v2_magnitude(remaining);
                if (mag > 0)  this.forward = v2_scale(remaining, 1/mag);

                if (Number.isNaN(this.forward[0])) {
                    console.log("remaining" + remaining);
                    console.log("forward  " + this.forward);
                }

                advance = v2_scale(this.forward, travel);
            }
        }

        fraction[0] = Math.min(1, Math.max(0, fraction[0] + advance[0]));
        fraction[1] = Math.min(1, Math.max(0, fraction[1] + advance[1]));

        this.reposition(xyz, fraction);
        this.rotateToFacing(this.forward);
    }

    reposition(xyz, fraction) {
        const surfaces = this.service("Surfaces");
        const surface = surfaces.get(Voxels.packKey(...xyz));
        if (surface) fraction[2] = surface.elevation(...fraction);
        this.actor.voxelMoveTo(xyz, fraction);
    }

    // Given the xyz of the current voxel and the voxel you're coming from, returns the point in the current voxel
    // you should enter at.

    findEntrance(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0,0];
            if (y0 < y1) return [0,1,0];
            return [0,0.4,0];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0,0];
            if (y0 < y1) return [1,1,0];
            return [1,0.6,0];
        }
        if (y0 > y1) return [0.6,0,0];
        if (y0 < y1) return [0.4,1,0];
        return [0.5,0.5,0];
    }

    // Given the xyz of the current voxel and the voxel you're headed toward, returns the point in the current voxel
    // you should move toward.

    findExit(here, there) {
        const x0 = here[0];
        const y0 = here[1];
        const x1 = there[0];
        const y1 = there[1];
        if (x0 > x1) {
            if (y0 > y1) return [0,0,0];
            if (y0 < y1) return [0,1,0];
            return [0,0.6,0];
        }
        if (x0 < x1) {
            if (y0 > y1) return [1,0,0];
            if (y0 < y1) return [1,1,0];
            return [1,0.4,0];
        }
        if (y0 > y1) return [0.4,0,0];
        if (y0 < y1) return [0.6,1,0];
        return [0.5, 0.5,0];
    }

    rotateToFacing(xy) {
        let angle = Math.acos(xy[1]);
        if (xy[0] > 0) angle *= -1;
        this.actor.rotateTo(q_axisAngle([0,0,1], angle));
    }

}
WalkToBehavior.register("WalkToBehavior");


