
import { Constants } from "@croquet/croquet";
import { Voxels } from "./Voxels";

let topLayer = Voxels.sizeZ-1;

export function GetTopLayer() { return topLayer; }
export function SetTopLayer(t) { topLayer = t;}

Constants.sim = {
    gravity: 9.8
};
