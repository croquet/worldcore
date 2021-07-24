import { SliderWidget, ToggleWidget, ToggleSet, ImageWidget, ButtonWidget, TextWidget, BoxWidget, GetNamedModel, Widget } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { Colors } from "./Colors";
import stripeIcon from "../assets/horizontalStripe50.png";
import { GetTopLayer, SetTopLayer } from "../index";

let editColor = 1;

export class HUD extends Widget {
    constructor(...args) {
        super(...args);
        this.set({autoSize: [1,1]});
        this.buildGameScreen();
    }

    buildGameScreen() {

        // const viewRoot = GetNamedView('ViewRoot');

        const whiteToggle = new ToggleWidget(this, {local: [10,10], size:[30,30]});
        this.setColorDefaults(whiteToggle, 1);

        const grayToggle = new ToggleWidget(this, {local: [45,10], size:[30,30]});
        this.setColorDefaults(grayToggle, 2);

        const blackToggle = new ToggleWidget(this, {local: [80,10], size:[30,30]});
        this.setColorDefaults(blackToggle, 3);

        const redToggle0 = new ToggleWidget(this, {local: [10,45], size:[30,30]});
        this.setColorDefaults(redToggle0, 4);

        const redToggle1 = new ToggleWidget(this, {local: [45,45], size:[30,30]});
        this.setColorDefaults(redToggle1, 5);

        const redToggle2 = new ToggleWidget(this, {local: [80,45], size:[30,30]});
        this.setColorDefaults(redToggle2, 6);

        const orangeToggle0 = new ToggleWidget(this, {local: [10,80], size:[30,30]});
        this.setColorDefaults(orangeToggle0, 7);

        const orangeToggle1 = new ToggleWidget(this, {local: [45,80], size:[30,30]});
        this.setColorDefaults(orangeToggle1, 8);

        const orangeToggle2 = new ToggleWidget(this, {local: [80,80], size:[30,30]});
        this.setColorDefaults(orangeToggle2, 9);

        const yellowToggle0 = new ToggleWidget(this, {local: [10,115], size:[30,30]});
        this.setColorDefaults(yellowToggle0, 10);

        const yellowToggle1 = new ToggleWidget(this, {local: [45,115], size:[30,30]});
        this.setColorDefaults(yellowToggle1, 11);

        const yellowToggle2 = new ToggleWidget(this, {local: [80,115], size:[30,30]});
        this.setColorDefaults(yellowToggle2, 12);

        const greenToggle0 = new ToggleWidget(this, {local: [10,150], size:[30,30]});
        this.setColorDefaults(greenToggle0, 13);

        const greenToggle1 = new ToggleWidget(this, {local: [45,150], size:[30,30]});
        this.setColorDefaults(greenToggle1, 14);

        const greenToggle2 = new ToggleWidget(this, {local: [80,150], size:[30,30]});
        this.setColorDefaults(greenToggle2, 15);

        const blueToggle0 = new ToggleWidget(this, {local: [10,185], size:[30,30]});
        this.setColorDefaults(blueToggle0, 16);

        const blueToggle1 = new ToggleWidget(this, {local: [45,185], size:[30,30]});
        this.setColorDefaults(blueToggle1, 17);

        const blueToggle2 = new ToggleWidget(this, {local: [80,185], size:[30,30]});
        this.setColorDefaults(blueToggle2, 18);

        const purpleToggle0 = new ToggleWidget(this, {local: [10,220], size:[30,30]});
        this.setColorDefaults(purpleToggle0, 19);

        const purpleToggle1 = new ToggleWidget(this, {local: [45,220], size:[30,30]});
        this.setColorDefaults(purpleToggle1, 20);

        const purpleToggle2 = new ToggleWidget(this, {local: [80,220], size:[30,30]});
        this.setColorDefaults(purpleToggle2, 21);


        const deleteToggle = new ToggleWidget(this, {local: [10,255], size:[100,30]});
        deleteToggle.normalOn.set({ color: [0.9, 0.9, 0.9] });
        deleteToggle.normalOff.set({ color: [0.1, 0.1, 0.1]});
        deleteToggle.hiliteOn.set({ color: [0.8, 0.8, 0.8]});
        deleteToggle.hiliteOff.set({ color: [0.3, 0.3, 0.3]});
        deleteToggle.pressedOn.set({ color: [0.5, 0.5, 0.5]});
        deleteToggle.pressedOff.set({ color: [0.5, 0.5, 0.5]});

        deleteToggle.setLabelOn(new ImageWidget(deleteToggle, {autoSize: [1,1], border: [5,5,5,5], url: stripeIcon }));
        deleteToggle.setLabelOff(new ImageWidget(deleteToggle, {autoSize: [1,1], border: [5,5,5,5], url: stripeIcon }));

        deleteToggle.onToggleOn = () =>  this.setEditColor(0);

        const colorSet = new ToggleSet();
        colorSet.add(deleteToggle);
        colorSet.add(whiteToggle);
        colorSet.add(grayToggle);
        colorSet.add(blackToggle);
        colorSet.add(redToggle0);
        colorSet.add(redToggle1);
        colorSet.add(redToggle2);
        colorSet.add(orangeToggle0);
        colorSet.add(orangeToggle1);
        colorSet.add(orangeToggle2);
        colorSet.add(yellowToggle0);
        colorSet.add(yellowToggle1);
        colorSet.add(yellowToggle2);
        colorSet.add(greenToggle0);
        colorSet.add(greenToggle1);
        colorSet.add(greenToggle2);
        colorSet.add(blueToggle0);
        colorSet.add(blueToggle1);
        colorSet.add(blueToggle2);
        colorSet.add(purpleToggle0);
        colorSet.add(purpleToggle1);
        colorSet.add(purpleToggle2);
        this.setEditColor(editColor);
        switch (editColor) {
            case 0: colorSet.pick(deleteToggle); break;
            case 1: colorSet.pick(whiteToggle); break;
            case 2: colorSet.pick(grayToggle); break;
            case 3: colorSet.pick(blackToggle); break;
            case 4: colorSet.pick(redToggle0); break;
            case 5: colorSet.pick(redToggle1); break;
            case 6: colorSet.pick(redToggle2); break;
            case 7: colorSet.pick(orangeToggle0); break;
            case 8: colorSet.pick(orangeToggle1); break;
            case 9: colorSet.pick(orangeToggle2); break;
            case 10: colorSet.pick(yellowToggle0); break;
            case 11: colorSet.pick(yellowToggle1); break;
            case 12: colorSet.pick(yellowToggle2); break;
            case 13: colorSet.pick(greenToggle0); break;
            case 14: colorSet.pick(greenToggle1); break;
            case 15: colorSet.pick(greenToggle2); break;
            case 16: colorSet.pick(blueToggle0); break;
            case 17: colorSet.pick(blueToggle1); break;
            case 18: colorSet.pick(blueToggle2); break;
            case 19: colorSet.pick(purpleToggle0); break;
            case 20: colorSet.pick(purpleToggle1); break;
            case 21: colorSet.pick(purpleToggle2); break;
            default:
        }

        const cutawaySlider = new SliderWidget(this, {
            pivot: [1,0.5],
            anchor: [1,0.5],
            local: [-10,0],
            size: [20,250],
            step: Voxels.sizeZ,
            percent: 1 - (GetTopLayer-1) / (Voxels.sizeZ-1)
        });
        cutawaySlider.onChange = p => SetTopLayer(Math.round(1 + (1-p) * (Voxels.sizeZ-1)));
    }

    setColorDefaults(toggle, color) {
        toggle.normalOn.set({ color: [0.9, 0.9, 0.9] });
        toggle.normalOff.set({ color: [0.1, 0.1, 0.1]});
        toggle.hiliteOn.set({ color: [0.8, 0.8, 0.8]});
        toggle.hiliteOff.set({ color: [0.3, 0.3, 0.3]});
        toggle.pressedOn.set({ color: [0.5, 0.5, 0.5]});
        toggle.pressedOff.set({ color: [0.5, 0.5, 0.5]});

        toggle.setLabelOn(new BoxWidget(toggle, {autoSize: [1,1], border: [5,5,5,5], color: Colors[color] }));
        toggle.setLabelOff(new BoxWidget(toggle, {autoSize: [1,1], border: [5,5,5,5], color: Colors[color] }));

        toggle.onToggleOn = () => {
            this.setEditColor(color);
        };

    }

    setEditColor(c) {
        editColor = c;
        this.publish("hud", "editColor", c);
    }


}


