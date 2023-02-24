export const Colors = [
    [0.0, 0.0, 0.0],        // Null

    [0.9, 0.9, 0.9],        // White
    [0.5, 0.5, 0.5],        // Gray
    [0.2, 0.2, 0.2],        // Black

    rgb(242, 215, 213),        // Red
    rgb(217, 136, 128),        // Red
    rgb(192, 57, 43),        // Red

    rgb(240, 178, 122),        // Orange
    rgb(230, 126, 34),        // Orange
    rgb(175, 96, 26),        // Orange

    rgb(247, 220, 111),        // Yellow
    rgb(241, 196, 15),        // Yellow
    rgb(183, 149, 11),        // Yellow

    rgb(125, 206, 160),        // Green
    rgb(39, 174, 96),        // Green
    rgb(30, 132, 73),        // Green

    rgb(133, 193, 233),         // Blue
    rgb(52, 152, 219),        // Blue
    rgb(40, 116, 166),        // Blue

    rgb(195, 155, 211),        // Purple
    rgb(155, 89, 182),         // Purple
    rgb(118, 68, 138)        // Purple
];

function rgb(r, g, b) {
    return [r/255, g/255, b/255];
}
