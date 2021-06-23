import { ImageWidget, ToggleSet, ToggleWidget, Widget, SliderWidget, ButtonWidget, TextWidget, EmptyWidget } from "@croquet/worldcore";
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
import waterOnIcon from "../assets/waterOnIcon.png";
import waterOffIcon from "../assets/waterOffIcon.png";
import sourceOnIcon from "../assets/sourceOnIcon.png";
import sourceOffIcon from "../assets/sourceOffIcon.png";
// import sinkOnIcon from "../assets/sinkOnIcon.png";
// import sinkOffIcon from "../assets/sinkOffIcon.png";
import roadOnIcon from "../assets/roadOnIcon.png";
import roadOffIcon from "../assets/roadOffIcon.png";

import walkOnIcon from "../assets/walkOnIcon.png";
import walkOffIcon from "../assets/walkOffIcon.png";
import resetIcon from "../assets/resetIcon.png";



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

        const treeToggle = new ToggleWidget(this, {local: [20,80], size:[50,50]})
        this.setToggleDefaults(treeToggle);
        treeToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: treeOnIcon}));
        treeToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: treeOffIcon}));
        treeToggle.onToggleOn = () => this.publish("hud", "editMode", "tree");

        const spawnToggle = new ToggleWidget(this, {local: [80,80], size:[50,50]})
        this.setToggleDefaults(spawnToggle);
        spawnToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: spawnOnIcon}));
        spawnToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: spawnOffIcon}));
        spawnToggle.onToggleOn = () => this.publish("hud", "editMode", "spawn");

        const animals = this.wellKnownModel("Animals");
        const counterBackground = new EmptyWidget(this, {local: [140,80], size: [100,50]} );
        this.spawnCounter = new TextWidget(counterBackground, {autoSize: [1,1], point: 20, color: [1,1,1], alignX: 'left', alignY: 'middle', text: animals.animals.size.toString()})

        const waterToggle = new ToggleWidget(this, {local: [20,140], size:[50,50]})
        this.setToggleDefaults(waterToggle);
        waterToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: waterOnIcon}));
        waterToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: waterOffIcon}));
        waterToggle.onToggleOn = () => this.publish("hud", "editMode", "water");

        const roadToggle = new ToggleWidget(this, {local: [80,140], size:[50,50]})
        this.setToggleDefaults(roadToggle);
        roadToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: roadOnIcon}));
        roadToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: roadOffIcon}));
        roadToggle.onToggleOn = () => this.publish("hud", "editMode", "road");

        // const sourceToggle = new ToggleWidget(this, {local: [80,140], size:[50,50]})
        // this.setToggleDefaults(sourceToggle);
        // sourceToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: sourceOnIcon}));
        // sourceToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: sourceOffIcon}));
        // sourceToggle.onToggleOn = () => this.publish("hud", "editMode", "source");

        // const sinkToggle = new ToggleWidget(this, {local: [140,140], size:[50,50]})
        // this.setToggleDefaults(sinkToggle);
        // sinkToggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: sinkOnIcon}));
        // sinkToggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: sinkOffIcon}));
        // sinkToggle.onToggleOn = () => this.publish("hud", "editMode", "sink");

        const toggleSet = new ToggleSet(digToggle, fillToggle, spawnToggle, treeToggle, waterToggle, roadToggle);

        const walktoggle= new ToggleWidget(this, {anchor: [1,0], pivot: [1,0], local: [-70,20], size: [40,40]})
        this.setToggleDefaults(walktoggle);
        walktoggle.setLabelOn(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: walkOnIcon}));
        walktoggle.setLabelOff(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: walkOffIcon}));
        walktoggle.onToggleOn = () => this.publish("hud", "firstPerson", true);
        walktoggle.onToggleOff = () => this.publish("hud", "firstPerson", false);

        const resetButton = new ButtonWidget(this, {anchor: [1,0], pivot: [1,0], local: [-20,20], size: [40,40]})
        resetButton.setLabel(new ImageWidget(null, {autoSize: [1,1], border: [5,5,5,5], url: resetIcon}));
        resetButton.onClick = () => this.publish("hud", "reset");

        const cutawaySlider = new SliderWidget(this, {
            pivot: [1,1],
            anchor: [1,1],
            local: [-20,-20],
            size: [20,200],
            step: Voxels.sizeZ-2,
            percent: 1 - (GetTopLayer()-2) / (Voxels.sizeZ-3)
        });
        cutawaySlider.onChange = p => {
            const topLayer = 2 + Math.round((1-p) * (Voxels.sizeZ-3));
            SetTopLayer(topLayer);
            this.publish("hud", "topLayer", topLayer);
        };

        this.subscribe("animals", { event: "countChanged", handling: "oncePerFrame" }, this.onCountChanged)
    }

    onCountChanged(n) {
        this.spawnCounter.set({text: n.toString()})
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


