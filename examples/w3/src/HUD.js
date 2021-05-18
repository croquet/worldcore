import { ImageWidget, ToggleSet, ToggleWidget, Widget, SliderWidget } from "@croquet/worldcore";
import { Voxels } from "./Voxels";
import { GetTopLayer, SetTopLayer } from "./Globals";

import digOnIcon from "../assets/digOnIcon.png";
import digOffIcon from "../assets/digOffIcon.png";
import fillOnIcon from "../assets/fillOnIcon.png";
import fillOffIcon from "../assets/fillOffIcon.png";
import spawnOnIcon from "../assets/spawnOnIcon.png";
import spawnOffIcon from "../assets/spawnOffIcon.png";
import treeOnIcon from "../assets/treeOnIcon.png";
import treeOffIcon from "../assets/treeOffIcon.png";


export class HUD extends Widget {
    constructor(...args) {
        super(...args);

        const digToggle = new ToggleWidget(this, {local: [20,20], size:[50,50], state: true})
        this.setToggleDefaults(digToggle);
        digToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: digOnIcon}));
        digToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: digOffIcon}));
        digToggle.onToggleOn = () => this.publish("hud", "editMode", "dig");

        const fillToggle = new ToggleWidget(this, {local: [80,20], size:[50,50]})
        this.setToggleDefaults(fillToggle);
        fillToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: fillOnIcon}));
        fillToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: fillOffIcon}));
        fillToggle.onToggleOn = () => this.publish("hud", "editMode", "fill");

        const spawnToggle = new ToggleWidget(this, {local: [20,80], size:[50,50]})
        this.setToggleDefaults(spawnToggle);
        spawnToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: spawnOnIcon}));
        spawnToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: spawnOffIcon}));
        spawnToggle.onToggleOn = () => this.publish("hud", "editMode", "spawn");

        const treeToggle = new ToggleWidget(this, {local: [80,80], size:[50,50]})
        this.setToggleDefaults(treeToggle);
        treeToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: treeOnIcon}));
        treeToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: treeOffIcon}));
        treeToggle.onToggleOn = () => this.publish("hud", "editMode", "tree");

        const toggleSet = new ToggleSet(digToggle, fillToggle, spawnToggle, treeToggle);

        const cutawaySlider = new SliderWidget(this, {
            pivot: [1,0.5],
            anchor: [1,0.5],
            local: [-20,0],
            size: [20,150],
            step: Voxels.sizeZ-2,
            percent: 1 - (GetTopLayer()-2) / (Voxels.sizeZ-3)
        });
        cutawaySlider.onChange = p => {
            const topLayer = 2 + Math.round((1-p) * (Voxels.sizeZ-3));
            SetTopLayer(topLayer);
            this.publish("hud", "topLayer", topLayer);
        };
    }

    setToggleDefaults(toggle) {
        toggle.normalOn.set({color: [0.4, 0.4, 0.4]});
        toggle.normalOff.set({color:[0.5, 0.5, 0.5]});
        toggle.hiliteOn.set({color:[0.5, 0.5, 0.5]});
        toggle.hiliteOff.set({color:[0.6, 0.6, 0.6]});
        toggle.pressedOn.set({color:[0.3, 0.3, 0.3]});
        toggle.pressedOff.set({color:[0.4, 0.4, 0.4]});
    }
}


