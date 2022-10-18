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
                landMatrix[x][y][1] = Constants.voxel.rock;
                if (Math.random() < 0.7) landMatrix[x][y][2] = Constants.voxel.rock;
                if (Math.random() < 0.5) landMatrix[x][y][3] = Constants.voxel.dirt;
                if (Math.random() < 0.1) landMatrix[x][y][4] = Constants.voxel.dirt;


            }
        }
        // landMatrix[2][2][2] = Constants.voxel.rock;
        // landMatrix[3][3][2] = Constants.voxel.rock;


        voxels.load(landMatrix);


    }

}
WorldBuilder.register('WorldBuilder');