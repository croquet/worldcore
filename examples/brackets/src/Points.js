import { Constants } from "@croquet/croquet";

export function RoundPoints(r, p) {
    return Constants.Points[r][p];
}

Constants.Points = [
    [3,2,1],        // Preliminaries
    [3,2,1],        // Quarterfinals
    [3,2,1],        // Semifinals
    [3,2,1],        // Finals
];
