// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager2, BoxWidget2, Widget2, TextWidget2, ButtonWidget2, IFrameWidget, CanvasWidget } from "../worldcore";


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
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        console.log("Running view constructor!");
        super(model);

        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager2());
        this.ui.setScale(1);

        this.widget0 = new BoxWidget2(this.ui.root, {anchor: [1,0.82], pivot: [1,0.82], autoSize: [0,0], size:[200,100], color:[0,0,0], local:[-20,-20]});

        this.widget1 = new BoxWidget2(this.widget0, {anchor: [0,0], pivot: [0,0], autoSize: [1,1], border:[5,5,5,5], local:[0,0], color:[1,0,0]});

        this.widget2 = new TextWidget2(this.widget1, {autoSize: [1,1], text: "This is long, split it!"});

        this.widget3 = new ButtonWidget2(this.ui.root, {anchor: [0.8,1], pivot: [0.8,1], size: [200,100], local:[0,0]});

        this.widget4 = new BoxWidget2(this.ui.root, {anchor: [0.5,0.5], pivot: [0.5,0.5], size: [400,400], border:[5,5,5,5], local:[0,0], color:[0,0,0]});

        //this.iframe = new IFrameWidget(this.widget4, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10],local:[0,0]});

        this.canvas = new CanvasWidget(this.widget4, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10], local:[0,0], color: [1,0,0]});
        // this.canvas.element.style.background = 'green';

        this.canvas2 = new CanvasWidget(this.canvas, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10], local:[0,0]});
        this.canvas2.set({color: [1,0,1]});

        this.widget5 = new ButtonWidget2(this.canvas2, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[1,1]});
        // this.widget5 = new BoxWidget2(this.canvas, {anchor: [0,0], pivot: [0,0], size: [200,100], local:[1,1]});

        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);

    }

    test1() {
        console.log("test1");
        this.widget4.hide();
    }

    test2() {
        console.log("test2");
        this.widget4.show();
    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
