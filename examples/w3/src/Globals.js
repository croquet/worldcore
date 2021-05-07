import { Voxels } from "./Voxels";

let topLayer = Voxels.sizeZ;

export function GetTopLayer() { return topLayer; }
export function SetTopLayer(t) { topLayer = t;}