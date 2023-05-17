import { ButtonWidget2, TextWidget2, Widget2 } from "@croquet/worldcore";

export class HUDWidget extends Widget2 {
    constructor(options) {
        super(options);
        this.set({autoSize: [1,1], color:[0,0.5,1]});

        new WaveWidget({parent: this, anchor:[0,0], pivot:[0,0], size: [100,50]});
        new HealthWidget({parent: this, anchor:[0.5,0], pivot:[0.5,0], size: [100,50]});
        new CountWidget({parent: this, anchor:[1,0], pivot:[1,0], size: [100,50]});

        this.subscribe("input", "qDown", this.finish);
    }

    finish() {
        new EndWidget({parent: this, anchor:[0.5,0.5], pivot:[0.5,0.5]});
    }
}

class WaveWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({text: " Wave 1", alpha: 0});

        this.subscribe("input", "gDown", this.test);
    }

    test() {
        this.set({text:"Wave 2"});
    }
}

class HealthWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({point:32, text: "100", alpha: 0});

    }
}

class CountWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({text: " Bots: 1", alpha: 0});

        this.subscribe("input", "gDown", this.test);
    }

    test() {
        this.set({text:"Bots 2"});
    }
}

class EndWidget extends Widget2 {
    constructor(options) {
        super(options);
        new TextWidget2({parent: this, text:"Game Over!", anchor:[0.5,0.5], pivot:[0.5,1], translation:[0,-10], size: [100,50], alpha: 0});
        const button = new ButtonWidget2({parent: this, text:"Game Over!", anchor:[0.5,0.5], pivot:[0.5,0], translation:[0,10], size: [200,50]});
        button.label.set({text: "Play Again"});
        button.onClick = ()=> {
            console.log("Start New Game!");
            this.destroy();
        };
    }
}
