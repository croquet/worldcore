import { SliderWidget, GetNamedView, ToggleWidget, ToggleSet, ImageWidget, ButtonWidget, TextWidget, BoxWidget, GetNamedModel, Widget } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { Colors } from "./Colors";
import stripeIcon from "../assets/horizontalStripe50.png";

let editMode = 'cube';
let editColor = 1;

export class HUD extends Widget {
    constructor(...args) {
        super(...args);
        this.set({autosize: [1,1]});
        this.buildGameScreen();

        // this.buildJoinScreen();
        // this.buildGameScreen();
        // this.enterGameScreen();

        // this.subscribe("input", "pointerLockStart", this.enterGameScreen);
        // this.subscribe("input", "pointerLockEnd", this.enterJoinScreen);
    }

    destroy() {
        super.destroy();
        // this.joinScreen.destroy();
        // this.gameScreen.destroy();
    }

    // enterJoinScreen() {
    //     this.removeChild(this.gameScreen);
    //     this.addChild(this.joinScreen);
    // }

    // enterGameScreen() {
    //     // this.removeChild(this.joinScreen);
    //     this.addChild(this.gameScreen);
    // }

    // buildJoinScreen() {
    //     this.joinScreen = new Widget();
    //     this.joinScreen.autoSize = [1,1];

    //     const startButton = new ButtonWidget(this.joinScreen);
    //     startButton.setOpacity(0.5);
    //     startButton.setAutoSize([1,1]);
    //     startButton.label.setText(`Tap or click to begin!`);
    //     startButton.label.setPoint(24);
    //     startButton.onClick = () => this.enterGameScreen();
    // }

    buildGameScreen() {

        // this.gameScreen = new Widget(this, {autosize: [1,1]});
        // this.gameScreen.autoSize = [1,1];

        // const viewRoot = GetNamedView('ViewRoot');

        // const cubeToggle = new ToggleWidget(this);
        // this.setBuildDefaults(cubeToggle);
        // cubeToggle.setLocal([10,10]);
        // cubeToggle.setSize([45,45]);
        // cubeToggle.labelOn.loadFromURL(cubeOnIcon);
        // cubeToggle.labelOff.loadFromURL(cubeOffIcon);
        // cubeToggle.onToggleOn = () => this.setEditMode('cube');

        // const deleteToggle = new ToggleWidget(this.gameScreen);
        // this.setBuildDefaults(deleteToggle);
        // deleteToggle.setLocal([60,10]);
        // deleteToggle.setSize([45,45]);
        // deleteToggle.labelOn.loadFromURL(deleteOnIcon);
        // deleteToggle.labelOff.loadFromURL(deleteOffIcon);
        // deleteToggle.onToggleOn = () => this.setEditMode('delete');

        // const buildSet = new ToggleSet();
        // buildSet.add(cubeToggle);
        // buildSet.add(deleteToggle);
        // this.setEditMode(editMode);
        // switch (editMode) {
        //     case 'cube': buildSet.pick(cubeToggle); break;
        //     case 'delete': buildSet.pick(deleteToggle); break;
        //     default:
        // }

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



        // const orangeToggle0 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(orangeToggle0, 7);
        // orangeToggle0.setLocal([10,80]);
        // orangeToggle0.setSize([30,30]);

        // const orangeToggle1 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(orangeToggle1, 8);
        // orangeToggle1.setLocal([45,80]);
        // orangeToggle1.setSize([30,30]);

        // const orangeToggle2 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(orangeToggle2, 9);
        // orangeToggle2.setLocal([80,80]);
        // orangeToggle2.setSize([30,30]);

        // const yellowToggle0 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(yellowToggle0, 10);
        // yellowToggle0.setLocal([10,115]);
        // yellowToggle0.setSize([30,30]);

        // const yellowToggle1 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(yellowToggle1, 11);
        // yellowToggle1.setLocal([45,115]);
        // yellowToggle1.setSize([30,30]);

        // const yellowToggle2 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(yellowToggle2, 12);
        // yellowToggle2.setLocal([80,115]);
        // yellowToggle2.setSize([30,30]);

        // const greenToggle0 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(greenToggle0, 13);
        // greenToggle0.setLocal([10,150]);
        // greenToggle0.setSize([30,30]);

        // const greenToggle1 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(greenToggle1, 14);
        // greenToggle1.setLocal([45,150]);
        // greenToggle1.setSize([30,30]);

        // const greenToggle2 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(greenToggle2, 15);
        // greenToggle2.setLocal([80,150]);
        // greenToggle2.setSize([30,30]);

        // const blueToggle0 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(blueToggle0, 16);
        // blueToggle0.setLocal([10,185]);
        // blueToggle0.setSize([30,30]);

        // const blueToggle1 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(blueToggle1, 17);
        // blueToggle1.setLocal([45,185]);
        // blueToggle1.setSize([30,30]);

        // const blueToggle2 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(blueToggle2, 18);
        // blueToggle2.setLocal([80,185]);
        // blueToggle2.setSize([30,30]);

        // const purpleToggle0 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(purpleToggle0, 19);
        // purpleToggle0.setLocal([10,220]);
        // purpleToggle0.setSize([30,30]);

        // const purpleToggle1 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(purpleToggle1, 20);
        // purpleToggle1.setLocal([45,220]);
        // purpleToggle1.setSize([30,30]);

        // const purpleToggle2 = new ToggleWidget(this.gameScreen);
        // this.setColorDefaults(purpleToggle2, 21);
        // purpleToggle2.setLocal([80,220]);
        // purpleToggle2.setSize([30,30]);

        // const eraseToggle = new ToggleWidget(this.gameScreen);
        // eraseToggle.setLocal([10,255]);
        // eraseToggle.setSize([100,30]);
        // eraseToggle.normalOn.setColor([0.9, 0.9, 0.9]);
        // eraseToggle.normalOff.setColor([0.1, 0.1, 0.1]);
        // eraseToggle.hoveredOn.setColor([0.8, 0.8, 0.8]);
        // eraseToggle.hoveredOff.setColor([0.3, 0.3, 0.3]);
        // eraseToggle.pressedOn.setColor([0.5, 0.5, 0.5]);
        // eraseToggle.pressedOff.setColor([0.5, 0.5, 0.5]);
        // eraseToggle.setLabelOn(new ImageWidget());
        // eraseToggle.labelOn.setBorder([5,5,5,5]);
        // eraseToggle.labelOn.loadFromURL(stripeIcon);
        // eraseToggle.setLabelOff(new ImageWidget());
        // eraseToggle.labelOff.setBorder([5,5,5,5]);
        // eraseToggle.labelOff.loadFromURL(stripeIcon);
        // eraseToggle.onToggleOn = () => this.setEditMode("delete");

        const colorSet = new ToggleSet();
        // colorSet.add(eraseToggle);
        colorSet.add(whiteToggle);
        colorSet.add(grayToggle);
        colorSet.add(blackToggle);
        colorSet.add(redToggle0);
        colorSet.add(redToggle1);
        colorSet.add(redToggle2);
        // colorSet.add(orangeToggle0);
        // colorSet.add(orangeToggle1);
        // colorSet.add(orangeToggle2);
        // colorSet.add(yellowToggle0);
        // colorSet.add(yellowToggle1);
        // colorSet.add(yellowToggle2);
        // colorSet.add(greenToggle0);
        // colorSet.add(greenToggle1);
        // colorSet.add(greenToggle2);
        // colorSet.add(blueToggle0);
        // colorSet.add(blueToggle1);
        // colorSet.add(blueToggle2);
        // colorSet.add(purpleToggle0);
        // colorSet.add(purpleToggle1);
        // colorSet.add(purpleToggle2);
        // this.setEditColor(editColor);
        // switch (editColor) {
        //     case 0: colorSet.pick(eraseToggle); break;
        //     case 1: colorSet.pick(whiteToggle); break;
        //     case 2: colorSet.pick(grayToggle); break;
        //     case 3: colorSet.pick(blackToggle); break;
        //     case 4: colorSet.pick(redToggle0); break;
        //     case 5: colorSet.pick(redToggle1); break;
        //     case 6: colorSet.pick(redToggle2); break;
        //     case 7: colorSet.pick(orangeToggle0); break;
        //     case 8: colorSet.pick(orangeToggle1); break;
        //     case 9: colorSet.pick(orangeToggle2); break;
        //     case 10: colorSet.pick(yellowToggle0); break;
        //     case 11: colorSet.pick(yellowToggle1); break;
        //     case 12: colorSet.pick(yellowToggle2); break;
        //     case 13: colorSet.pick(greenToggle0); break;
        //     case 14: colorSet.pick(greenToggle1); break;
        //     case 15: colorSet.pick(greenToggle2); break;
        //     case 16: colorSet.pick(blueToggle0); break;
        //     case 17: colorSet.pick(blueToggle1); break;
        //     case 18: colorSet.pick(blueToggle2); break;
        //     case 19: colorSet.pick(purpleToggle0); break;
        //     case 20: colorSet.pick(purpleToggle1); break;
        //     case 21: colorSet.pick(purpleToggle2); break;
        //     default:
        // }

        // const exitButton = new ButtonWidget(this.gameScreen);
        // exitButton.setLabel(new ImageWidget());
        // exitButton.setLocal([-10, 10]);
        // exitButton.setPivot([1,0]);
        // exitButton.setAnchor([1,0]);
        // exitButton.setSize([45, 45]);
        // exitButton.label.setBorder([2,2,2,2]);
        // exitButton.label.loadFromURL(exitIcon);
        // exitButton.onClick = () => viewRoot.input.exitPointerLock();

        // const cutawaySlider = new SliderWidget(this.gameScreen);
        // cutawaySlider.setLocal([-10, -10]);
        // cutawaySlider.setPivot([1,1]);
        // cutawaySlider.setAnchor([1,1]);
        // cutawaySlider.setSize([20, 250]);
        // cutawaySlider.setSteps(Voxels.sizeZ);
        // cutawaySlider.setPercent(1 - (viewRoot.topLayer-1) / (Voxels.sizeZ-1) );
        // cutawaySlider.onChange = p => viewRoot.setTopLayer(Math.round(1 + (1-p) * (Voxels.sizeZ-1)));
    }

    setBuildDefaults(toggle) {
        toggle.normalOn.setColor([0.4, 0.4, 0.4]);
        toggle.normalOff.setColor([0.5, 0.5, 0.5]);
        toggle.hiliteOn.setColor([0.5, 0.5, 0.5]);
        toggle.hoveredOff.setColor([0.6, 0.6, 0.6]);
        toggle.pressedOn.setColor([0.3, 0.3, 0.3]);
        toggle.pressedOff.setColor([0.4, 0.4, 0.4]);
        toggle.setLabelOn(new ImageWidget());
        toggle.labelOn.setBorder([5,5,5,5]);
        toggle.setLabelOff(new ImageWidget());
        toggle.labelOff.setBorder([5,5,5,5]);
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
            this.setEditMode("fill");
            this.setEditColor(color);
        };

    }

    get editMode() {
        return editMode;
    }

    setEditMode(m) {
        editMode = m;
        this.publish("hud", "editMode", m);
    }

    setEditColor(c) {
        editColor = c;
        this.publish("hud", "editColor", c);
    }


}


