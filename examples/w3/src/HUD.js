import { ImageWidget, ToggleSet, ToggleWidget, Widget } from "@croquet/worldcore";

import digOnIcon  from "../assets/digOnIcon.png";
import digOffIcon  from "../assets/digOffIcon.png";
import fillOnIcon  from "../assets/fillOnIcon.png";
import fillOffIcon  from "../assets/fillOffIcon.png";

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

        const toggleSet = new ToggleSet(digToggle, fillToggle);
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


