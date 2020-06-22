// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, BoxWidget, Widget, TextWidget, ButtonWidget, IFrameWidget,
    CanvasWidget, HorizontalWidget, VerticalWidget, ImageWidget, NineSliceWidget, ToggleWidget, ToggleSet, SliderWidget, TextFieldWidget, ControlWidget } from "../worldcore";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import ttt from "./assets/test.svg";
import { v2_sub } from "../worldcore/src/Vector";

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

export class PaneControlWidget extends ControlWidget {

    buildChildren() {
        super.buildChildren();
        this.head = new BoxWidget(this, {autoSize: [1,0], size:[0,50], color:[0.5,0.7,0.7], visible: false});
        this.frame = new BoxWidget(this, {autoSize: [1,1], border:[0,45,0,0], color:[0.9,0.7,0.7]});
        this.test = new ButtonWidget(this.head, {size: [30,30], local: [10,10]});
        this.test.label.setText("");
    }

    updateChildren() {

        this.frame.update();
        this.head.update();
    }

    mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
        super.mouseMove(xy);
        if (this.head.isVisible) {
            this.head.set({visible: this.inside(xy)});
        } else {
            this.head.set({visible: this.frame.inside(xy)});
        }
    }

}

export class PaneWidget extends CanvasWidget {

    buildChildren() {
        super.buildChildren();
        this.control = new PaneControlWidget(this, {autoSize:[1,1]});
        // this.head = new BoxWidget(this, {autoSize: [1,0], size:[0,20], color:[0.5,0.7,0.7], visible: false});
        // this.frame = new BoxWidget(this, {autoSize: [1,1], border:[0,15,0,0], color:[0.9,0.7,0.7]});
        this.contents = new IFrameWidget(this, {autoSize: [1,1], border:[5,50,5,5], zIndex: this.zIndex + 1});
        this.contents.set({source: "https://croquet.io/quub/#GUEST/1cry0ylrjmy"});
    }

    updateChildren() {
        this.control.update();
        this.contents.update();
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

    localXY(xy) {
        return v2_sub(xy, this.global);
    }
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
        this.ui.setScale(1);

        // this.horizontal = new HorizontalWidget(this.ui.root, {size: [500,100], margin: 10, autoSize:[1,0]});
        // this.vertical = new VerticalWidget(this.ui.root, {size: [200,500], margin: 10, autoSize:[0,1]});

        this.widget0 = new BoxWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], autoSize: [0,0], size:[200,100], color:[0,0,0], local:[20,20]});

        this.widget1 = new BoxWidget(this.widget0, {anchor: [0,0], pivot: [0,0], autoSize: [1,1], border:[5,5,5,5], local:[0,0], color:[1,0,0]});

        this.widget2 = new TextWidget(this.widget1, {autoSize: [1,1], text: "This is long, split it!"});
        this.widget2.set({scale:1.5, clip: true});


        this.widget3 = new ToggleWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[-20,20]});
        this.widget3a = new ToggleWidget(this.ui.root, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[-20,-20]});
        this.toggleSet = new ToggleSet(this.widget3, this.widget3a);

        this.frame = new BoxWidget(this.ui.root, {anchor: [1,1], pivot: [1,1], size:[200,500], local:[-20,-20], color:[1,0,0], scale:1});
        this.imageWidget = new NineSliceWidget(this.frame, {autoSize: [1,1], border:[5,5,5,5], size:[100,100], local:[0,0], url: diana, inset:[64,64,64,64], insetScale:1});
        // this.imageWidget = new ImageWidget(this.frame, {autoSize: [1,1], border:[5,5,5,5], size:[100,100], local:[0,0], url: ttt});
        // this.imageWidget.loadFromURL(diana);


        this.horizontal = new HorizontalWidget(this.ui.root, {size: [500,100], margin: 10, autoSize:[1,0]});
        this.horizontal.set({scale:0.5});
        this.horizontal.addSlot(this.widget0);
        this.horizontal.addSlot(this.widget3);
        this.horizontal.addSlot(this.widget3a);
        this.widget3.set({width: 200});
        this.widget3a.set({width: 200});

        this.pane = new PaneWidget(this.ui.root, {anchor: [0.5,0.5], pivot: [0.5,0.5], size: [400,400], local:[0,0], scale:0.7});

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
