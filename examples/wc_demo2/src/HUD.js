import { Widget, ButtonWidget, ImageWidget} from "@croquet/worldcore";

import upArrow from "../assets/upArrow.png";
import downArrow from "../assets/downArrow.png";
import leftArrow from "../assets/leftArrow.png";
import rightArrow from "../assets/rightArrow.png";

//------------------------------------------------------------------------------------------
//-- GameScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GameScreen extends Widget {
    constructor(...args) {
        super(...args);
        this.navPanel = new NavPanel(this, {size: [200,140], anchor:[1,1], pivot:[1,1]});
    }

}

//------------------------------------------------------------------------------------------
//-- NavPanel ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class NavPanel extends Widget {
    constructor(...args) {
        super(...args);

        this.fButton = new ButtonWidget(this, {size:[50,50], local:[60,0]});
        this.bButton = new ButtonWidget(this, {size:[50,50], local:[60,60]});
        this.lButton = new ButtonWidget(this, {size:[50,50], local:[0,60]});
        this.rButton = new ButtonWidget(this, {size:[50,50], local:[120,60]});

        this.fButton.setLabel(new ImageWidget(this.fButton, {autoSize:[1,1], url: upArrow}));
        this.bButton.setLabel(new ImageWidget(this.bButton, {autoSize:[1,1], url: downArrow}));
        this.lButton.setLabel(new ImageWidget(this.lButton, {autoSize:[1,1], url: leftArrow}));
        this.rButton.setLabel(new ImageWidget(this.rButton, {autoSize:[1,1], url: rightArrow}));

        this.fButton.onPress = () => {this.publish("hud", "fore", 1);};
        this.fButton.onRelease = () => {this.publish("hud", "fore", 0);};
        this.bButton.onPress = () => {this.publish("hud", "back", 1);};
        this.bButton.onRelease = () => {this.publish("hud", "back", 0);};
        this.lButton.onPress = () => {this.publish("hud", "left", 1);};
        this.lButton.onRelease = () => {this.publish("hud", "left", 0);};
        this.rButton.onPress = () => {this.publish("hud", "right", 1);};
        this.rButton.onRelease = () => {this.publish("hud", "right", 0);};
    }


}