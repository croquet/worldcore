import { ModelService, Constants, PerlinNoise } from "@croquet/worldcore";
import { unpackKey } from "./Voxels";
import { TreeActor } from "./Props";
// import { Voxels } from "./Voxels";

//------------------------------------------------------------------------------------------
//-- WorldBuilder --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class WorldBuilder extends ModelService {

    init() {
        super.init('WorldBuilder');
    }

    build() {
        console.log("Building new world ... ");
        const voxels = this.service('Voxels');

        const landMatrix = Array.from(Array(Constants.sizeX), ()=>Array.from(Array(Constants.sizeY), ()=>Array.from(Array(Constants.sizeZ), ()=>Constants.voxel.air)));

        const perlin = new PerlinNoise();

        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                let height = 2;
                height += 8 * perlin.noise2D(x * 0.05, y * 0.05);
                height += 4 * perlin.noise2D(x * 0.1, y * 0.1);
                height += 2 * perlin.noise2D(x * 0.2, y * 0.2);
                height += 1 * perlin.noise2D(x * 0.4, y * 0.4);
                height = Math.floor(1* height);
                for (let z = 0; z < height; z++) {
                    landMatrix[x][y][z] = Constants.voxel.dirt;
                }
            }
        }

        perlin.generate();
        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                let height = 2;
                height += 8 * perlin.noise2D(x * 0.05, y * 0.05);
                height += 4 * perlin.noise2D(x * 0.1, y * 0.1);
                height += 2 * perlin.noise2D(x * 0.2, y * 0.2);
                height += 1 * perlin.noise2D(x * 0.4, y * 0.4);
                height = Math.floor(0.75* height);
                for (let z = 0; z < height; z++) {
                    landMatrix[x][y][z] = Constants.voxel.rock;
                }
            }
        }

        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                landMatrix[x][y][0] = Constants.voxel.lava;
                landMatrix[x][y][1] = Constants.voxel.rock;
            }
        }

        for (let z = 0; z < Constants.sizeZ; z++) {
            for (let x = 0; x < Constants.sizeX; x++) {
                landMatrix[x][0][z] = Constants.voxel.base;
                landMatrix[x][Constants.sizeY-1][z] = Constants.voxel.base;
            }
            for (let y = 0; y < Constants.sizeY; y++) {
                landMatrix[0][y][z] = Constants.voxel.base;
                landMatrix[Constants.sizeX-1][y][z] = Constants.voxel.base;
            }
        }


        voxels.setWatertable(8.3);
        voxels.load(landMatrix);

        perlin.generate();
        const surfaces = this.service("Surfaces");
        const walkable = [];
        surfaces.surfaces.forEach((surface, key) => {
            if (surface.isWalkable) walkable.push(key);
        });

        for (let i = 0; i < 2000; i++) {
            const n = Math.floor(this.random() * walkable.length);
            const key = walkable[n]
            const xyz = unpackKey(key)
            let x = xyz[0];
            let y = xyz[1];
            let z = xyz[2];
            if (z < voxels.watertable) continue;
            if (landMatrix[x][y][z-1] !== Constants.voxel.dirt) continue; // Only plant trees in dirt.
            if (perlin.noise2D(x * 0.1, y*0.1) > 0.4) continue // Clump

            x += 0.1 + 0.8 * this.random();
            y += 0.1 + 0.8 * this.random();
            const size = 0.2 + 0.8 * this.random();
            const tree = TreeActor.create({xyz:[x,y,z], size});
            tree.validate();
        }

    }



}
WorldBuilder.register('WorldBuilder');