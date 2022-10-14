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

        const landMatrix = Array.from(Array(Constants.sizeX), ()=>Array.from(Array(Constants.sizeY), ()=>Array.from(Array(Constants.sizeZ), ()=>Constants.air)));

        for (let x = 0; x < Constants.sizeX; x++) {
            for (let y = 0; y < Constants.sizeY; y++) {
                landMatrix[x][y][0] = Constants.rock;
                if (Math.random() < 0.7) landMatrix[x][y][1] = Constants.rock;
                if (Math.random() < 0.2) landMatrix[x][y][2] = Constants.rock;
                // if (Math.random() < 0.1) landMatrix[x][y][2] = Constants.rock;

            }
        }
        // landMatrix[2][2][1] = Constants.rock;
        // landMatrix[3][3][1] = Constants.rock;
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