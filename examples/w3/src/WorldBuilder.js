import { Model } from "@croquet/croquet";
import { PerlinNoise } from "@croquet/worldcore";
import { TreeActor } from "./Props";
import { Voxels } from "./Voxels";


export class WorldBuilder extends Model {

    init(...args) {
        super.init(...args);
        this.subscribe("hud", "reset", this.build);
    }

    build() {
        console.log("Building new world ... ");
        const voxels = this.wellKnownModel('Voxels');
        const surfaces = this.wellKnownModel("Surfaces");
        const water = this.wellKnownModel('Water');
        const props = this.wellKnownModel('Props');

        const landMatrix = Array.from(Array(Voxels.sizeX), ()=>Array.from(Array(Voxels.sizeY), ()=>Array.from(Array(Voxels.sizeZ), ()=>0)));

        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                landMatrix[x][y][0] = Voxels.lava;
            }
        }

        const perlin = new PerlinNoise();

        let minHeight0 = Voxels.sizeZ;
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                let height = 18;
                height += 16 * perlin.signedNoise2D(x * 0.025, y * 0.025);
                height += 12 * perlin.signedNoise2D(x * 0.05, y * 0.05);
                height += 6 * perlin.signedNoise2D(x * 0.1, y * 0.1);
                height += 3 * perlin.signedNoise2D(x * 0.2, y * 0.2);
                height += 1 * perlin.signedNoise2D(x * 0.4, y * 0.4);
                height = Math.floor(height);
                height = Math.floor(Math.max(Math.min(height, Voxels.sizeZ-1)));
                minHeight0 = Math.min(minHeight0, height);
                for (let z = 1; z < height; z++) {
                    landMatrix[x][y][z] = Voxels.dirt;
                }
            }
        }

        let minHeight1 = Voxels.sizeZ;
        perlin.generate();
        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                let height = 12;
                height += 16 * perlin.signedNoise2D(x * 0.025, y * 0.025);
                height += 12 * perlin.signedNoise2D(x * 0.05, y * 0.05);
                height += 6 * perlin.signedNoise2D(x * 0.1, y * 0.1);
                height += 3 * perlin.signedNoise2D(x * 0.2, y * 0.2);
                height += 1 * perlin.signedNoise2D(x * 0.4, y * 0.4);
                height = Math.floor(height);
                height = Math.floor(Math.max(Math.min(height, Voxels.sizeZ-1)));
                minHeight1 = Math.min(minHeight1, height);
                for (let z = 1; z < height; z++) {
                    landMatrix[x][y][z] = Voxels.rock;
                }
            }
        }

        const minHeight = Math.max(minHeight0, minHeight1);

        voxels.load(landMatrix);

        const waterMatrix = Array.from(Array(Voxels.sizeX), ()=>Array.from(Array(Voxels.sizeY), ()=>Array.from(Array(Voxels.sizeZ), ()=>0)));

        for (let x = 0; x < Voxels.sizeX; x++) {
            for (let y = 0; y < Voxels.sizeY; y++) {
                for (let z = minHeight+1; z < minHeight+6; z++) {
                    if (!landMatrix[x][y][z]) {
                        waterMatrix[x][y][z] = 1;
                    }
                }
                const z = minHeight+6;
                if (!landMatrix[x][y][z]) {
                    waterMatrix[x][y][z] = 0.3;
                }
            }
        }

        water.load(waterMatrix);

        for (let n = 0; n < 350; n++) {
            const key = surfaces.randomFloor();
            const xyz = Voxels.unpackKey(key);
            const x = xyz[0];
            const y = xyz[1];
            const z = xyz[2];
            if (landMatrix[x][y][z-1] !== Voxels.dirt) continue; // Only plant trees in dirt
            // if (water.getVolumeByKey(key)) continue; // Don't plant trees in water
            if (z < minHeight+7) continue; // Don't plant trees under water
            const maxSize = 1 - 0.6 * this.random();
            const size = maxSize - 0.1;
            TreeActor.create({xyz, maxSize, size});

        }





    }
}
WorldBuilder.register('WorldBuilder');