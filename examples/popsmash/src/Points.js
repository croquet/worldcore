import { Constants } from "@croquet/croquet";

export function RoundPoints(r, p) {
    return Constants.Points[r][p];
}

Constants.Points = [
    [125,110,85],        // Preliminaries
    [125,110,85],        // Quarterfinals
    [125,110,85],        // Semifinals
    [125,110,85],        // Finals
];
