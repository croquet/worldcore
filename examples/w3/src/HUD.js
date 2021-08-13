import { ImageWidget, ToggleSet, ToggleWidget, Widget, SliderWidget, ButtonWidget, TextWidget, EmptyWidget, BoxWidget } from "@croquet/worldcore";
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

// Manages all the UI controls.

export class HUD extends Widget {
    constructor(...args) {
        super(...args);

        const toggleSet = new ToggleSet();

        const digToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: digOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: digOffIcon}),
            local: [20,20],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "dig"),
            state: true
        });

        const fillToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: fillOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: fillOffIcon}),
            local: [80,20],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "fill")
        });

        const treeToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: treeOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: treeOffIcon}),
            local: [20,80],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "tree")
        });

        const spawnToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: spawnOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: spawnOffIcon}),
            local: [80,80],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "spawn")
        });

        const waterToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: waterOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: waterOffIcon}),
            local: [20,140],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "water")
        });

        const animals = this.modelService("Animals");
        const counterBackground = new EmptyWidget({parent: this, local: [140,80], size: [100,50]} );
        this.spawnCounter = new TextWidget({
            parent: counterBackground,
            autoSize: [1,1],
            point: 20, color: [1,1,1],
            alignX: 'left',
            alignY: 'middle',
            text: animals.animals.size.toString()
        })

        const walkToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: walkOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: walkOffIcon}),
            anchor: [1,0],
            pivot: [1,0],
            local: [-70,20],
            size:[40,40],
            onToggleOn: () => this.publish("hud", "firstPerson", true),
            onToggleOff: () => this.publish("hud", "firstPerson", false)
        });

        const resetButton = new ButtonWidget({
            parent: this,
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size: [40,40],
            label: new ImageWidget({border: [5,5,5,5], url: resetIcon}),
            onClick: () => this.publish("hud", "reset")
        })

        const cutawaySlider = new SliderWidget({
            parent: this,
            pivot: [1,1],
            anchor: [1,1],
            local: [-20,-20],
            size: [20,200],
            step: Voxels.sizeZ-2,
            percent: 1 - (GetTopLayer()-2) / (Voxels.sizeZ-3),
            onChange: p => {
                const topLayer = 2 + Math.round((1-p) * (Voxels.sizeZ-3));
                SetTopLayer(topLayer);
                this.publish("hud", "topLayer", topLayer);
            }
        });

        this.subscribe("animals", { event: "countChanged", handling: "oncePerFrame" }, this.onCountChanged)
    }

    onCountChanged(n) {
        this.spawnCounter.set({text: n.toString()})
    }

}


