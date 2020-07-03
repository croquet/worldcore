// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, BoxWidget, Widget, TextWidget, ButtonWidget, IFrameWidget,
    CanvasWidget, HorizontalWidget, VerticalWidget, ImageWidget, NineSliceWidget, ToggleWidget, ToggleSet, SliderWidget, TextFieldWidget, ControlWidget, v2_add, v2_sub } from "../worldcore";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import ttt from "./assets/test.svg";

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
//-- PaneWidget ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

let layer = 10;

export class PaneControlWidget extends ControlWidget {

    buildChildren() {
        super.buildChildren();
        this.head = new BoxWidget(this, {autoSize: [1,0], border:[5,5,5,0],size:[0,50], color:[0.5,0.7,0.7], visible: true});
        this.frame = new BoxWidget(this, {autoSize: [1,1], border:[5,45,5,5], color:[0.9,0.7,0.7]});
        this.test = new ButtonWidget(this.head, {size: [30,30], local: [10,10]});
        this.test.label.setText("");
        this.test.onClick = () => this.parent.destroy();
    }

    updateChildren() {
        this.frame.update();
        this.head.update();
    }

    get dragMargin() { return this._dragMargin || 20;}

    mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
        super.mouseMove(xy);
        // if (this.head.isVisible) {
        //     this.head.set({visible: this.inside(xy)});
        // } else {
        //     this.head.set({visible: this.frame.inside(xy)});
        // }

        const local = this.localXY(xy);
        const x = local[0];
        const y = local[1];
        const m = this.dragMargin;
        const s = this.size;

        let c = "default";
        if (this.head.inside(xy)) this.dragType = "move";
        if (x < m) {
            if (y < m) {
                this.dragType = "topLeft";
                c = "nw-resize";
            } else if (y > s[1]-m) {
                this.dragType = "bottomLeft";
                c = "sw-resize";
            } else {
                this.dragType = "left";
                c = "ew-resize";
            }
        } else if (x > s[0]- m) {
            if (y < m) {
                this.dragType = "topRight";
                c = "ne-resize";
            } else if (y > s[1]-m) {
                this.dragType = "bottomRight";
                c = "se-resize";
            } else {
                this.dragType = "right";
                c = "ew-resize";
            }
        } else if (y < m) {
            this.dragType = "top";
            c = "ns-resize";
        } else if (y > s[1]-m) {
            this.dragType = "bottom";
            c = "ns-resize";
        } else {
            // this.dragType = "none";
            // c = "default";
        }
        this.setCursor(c);
    }

    press(xy) {
        if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
        this.parent.guard.show();
        if (this.parent.zIndex < layer) {
            layer += 10;
            this.parent.set({zIndex: layer});
            this.parent.contents.set({zIndex: layer+1});
        }
        this.parent.guard.set({zIndex: this.parent.zIndex+2});
        this.dragSize = [...this.parent.rawSize];
        this.dragLocal = [...this.parent.local];
        this.dragStart = [...xy];
        this.focus();
        return true;
    }

    release(xy) {
        console.log("release");
        // this.parent.guard.set({zIndex: this.parent.zIndex -1 });
        this.blur();
    }

    drag(xy) {
        const diff = v2_sub(xy, this.dragStart);
        const raw = [...this.parent.rawSize];
        const s0 = v2_add(this.dragSize, diff);
        const s1 = v2_sub(this.dragSize, diff);
        const ul = v2_add(this.dragLocal, diff);
        switch (this.dragType) {
            case "move":
                this.parent.set({local: ul});
                break;
            case "topLeft":
                this.parent.set({local: ul, size: s1});
                break;
            case "top":
                this.parent.set({local: [this.dragLocal[0], ul[1]], size: [raw[0], s1[1]]});
                break;
            case "left":
                this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], raw[1]]});
                break;
            case "topRight":
                this.parent.set({local: [this.dragLocal[0], ul[1]], size: [s0[0], s1[1]]});
                break;
            case "bottomLeft":
                this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], s0[1]]});
                break;
            case "bottomRight":
                this.parent.set({size: s0});
                break;
            case "right":
                this.parent.set({size: [s0[0], raw[1]]});
                break;
            case "bottom":
                this.parent.set({size: [raw[0], s0[1]]});
                break;
            default:
        }
    }

    localXY(xy) {
        return v2_sub(xy, this.global);
    }

}

export class PaneWidget extends CanvasWidget {

    buildChildren() {
        super.buildChildren();
        this.control = new PaneControlWidget(this, {autoSize:[1,1]});
        this.contents = new IFrameWidget(this, {autoSize: [1,1], border:[10,50,10,10], zIndex: this.zIndex + 1});
        this.guard = new CanvasWidget(this, {autoSize:[1,1], border:[10,50,10,10], zIndex: this.zIndex + 2, visible:true}); // Guard needs to be refreshed once to position it.
        this.contents.set({source: "https://croquet.io/quub/#GUEST/1cry0ylrjmy"});
    }

    updateChildren() {
        this.control.update();
        this.contents.update();
        this.guard.update();
    }


    // mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
    //     if (!this.isVisible || !this.inside(xy)) {
    //         if (this.head.isVisible) this.head.hide();
    //         return false;
    //     }
    //     this.head.show();
    //     if (this.head.inside(xy)) this.setCursor("default");
    //     if (this.frame.inside(xy)) this.setCursor("move");
    //     return true;
    // }


}

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        console.log("Running view constructor!");
        super(model);

        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager());
        this.ui.setScale(0.5);

        // this.horizontal = new HorizontalWidget(this.ui.root, {size: [500,100], margin: 10, autoSize:[1,0]});
        // this.vertical = new VerticalWidget(this.ui.root, {size: [200,500], margin: 10, autoSize:[0,1]});

        // this.widget0 = new BoxWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], autoSize: [0,0], size:[200,100], color:[0,0,0], local:[20,20]});

        // this.widget1 = new BoxWidget(this.widget0, {anchor: [0,0], pivot: [0,0], autoSize: [1,1], border:[5,5,5,5], local:[0,0], color:[1,0,0]});

        // this.widget2 = new TextWidget(this.widget1, {autoSize: [1,1], text: "This is long, split it!"});
        // this.widget2.set({scale:1.5, clip: true});


        // this.widget3 = new ButtonWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[-20,20]});
        // this.widget3a = new ButtonWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[-20,-20]});

        // // this.widget3.onClick = () => this.widget4.hide();
        // this.widget3a.onClick = () => this.widget4.show();

        // this.widget3a.onClick = () => { this.publish("test", "spawn"); };
        // this.toggleSet = new ToggleSet(this.widget3, this.widget3a);

        // this.frame = new BoxWidget(this.ui.root, {anchor: [1,1], pivot: [1,1], size:[200,500], local:[-20,-20], color:[1,0,0], scale:1});
        // this.imageWidget = new NineSliceWidget(this.frame, {autoSize: [1,1], border:[5,5,5,5], size:[100,100], local:[0,0], url: diana, inset:[64,64,64,64], insetScale:1});
        // this.imageWidget = new ImageWidget(this.frame, {autoSize: [1,1], border:[5,5,5,5], size:[100,100], local:[0,0], url: ttt});
        // this.imageWidget.loadFromURL(diana);


        // this.horizontal = new HorizontalWidget(this.ui.root, {size: [500,100], margin: 10, autoSize:[1,0]});
        // this.horizontal.set({scale:0.5});
        // this.horizontal.addSlot(this.widget0);
        // this.horizontal.addSlot(this.widget3);
        // this.horizontal.addSlot(this.widget3a);
        // this.widget3.set({width: 200});
        // this.widget3a.set({width: 200});

        // this.pane = new PaneWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [400,400], local:[400,400], scale:1});

        // this.widget4 = new BoxWidget(this.ui.root, {anchor: [0.5,0.5], pivot: [0.5,0.5], size: [400,400], border:[5,5,5,5], local:[0,0], color:[0,0,0], scale:0.5});
        // this.widget4.set({scale:0.9});

        // this.iframe = new IFrameWidget(this.widget4, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10], local:[0,0], zIndex: 2});
        // this.iframe.set({source: "https://croquet.io/quub/#GUEST/1cry0ylrjmy"});

        // this.canvas = new CanvasWidget(this.widget4, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10], local:[0,0], color: [0.55,0,0]});
        // this.canvas2 = new CanvasWidget(this.canvas, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10], local:[0,0], color: [0.65,0.65,0.65]});
        // this.widget5 = new ButtonWidget(this.canvas2, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[5,5], disabled: false, scale:1});

        this.slider = new SliderWidget(this.ui.root, {anchor: [0,1], pivot: [0,1], size: [30,300], local:[20,-20]});
        this.slider.set({scale: 0.9});
        // this.slider.onChange = p => {this.canvas2.set({opacity: p});};

        this.entry = new TextFieldWidget(this.ui.root, {size:[300,50], local:[20, 100], scale: 1.3});
        this.entry.text.set({text:"1234567890123456789023456789012345678902345678901234567890"});

        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);
        this.subscribe("ui", "mouse0Down", this.test3);
        this.subscribe("ui", "touchDown", this.test3);
        this.subscribe("test", "spawn", this.spawnPane);

        layer = 10;

    }

    spawnPane() {
        layer += 10;
        new PaneWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [400,400], local:[400,400], scale:1, zIndex: layer});
    }

    test1() {
        console.log("test1");
        this.widget4.hide();
    }

    test2() {
        console.log("test2");
        this.widget4.show();
    }

    test3() {
        console.log("test3");
    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
