// Guardians BotHUD
// Copyright (c) 2023 CROQUET CORPORATION

import { ButtonWidget2, TextWidget2, Widget2 } from "@croquet/worldcore";

export class HUDWidget extends Widget2 {
    constructor(options) {
        super(options);
        this.set({autoSize: [1,1], color:[0,0.5,1]});

        new WaveWidget({parent: this, anchor:[0,0], pivot:[0,0], size: [100,50]});
        new HealthWidget({parent: this, anchor:[0.5,0], pivot:[0.5,0], size: [100,50]});
        new CountWidget({parent: this, anchor:[1,0], pivot:[1,0], size: [100,50]});

        this.subscribe("game", "endGame", this.finish);
        this.subscribe("user", "endGame", this.finish); // new user w/stats
        this.publish("stats", "update"); // new user - what is happening?
    }

    finish() {
        if (!this.endGame) this.endGame = new EndWidget({parent: this, anchor:[0.5,0.5], pivot:[0.5,0.5]});
    }
}

class WaveWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({text: "Wave", alpha: 0, textColor:[0.25,1,0.25]});
        this.subscribe("stats", "wave", this.setStat);
    }

    setStat(wave) {
        this.set({text:"Wave "+wave});
    }
}

class HealthWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({point:32, text: "100", alpha: 0, textColor:[0.25,1,0.25]});
        this.subscribe("stats", "health", this.setStat);
    }

    setStat(health) {
        let textColor;
        if (health>66) {textColor = [0.25,1,0.25];}
        else if (health>33) {textColor = [1, 1, 0.25];}
        else {textColor = [1, 0.15, 0.15];}
        this.set({text:""+health, textColor});
    }
}

class CountWidget extends TextWidget2 {
    constructor(options) {
        super(options);
        this.set({text: "Bots", alpha: 0, textColor:[0.25,1,0.25]});
        this.subscribe("stats", "bots", this.setStat);
    }

    setStat(bots) {
        this.set({text:"Bots "+bots});
    }
}

class EndWidget extends Widget2 {
    constructor(options) {
        super(options);
        new TextWidget2({parent: this, text:"Game Over!", anchor:[0.5,0.5], pivot:[0.5,1], translation:[0,-10], size: [100,50], alpha: 0, textColor:[1,1,0.25]});
        const button = new ButtonWidget2({parent: this, text:"Game Over!", anchor:[0.5,0.5], pivot:[0.5,0], translation:[0,10], size: [200,50]});
        button.label.set({text: "Play Again"});
        this.subscribe("game", "gameStarted", this.gameStarted);
        button.onClick = ()=> {
            this.publish("game", "startGame");
            console.log("Start New Game!");
        };
    }

    gameStarted() {
        this.parent.endGame = undefined;
        this.destroy();
    }
}
