// World Core Test
//
// Croquet Studios, 2020

import { Constants, Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, Actor, Pawn, NamedView, GetNamedView, mix, WebInputManager, AM_Smoothed, PM_Smoothed, AM_Spatial, PM_Avatar,
    UIManager, ButtonWidget, SliderWidget, ToggleWidget, TextFieldWidget } from "../worldcore";

//------------------------------------------------------------------------------------------
// Mixins
//------------------------------------------------------------------------------------------

export const PM_RenderUnity = superclass => class extends superclass {

    constructor(unityType, ...args) {
        super(...args);
        this.unityType = unityType;
        this.createUnityObject();
    }

    destroy() {
        super.destroy();
        this.deleteUnityObject();
    }

    createUnityObject() {
        const unity = GetNamedView('UnityRenderManager');
        if (unity) this.unityHandle = unity.create(this.unityType, this.global);
    }

    deleteUnityObject() {
        const unity = GetNamedView('UnityRenderManager');
        if (unity) unity.delete(this.unityHandle);
    }

    refresh() {
        super.refresh();
        const unity = GetNamedView('UnityRenderManager');
        if (unity) unity.refresh(this.unityHandle, this.global);
    }

};

//------------------------------------------------------------------------------------------
// Managers
//------------------------------------------------------------------------------------------

// The manager may not exist yet when the pawns are recreated. How to recreate all the unity objects?
// Loop through the pawn manager looking for PM_UnityRender objects

// class UnityRenderManager extends NamedView {
//     constructor() {
//         super('UnityRenderManager');
//         this.nextHandle = 1;
//         console.log("Start up Unity renderer!");
//         this.rebuild();

//     }

//     destroy() {
//         super.destroy();
//         console.log("Shut down Unity renderer!");
//     }

//     rebuild() {
//         const pawnManager = GetNamedView('PawnManager');
//         pawnManager.pawns.forEach(pawn => {
//             if (pawn.createUnityObject) pawn.createUnityObject();
//         });
//     }

//     // update(time) {
//     // }

//     create(type, matrix) {
//         const handle = this.nextHandle++;
//         console.log("Creating Unity render object of type " + type + " with handle " + handle + " and matrix " + matrix);
//         return handle;
//     }

//     delete(handle) {
//         console.log("Deleting Unity render object " + handle);
//     }

//     refresh(handle, matrix) {
//         console.log("Refreshing Unity render object " + handle);
//     }
// }

//------------------------------------------------------------------------------------------
// Actor & Pawn
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Smoothed) {
    init() { super.init('TestPawn'); }
}
TestActor.register("TestActor");

class TestPawn extends mix(Pawn).with(PM_Avatar, PM_RenderUnity) {
    constructor(...args) {
        super("Alpha", ...args);
    }
}
TestPawn.register('TestPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------


class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        console.log("starting root!");
        console.log(this.sessionId);
        this.subscribe('input', 'dDown', this.createActor);
        this.subscribe('input', 'eDown', this.moveActor);

    }

    createActor() {
        if (this.actor0) return;
        this.actor0 = TestActor.create();
        this.actor1 = TestActor.create();
        //this.actor0.addChild(this.actor1);
    }

    moveActor() {
        if (!this.actor0) return;
        this.actor0.moveTo([1,0,0]);
    }

    destroyActor() {
        if (this.actor0) this.actor0.destroy();
        if (this.actor1) this.actor1.destroy();
        this.actor0 = null;
        this.actor1 = null;
    }

}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.input = document.createElement("input");
        this.input.setAttribute("type", "text");
        this.input.style.position = "absolute";
        this.input.style.left = '200px';
        this.input.style.top = '200px';
        document.body.appendChild(this.input);

        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager());

        const textField = new TextFieldWidget(this.ui.root);
        textField.setSize([300,45]);
        textField.setLocal([20,20]);
        textField.focus();

        const showButton = new ButtonWidget(this.ui.root);
        showButton.label.setText(`Show`);
        showButton.setSize([200, 50]);
        showButton.setLocal([20, 120]);
        showButton.onClick = () => {
            this.input.style.visibility = 'visible'; // unhide the input
        };

        const focusButton = new ButtonWidget(this.ui.root);
        focusButton.label.setText(`Focus`);
        focusButton.setSize([200, 50]);
        focusButton.setLocal([20, 180]);
        focusButton.onClick = () => {
            this.input.style.visibility = 'visible';
            this.input.focus(); // focus on it so keyboard pops
            this.input.style.visibility = 'hidden';
        };

        const hideButton = new ButtonWidget(this.ui.root);
        hideButton.label.setText(`Hide`);
        hideButton.setSize([200, 50]);
        hideButton.setLocal([20, 240]);
        hideButton.onClick = () => {
            this.input.style.visibility = 'hidden'; // hide it again
        };


        // const testSlider = new SliderWidget(this.ui.root);
        // testSlider.setSize([20, 100]);
        // testSlider.setLocal([20, 200]);
        //testSlider.disable();


        // this.input.style.visibility = 'visible'; // unhide the input
        // this.input.focus(); // focus on it so keyboard pops
        // this.input.style.visibility = 'hidden'; // hide it again


        // this.unityRenderManager = this.addManager(new UnityRenderManager());
        //this.subscribe("input", "mouseXY", data=>console.log(data));
        // this.subscribe("input", "mouse0Down", data=>console.log(data));
        // this.subscribe("input", "mouse0Up", data=>console.log(data));
        //this.subscribe("input", "click", () => this.webInput.enterPointerLock());
        // this.subscribe("input", "keyDown", k => console.log(k));
        // this.subscribe("input", "iDown", () => console.log("iiiiii"));
        // this.subscribe("input", "fDown", () => console.log("ffffff"));
    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
