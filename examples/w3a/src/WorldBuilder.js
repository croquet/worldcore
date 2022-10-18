import { ModelService, Constants } from "@croquet/worldcore";
import { Voxels } from "./Voxels";

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

        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                landMatrix[x][y][0] = Constants.voxel.lava;
                // landMatrix[x][y][1] = Constants.voxel.rock;
                // if (Math.random() < 0.7) landMatrix[x][y][2] = Constants.voxel.rock;
                // if (Math.random() < 0.5) landMatrix[x][y][3] = Constants.voxel.dirt;
                // if (Math.random() < 0.1) landMatrix[x][y][4] = Constants.voxel.dirt;


            }
        }
        landMatrix[2][2][1] = Constants.voxel.rock;
        landMatrix[2][2][2] = Constants.voxel.rock;
        landMatrix[2][2][3] = Constants.voxel.rock;
        landMatrix[3][2][3] = Constants.voxel.rock;
        landMatrix[4][2][3] = Constants.voxel.rock;
        landMatrix[5][2][3] = Constants.voxel.rock;
        landMatrix[6][2][3] = Constants.voxel.rock;
        landMatrix[7][2][3] = Constants.voxel.rock;
        landMatrix[8][2][3] = Constants.voxel.rock;
        landMatrix[9][2][3] = Constants.voxel.rock;
        landMatrix[10][2][3] = Constants.voxel.rock;
        landMatrix[11][2][3] = Constants.voxel.rock;
        landMatrix[12][2][3] = Constants.voxel.rock;
        landMatrix[13][2][3] = Constants.voxel.rock;
        landMatrix[14][2][3] = Constants.voxel.rock;
        landMatrix[15][2][3] = Constants.voxel.rock;
        landMatrix[16][2][3] = Constants.voxel.rock;
        landMatrix[17][2][3] = Constants.voxel.rock;
        landMatrix[18][2][3] = Constants.voxel.rock;
        landMatrix[19][2][3] = Constants.voxel.rock;
        landMatrix[20][2][3] = Constants.voxel.rock;
        landMatrix[21][2][3] = Constants.voxel.rock;
        landMatrix[22][2][3] = Constants.voxel.rock;
        landMatrix[23][2][3] = Constants.voxel.rock;

        // landMatrix[3][1][1] = Constants.rock;
        // landMatrix[4][2][1] = Constants.rock;
        // landMatrix[5][3][1] = Constants.rock;

        // landMatrix[3][1][1] = Constants.rock;
        // landMatrix[3][2][1] = Constants.rock;
        // landMatrix[3][2][2] = Constants.rock;
        // landMatrix[3][2][1] = Constants.rock;
        // landMatrix[4][2][1] = Constants.rock;

        // landMatrix[5][3][1] = Constants.rock;

        // landMatrix[3][2][3] = Constants.rock;

        voxels.load(landMatrix);


    }

}
WorldBuilder.register('WorldBuilder');