// import { m4_translation, v3_multiply, ViewService } from "@croquet/worldcore-kernel";
import { ImageWidget, ToggleSet, ToggleWidget, Widget, SliderWidget, ButtonWidget, TextWidget, EmptyWidget, BoxWidget, ControlWidget, PanelWidget, HorizontalWidget } from "@croquet/worldcore-widget"

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
// import sinkOnIcon from "../assets/sinkOnIcon.png";
// import sinkOffIcon from "../assets/sinkOffIcon.png";
import roadOnIcon from "../assets/roadOnIcon.png";
import roadOffIcon from "../assets/roadOffIcon.png";
import clearOnIcon from "../assets/clearOnIcon.png";
import clearOffIcon from "../assets/clearOffIcon.png";
import buildOnIcon from "../assets/buildOnIcon.png";
import buildOffIcon from "../assets/buildOffIcon.png";

import walkOnIcon from "../assets/walkOnIcon.png";
import walkOffIcon from "../assets/walkOffIcon.png";
import helpOnIcon from "../assets/helpOnIcon.png";
import helpOffIcon from "../assets/helpOffIcon.png";
import resetIcon from "../assets/resetIcon.png";

import kwark from "../assets/kwark.otf";

// Manages all the UI controls.

export class HUD extends Widget {
    constructor(...args) {
        super(...args);

        const toggleSet = new ToggleSet();

        this.digToggle = new ToggleWidget({
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

        this.fillToggle = new ToggleWidget({
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

        this.treeToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: treeOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: treeOffIcon}),
            local: [20,140],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "tree")
        });

        this.spawnToggle = new ToggleWidget({
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

        this.waterToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: waterOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: waterOffIcon}),
            local: [20,80],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "water")
        });

        this.roadToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: roadOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: roadOffIcon}),
            local: [80,140],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "road")
        });

        // this.buildToggle = new ToggleWidget({
        //     parent: this,
        //     normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
        //     normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
        //     hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
        //     hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
        //     pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
        //     pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
        //     labelOn: new ImageWidget({border: [5,5,5,5], url: buildOnIcon}),
        //     labelOff: new ImageWidget({border: [5,5,5,5], url: buildOffIcon}),
        //     local: [20,200],
        //     size:[50,50],
        //     toggleSet: toggleSet,
        //     onToggleOn: () => this.publish("hud", "editMode", "build")
        // });

        this.clearToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: clearOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: clearOffIcon}),
            local: [20,200],
            size:[50,50],
            toggleSet: toggleSet,
            onToggleOn: () => this.publish("hud", "editMode", "clear")
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

        const helpToggle = new ToggleWidget({
            parent: this,
            normalOn: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            normalOff: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOn: new BoxWidget({color: [0.5, 0.5, 0.5]}),
            hiliteOff: new BoxWidget({color: [0.6, 0.6, 0.6]}),
            pressedOn: new BoxWidget({color: [0.3, 0.3, 0.3]}),
            pressedOff: new BoxWidget({color: [0.4, 0.4, 0.4]}),
            labelOn: new ImageWidget({border: [5,5,5,5], url: helpOnIcon}),
            labelOff: new ImageWidget({border: [5,5,5,5], url: helpOffIcon}),
            anchor: [1,0],
            pivot: [1,0],
            local: [-20,20],
            size:[40,40],
            onToggleOn: () => this.helpOn(),
            onToggleOff: () => this.helpOff()
        });

        this.walkToggle = new ToggleWidget({
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
            visible: animals.animals.size>0,
            onToggleOn: () => this.publish("hud", "firstPerson", true),
            onToggleOff: () => this.publish("hud", "firstPerson", false)
        });

        this.helpPanel = new HelpPanel({
            parent: this,
            pivot: [1,0],
            anchor: [1,0],
            local: [-60,20],
            visible: false
        })

        const resetButton = new ButtonWidget({
            parent: this,
            visible: false,
            anchor: [1,0],
            pivot: [1,0],
            local: [-70,20],
            size: [40,40],
            label: new ImageWidget({border: [5,5,5,5], url: resetIcon}),
            onClick: () => this.publish("hud", "reset")
        })

        this.cutawaySlider = new SliderWidget({
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

    helpOn() {
        this.helpPanel.show();
        this.cutawaySlider.hide()
        this.digToggle.hide();
        this.fillToggle.hide();
        this.treeToggle.hide();
        this.spawnToggle.hide();
        this.waterToggle.hide();
        this.walkToggle.hide();
        this.roadToggle.hide();
        this.clearToggle.hide();
        this.spawnCounter.hide();
        this.spawnCounter.hide();
    }

    helpOff() {
        const animals = this.modelService("Animals");
        this.helpPanel.hide();
        this.cutawaySlider.show()
        this.digToggle.show();
        this.fillToggle.show();
        this.treeToggle.show();
        this.waterToggle.show();
        this.spawnToggle.show();
        this.roadToggle.show();
        this.clearToggle.show();
        this.spawnCounter.show();
        this.walkToggle.set({visible: animals.animals.size>0});
        this.spawnCounter.show();
    }


    onCountChanged(n) {
        this.spawnCounter.set({text: n.toString()})
        this.walkToggle.set({visible: n>0});
    }

}

class HelpPanel extends PanelWidget {
    constructor(options) {
        super(options);
        this.set({
            size: [240,280]
        })

        const frame = new BoxWidget({
            parent: this,
            color: [0.2, 0.2, 0.2],
            autoSize: [1,1]
        })

        const panel = new BoxWidget({
            parent: frame,
            color: [0.8, 0.8, 0.8],
            border: [2,2,2,2],
            autoSize: [1,1]
        })

        const title = new TextWidget({
            parent: panel,
            pivot: [0.5,0],
            anchor: [0.5,0],
            local: [0,0],
            size: [150,50],
            point: 24,
            fontURL: kwark,
            text: "Wide Wide World"
        });

        const horizontal = new HorizontalWidget({
            parent: panel,
            autoSize: [1,1],
            border: [10,50,10,10]
        })

        const background = new BoxWidget({
            parent: horizontal,
            color: [1,1,1],
            local: [10,80],
        });

        const clip = new Widget({
            parent: background,
            autoSize: [1,1],
            border: [5,5,5,5],
            clip: true
        });

        const text = new TextWidget({
            parent: clip,
            color: [0,0,0],
            autoSize: [1,1],
            point: 14,
            alignX: "left",
            alignY: "top",
            text:
`Wide Wide World is a multiplayer village-building simulation written in Croquet using the Worldcore engine.

If you want other people to join your world, share the unique URL, or scan the QR code in the lower left.

Select a tool in the upper left, then click on the terrain to dig, fill, plant trees, or add people or water.

Everything you do is instantly shared with the other players. The game stays perfectly in synch, even with hundreds of AIs and a real-time water simulation.

And the world is persistent. If you leave and come back later to the same URL, everything will be as you left it.

Use the slider on the right to view an underground cutaway of the terrain. The simulation is a fully 3D voxel world!

You can also toggle first-person mode by clicking the walk icon at the upper right. This will switch the camera to follow a random AI.

The AIs wander randomly now, but in the future you'll be able to order them to cut down trees, plant crops, mine stone, build buildings, and fight off wild animals.

Press F for Full Screen`})

        const slider = new SliderWidget({
            parent: horizontal,
            width: 20,
            size: [20, 20],
            onChange: p => {
                const textHeight = text.textHeight;
                const offset = p*(textHeight - clip.size[1]);
                text.set({local:[0,-offset]});
            }
        })

        horizontal.addSlot(background);
        horizontal.addSlot(slider);
    }
}


