import { ModelService, Constants, PerlinNoise } from "@croquet/worldcore";
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

        // for (let x = 0; x < Constants.sizeX; x++) {
        //     for (let y = 0; y < Constants.sizeY; y++) {
        //         let height = 2;
        //         height += 16 * perlin.noise2D(x * 0.05, y * 0.05);
        //         height += 8 * perlin.noise2D(x * 0.1, y * 0.1);
        //         height += 4 * perlin.noise2D(x * 0.2, y * 0.2);
        //         height += 2 * perlin.noise2D(x * 0.4, y * 0.4);
        //         height = Math.floor(1* height);
        //         for (let z = 0; z < height; z++) {
        //             landMatrix[x][y][z] = Constants.voxel.dirt;
        //         }
        //     }
        // }

        // perlin.generate();
        // for (let x = 0; x < Constants.sizeX; x++) {
        //     for (let y = 0; y < Constants.sizeY; y++) {
        //         let height = 2;
        //         height += 12 * perlin.noise2D(x * 0.05, y * 0.05);
        //         height += 6 * perlin.noise2D(x * 0.1, y * 0.1);
        //         height += 3 * perlin.noise2D(x * 0.2, y * 0.2);
        //         height += 1 * perlin.noise2D(x * 0.4, y * 0.4);
        //         height = Math.floor(0.75* height);
        //         for (let z = 0; z < height; z++) {
        //             landMatrix[x][y][z] = Constants.voxel.rock;
        //         }
        //     }
        // }

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


        // landMatrix[2][2][1] = Constants.voxel.dirt;
        // landMatrix[2][2][2] = Constants.voxel.dirt;
        // landMatrix[2][2][3] = Constants.voxel.dirt;
        // landMatrix[3][2][3] = Constants.voxel.rock;
        // landMatrix[4][2][3] = Constants.voxel.rock;
        // landMatrix[5][2][3] = Constants.voxel.rock;

        // landMatrix[2][4][2] = Constants.voxel.rock;
        // landMatrix[4][2][2] = Constants.voxel.rock;


        voxels.load(landMatrix);



    }

}
WorldBuilder.register('WorldBuilder');