// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager2, BoxWidget2, Widget2, TextWidget2, ButtonWidget2, IFramePane } from "../worldcore";


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
        // this.ui.setScale(2);

        this.widget0 = new BoxWidget2(this.ui.xxx, {anchor: [1,1], pivot: [1,1], autoSize: [0,0], size:[200,100], color:[0,0,0], local:[-20,-20]});


        this.widget1 = new BoxWidget2(this.widget0, {anchor: [0,0], pivot: [0,0], autoSize: [1,1], border:[5,5,5,5], local:[0,0], color:[1,0,0]});

        this.widget2 = new TextWidget2(this.widget1, {autoSize: [1,1], text: "This is long, split it!"});

        this.widget3 = new ButtonWidget2(this.ui.xxx, {anchor: [0.5,0], pivot: [0.5,0], size: [200,100], local:[0,0]});

        this.widget4 = new BoxWidget2(this.ui.xxx, {anchor: [0.5,0.5], pivot: [0.5,0.5], size: [400,300], border:[5,5,5,5], local:[0,0], color:[0,0,0]});

        this.iframe = new IFramePane(this.widget4, {anchor: [0.5,0.5], pivot: [0.5,0.5], autoSize: [1,1], border:[10,10,10,10],local:[0,0]});


        // this.iframe0 = document.createElement("iframe");
        // this.iframe0.setAttribute("src", "https://croquet.io/quub/#8biyw3olzm");
        // this.iframe0.style.cssText = "position: absolute; left: 0; top: 0; width: 400px; height: 200px; z-index: 3";
        // // this.iframe0.style.width = "400px";
        // // this.iframe0.style.height = "400px";
        // // this.iframe0.style.zIndex = 0;
        // document.body.insertBefore(this.iframe0, null);

        // this.iframe1 = document.createElement("iframe");
        // this.iframe1.setAttribute("src", "https://croquet.io/quub/#8biyw3olzm");
        // this.iframe1.style.cssText = "position: absolute; left: 40; top: 20; width: 200px; height: 400px; z-index: 2";
        // // this.iframe1.style.left = "50px";
        // // this.iframe1.style.top = "50px";
        // // this.iframe1.style.width = "400px";
        // // this.iframe1.style.height = "400px";
        // // this.iframe1.style.zIndex = 2;
        // document.body.insertBefore(this.iframe1, null);


        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", "2Down", this.test2);

    }

    test1() {
        console.log("test1");
        // this.iframe1.style.zIndex = 2;
        this.widget1.hide();
    }

    test2() {
        console.log("test2");
        // this.iframe1.style.zIndex = 4;
        this.widget1.show();
    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
