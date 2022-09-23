import { Widget, BoxWidget, TextWidget, VerticalWidget, ButtonWidget } from "@croquet/worldcore";


export class HUD extends Widget {

    constructor(options) {
        super(options);

        this.infoBox = new BoxWidget({parent: this, color: [1,1,1], size: [100,150], local: [10,10]});
        this.vertical = new VerticalWidget({parent: this.infoBox, autoSize: [1,1]});

        this.nameBG = new BoxWidget({parent: this, color: [1,1,1]});
        this.nameText = new TextWidget({parent: this.nameBG, autoSize: [1,1], text: "", style: "bold", point: 12});

        this.destinationBG = new BoxWidget({parent: this, color: [1,1,1]});
        this.destinationText = new TextWidget({parent: this.destinationBG, text: "", autoSize: [1,1], point: 12});

        this.newButton = new ButtonWidget({
            parent: this,
            height: 50,
            label: new TextWidget({text: "Add New Caravan", wrap: true, point: 18, font: "serif"})
        })


        this.newButton.onPress = () => {
            console.log("bing");
            this.publish("hud", "newCaravan");
        }

        this.vertical.addSlot(this.nameBG);
        this.vertical.addSlot(this.destinationBG);
        this.vertical.addSlot(this.newButton);

        this.subscribe("widgetPointer", "focusChanged", this.onFocusChanged);
    }

    onFocusChanged(focus) {
        if (focus) {
            this.caravan = focus.pawn.actor;
            console.log(this.caravan.id);
            this.subscribe(this.caravan.id, "destinationSet", this.refreshDestination)
        } else {
            if (this.caravan) this.unsubscribe(this.caravan.id, "destinationSet")
            this.caravan = null;
        }
        this.refreshDestination();
        this.refreshName();

    }

    refreshDestination() {
        let t = "";
        if (this.caravan) t = this.caravan.destination;
        this.destinationText.set({text: t});
    }

    refreshName() {
        let t = "";
        if (this.caravan) t = this.caravan.name;
        this.nameText.set({text: t});
    }

}