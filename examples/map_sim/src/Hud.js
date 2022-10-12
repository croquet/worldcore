import { Widget, BoxWidget, TextWidget, VerticalWidget, ButtonWidget } from "@croquet/worldcore";
import { CaravanActor } from "./Caravan";
import { CityActor } from "./City";


export class HUD extends Widget {

    constructor(options) {
        super(options);

        this.infoBox = new BoxWidget({parent: this, color: [1,1,1], size: [100,150], local: [10,10]});
        this.vertical = new VerticalWidget({parent: this.infoBox, autoSize: [1,1]});

        this.nameBG = new BoxWidget({parent: this, color: [1,1,1]});
        this.nameText = new TextWidget({parent: this.nameBG, autoSize: [1,1], text: "", style: "bold", point: 12});

        this.destinationBG = new BoxWidget({parent: this, color: [1,1,1]});
        this.destinationText = new TextWidget({parent: this.destinationBG, text: "", autoSize: [1,1], point: 12});

        this.goodsBG = new BoxWidget({parent: this, color: [1,1,1]});
        this.goodsText = new TextWidget({parent: this.goodsBG, text: "", autoSize: [1,1], point: 12});

        this.newButton = new ButtonWidget({
            parent: this,
            local: [10,-10],
            size: [100,50],
            anchor: [0,1],
            pivot: [0,1],
            label: new TextWidget({text: "Add New Caravan", wrap: true, point: 16})
        })

        this.viewButton = new ButtonWidget({
            parent: this,
            height: 50,
            visible: false,
            label: new TextWidget({text: "Visit", wrap: true, point: 18})
        })


        this.newButton.onPress = () => {
            this.publish("hud", "newCaravan");
        }

        this.viewButton.onPress = () => {
            window.open("https://croquet.pages.dev/?world=inthefootsteps&q=dsdud2ca6h#pw=k9UEwUakXLLHCwHTFb4R3A");
        }

        this.vertical.addSlot(this.nameBG);
        this.vertical.addSlot(this.destinationBG);
        this.vertical.addSlot(this.goodsBG);
        this.vertical.addSlot(this.viewButton);

        this.subscribe("widgetPointer", "focusChanged", this.onFocusChanged);
    }

    onFocusChanged(focus) {
        if (focus) {
            this.focus = focus.pawn.actor;
            // this.subscribe(this.focus.id, "destinationSet", this.refreshDestination)
        } else {
            // if (this.focus) this.unsubscribe(this.focus.id, "destinationSet")
            this.focus = null;
        }
        this.refresh();

    }

    refresh() {
        if (this.focus instanceof CityActor) {
            this.viewButton.show();
            this.refreshBuys();
            this.refreshSells();
        } else {
            this.viewButton.hide();
            this.refreshHome();
            this.refreshGoods();
        }
        this.refreshName();

    }

    refreshHome() {
        let t = "";
        if (this.focus) t = "Hometown: Venice";
        this.destinationText.set({text: t});
    }

    refreshName() {
        let t = "";
        if (this.focus) t = this.focus.title;
        this.nameText.set({text: t});

    }

    refreshGoods() {
        let t = "";
        if (this.focus) t = this.focus.goods;
        this.goodsText.set({text: t});
    }

    refreshBuys() {
        let t = "";
        if (this.focus) t = this.focus.buys;
        this.goodsText.set({text: t});
    }

    refreshSells() {
        let t = "";
        if (this.focus) t = this.focus.sells;
        this.destinationText.set({text: t});
    }

}