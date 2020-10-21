import { Widget, ButtonWidget, ImageWidget} from "@croquet/worldcore";

import upArrow from "../assets/upArrow.png";
import downArrow from "../assets/downArrow.png";
import turnLeftArrow from "../assets/arrowLeft.png";
import turnRightArrow from "../assets/arrowRight.png";
import moveLeftArrow from "../assets/leftArrow.png";
import moveRightArrow from "../assets/rightArrow.png";
import shootImage from "../assets/shoot.png";
import { MyPlayerPawn } from "./Player";

//------------------------------------------------------------------------------------------
//-- GameScreen ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class GameScreen extends Widget {
    constructor(...args) {
        super(...args);
        if (!MyPlayerPawn() || MyPlayerPawn().isObserver()) return;
        this.shootButton = new ButtonWidget(this, {size:[90,90], local:[30,-80], anchor:[0,1], pivot:[0,1]});
        this.shootButton.setLabel(new ImageWidget(this.srButton, {autoSize:[1,1], url: shootImage}));
        this.shootButton.onPress = () => {this.publish("hud", "shoot");};
        //this.shootButton.onRelease = () => {this.publish("hud", "right", 0);};

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
        this.lButton = new ButtonWidget(this, {size:[50,50], local:[0,0]});
        this.rButton = new ButtonWidget(this, {size:[50,50], local:[120,0]});
        this.slButton = new ButtonWidget(this, {size:[50,50], local:[0,60]});
        this.srButton = new ButtonWidget(this, {size:[50,50], local:[120,60]});

        this.fButton.setLabel(new ImageWidget(this.fButton, {autoSize:[1,1], url: upArrow}));
        this.bButton.setLabel(new ImageWidget(this.bButton, {autoSize:[1,1], url: downArrow}));
        this.lButton.setLabel(new ImageWidget(this.lButton, {autoSize:[1,1], url: turnLeftArrow}));
        this.rButton.setLabel(new ImageWidget(this.rButton, {autoSize:[1,1], url: turnRightArrow}));
        this.slButton.setLabel(new ImageWidget(this.slButton, {autoSize:[1,1], url: moveLeftArrow}));
        this.srButton.setLabel(new ImageWidget(this.srButton, {autoSize:[1,1], url: moveRightArrow}));

        this.fButton.onPress = () => {this.publish("hud", "fore", 1);};
        this.fButton.onRelease = () => {this.publish("hud", "fore", 0);};
        this.bButton.onPress = () => {this.publish("hud", "back", 1);};
        this.bButton.onRelease = () => {this.publish("hud", "back", 0);};
        this.lButton.onPress = () => {this.publish("hud", "left", 1);};
        this.lButton.onRelease = () => {this.publish("hud", "left", 0);};
        this.rButton.onPress = () => {this.publish("hud", "right", 1);};
        this.rButton.onRelease = () => {this.publish("hud", "right", 0);};

        this.slButton.onPress = () => {this.publish("hud", "strafeleft", 1);};
        this.slButton.onRelease = () => {this.publish("hud", "strafeleft", 0);};
        this.srButton.onPress = () => {this.publish("hud", "straferight", 1);};
        this.srButton.onRelease = () => {this.publish("hud", "straferight", 0);};
    }


}