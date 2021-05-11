import { Voxels } from "./Voxels";

let topLayer = Voxels.sizeZ-1;

export function GetTopLayer() { return topLayer; }
export function SetTopLayer(t) { topLayer = t;}