// World Core Test
//
// Croquet Studios, 2020

import { Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, WebInputManager, UIManager, AudioManager, BoxWidget, Widget, TextWidget, ButtonWidget, IFrameWidget,
    CanvasWidget, HorizontalWidget, VerticalWidget, ImageWidget, NineSliceWidget, ToggleWidget, ToggleSet, SliderWidget, TextFieldWidget, ControlWidget, v2_add, v2_sub, q_axisAngle, toRad, m4_rotationZ, m4_getRotation, m4_translation, m4_multiply, Actor, Pawn, mix, AM_Spatial, PM_Spatial, AM_Smoothed, PM_Smoothed,
    PM_AudioSource, AM_AudioSource, AM_Avatar, PM_Avatar, GetNamedView, UserList, ActorManager, User, PM_Camera,
    RenderManager, PM_Visible, UnitCube, Material, DrawCall, PawnManager, q_multiply, LocalUser, PM_AudioListener, q_isZero  } from "../worldcore";
import diana from "./assets/diana.jpg";
import llama from "./assets/llama.jpg";
import ttt from "./assets/test.svg";
import photon from "./assets/Photon.mp3";

//------------------------------------------------------------------------------------------
// User
//------------------------------------------------------------------------------------------

class MyUser extends User {

    onJoin() {
        this.viewpoint = ViewpointActor.create();
        this.viewpoint.setUser(this.viewId);
        this.viewpoint.setLocation([0,0,0]);
        this.viewpoint.setRotation(q_axisAngle([0,1,0], toRad(15)));
    }

    onExit() {
        this.viewpoint.destroy();
    }
}
MyUser.register("MyUser");

//------------------------------------------------------------------------------------------
// ViewpointActor
//------------------------------------------------------------------------------------------

class ViewpointActor extends mix(Actor).with(AM_Avatar) {
    init() { super.init("ViewpointPawn"); }

}
ViewpointActor.register('ViewpointActor');

//------------------------------------------------------------------------------------------
// ViewpointPawn
//------------------------------------------------------------------------------------------

class ViewpointPawn extends mix(Pawn).with(PM_Avatar, PM_AudioListener, PM_Camera) {
    constructor(...args) {
        super(...args);
        const thisUser = GetNamedView('LocalUser');
        thisUser.pawn = this;
    }

    destroy() {
        super.destroy();
    }

}
ViewpointPawn.register('ViewpointPawn');

//------------------------------------------------------------------------------------------
// MyActor
//------------------------------------------------------------------------------------------

class MyActor extends mix(Actor).with(AM_Avatar, AM_AudioSource) {
    init() {
        super.init("MyPawn");
        this.subscribe("test", "test2", this.test2);
    }

    test2() {
        this.playSound(photon);
    }
}
MyActor.register('MyActor');

//------------------------------------------------------------------------------------------
// MyPawn
//------------------------------------------------------------------------------------------

class MyPawn extends mix(Pawn).with(PM_Avatar, PM_Visible, PM_AudioSource) {
    constructor(...args) {
        super(...args);

        this.cube = UnitCube();
        this.cube.load();
        this.cube.clear();

        this.material = new Material();
        this.material.pass = 'opaque';
        this.material.texture.loadFromURL(diana);

        this.setDrawCall(new DrawCall(this.cube, this.material));
    }

}
MyPawn.register('MyPawn');

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        this.subscribe("test", "test1", this.test1);

        this.future(0).tick(0);
    }

    createManagers() {
        this.userList = this.addManager(UserList.create());
        this.actorManager = this.addManager(ActorManager.create());
    }

    test1() {
        if (this.actor0) return;
        this.actor0 = MyActor.create();
        this.actor0.setLocation([0,0,-7]);
    }

    tick(delta) {
        const q0 = q_axisAngle([0,0,1], 0.0007 * delta);
        const q1 = q_axisAngle([0,1,0], -0.0011 * delta);
        const q2 = q_axisAngle([1,0,0], 0.0017 * delta);
        const q3 = q_axisAngle([0,1,0], -0.0029 * delta);
        if (this.actor0) this.actor0.rotateTo(q_multiply(this.actor0.rotation, q_multiply(q0, q1)));
        if (this.actor1) this.actor1.rotateTo(q_multiply(this.actor1.rotation, q_multiply(q2, q3)));
        this.future(20).tick(20);
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------


class MyViewRoot extends ViewRoot {
    constructor(model) {
        super(model);

        this.ui.setScale(1);

        this.render.setBackground([0.45, 0.8, 0.8, 1.0]);
        this.render.lights.setAmbientColor([0.7, 0.7, 0.7]);
        this.render.lights.setDirectionalColor([0.2, 0.2, 0.2]);
        this.render.lights.setDirectionalAim([0.2,0.1,-1]);
        // this.render.camera.setLocation(m4_translation([0,0,0]));
        // this.render.camera.setProjection(toRad(60), 1.0, 10000.0);

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

        this.subscribe("input", "1Down", this.test1);
        this.subscribe("input", " Down", this.test2);
        this.subscribe("ui", "mouse0Down", this.test3);
        this.subscribe("ui", "touchDown", this.test3);
        // this.subscribe("test", "spawn", this.spawnPane);

        this.subscribe("input", "dDown", () => this.goRight(1));
        this.subscribe("input", "dUp", () => this.goRight(0));
        this.subscribe("input", "aDown", () => this.goLeft(-1));
        this.subscribe("input", "aUp", () => this.goLeft(0));

        this.subscribe("input", "wDown", () => this.goFore(-1));
        this.subscribe("input", "wUp", () => this.goFore(0));
        this.subscribe("input", "sDown", () => this.goBack(1));
        this.subscribe("input", "sUp", () => this.goBack(0));

        this.right = 0;
        this.left = 0;
        this.fore = 0;
        this.back = 0;
        this.spin = 0;
        this.anti = 0;
    }

    createManagers() {
        this.localUser = this.addManager(new LocalUser());
        this.webInput = this.addManager(new WebInputManager());
        this.render = this.addManager(new RenderManager());
        this.ui = this.addManager(new UIManager());

        this.audio = this.addManager(new AudioManager());
        this.pawnManager = this.addManager(new PawnManager());

    }

    test1() {
        console.log("test1");
        this.publish("test", "test1");
    }

    test2() {
        console.log("test2");
        this.publish("test", "test2");
    }

    test3() {
        console.log("test3");
    }

    goRight(x) {
        const a0 = this.model.actor0;
        if (!a0) return;
        this.right = x;
        const p0 = GetNamedView("PawnManager").get(a0.id);
        p0.setVelocity([0.005 * (this.right + this.left), 0,  0.005 * (this.fore + this.back)]);
    }

    goLeft(x) {
        const a0 = this.model.actor0;
        if (!a0) return;
        this.left = x;
        const p0 = GetNamedView("PawnManager").get(a0.id);
        p0.setVelocity([0.005 * (this.right + this.left), 0,  0.005 * (this.fore + this.back)]);
    }

    goFore(z) {
        const a0 = this.model.actor0;
        if (!a0) return;
        this.fore = z;
        const p0 = GetNamedView("PawnManager").get(a0.id);
        p0.setVelocity([0.005 * (this.right + this.left), 0,  0.005 * (this.fore + this.back)]);
    }

    goBack(z) {
        const a0 = this.model.actor0;
        if (!a0) return;
        this.back = z;
        const p0 = GetNamedView("PawnManager").get(a0.id);
        p0.setVelocity([0.005 * (this.right + this.left), 0,  0.005 * (this.fore + this.back)]);
    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "50"});










// // ------------------------------------------------------------------------------------------
// //-- PaneWidget ----------------------------------------------------------------------------
// //------------------------------------------------------------------------------------------

// let layer = 10;

// export class PaneControlWidget extends ControlWidget {

//     buildChildren() {
//         super.buildChildren();
//         this.head = new BoxWidget(this, {autoSize: [1,0], border:[5,5,5,0],size:[0,50], color:[0.5,0.7,0.7], visible: true});
//         this.frame = new BoxWidget(this, {autoSize: [1,1], border:[5,45,5,5], color:[0.9,0.7,0.7]});
//         this.test = new ButtonWidget(this.head, {size: [30,30], local: [10,10]});
//         this.test.label.setText("");
//         this.test.onClick = () => this.parent.destroy();
//     }

//     updateChildren() {
//         this.frame.update();
//         this.head.update();
//     }

//     get dragMargin() { return this._dragMargin || 20;}

//     mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
//         super.mouseMove(xy);
//         // if (this.head.isVisible) {
//         //     this.head.set({visible: this.inside(xy)});
//         // } else {
//         //     this.head.set({visible: this.frame.inside(xy)});
//         // }

//         const local = this.localXY(xy);
//         const x = local[0];
//         const y = local[1];
//         const m = this.dragMargin;
//         const s = this.size;

//         let c = "default";
//         if (this.head.inside(xy)) this.dragType = "move";
//         if (x < m) {
//             if (y < m) {
//                 this.dragType = "topLeft";
//                 c = "nw-resize";
//             } else if (y > s[1]-m) {
//                 this.dragType = "bottomLeft";
//                 c = "sw-resize";
//             } else {
//                 this.dragType = "left";
//                 c = "ew-resize";
//             }
//         } else if (x > s[0]- m) {
//             if (y < m) {
//                 this.dragType = "topRight";
//                 c = "ne-resize";
//             } else if (y > s[1]-m) {
//                 this.dragType = "bottomRight";
//                 c = "se-resize";
//             } else {
//                 this.dragType = "right";
//                 c = "ew-resize";
//             }
//         } else if (y < m) {
//             this.dragType = "top";
//             c = "ns-resize";
//         } else if (y > s[1]-m) {
//             this.dragType = "bottom";
//             c = "ns-resize";
//         } else {
//             // this.dragType = "none";
//             // c = "default";
//         }
//         this.setCursor(c);
//     }

//     press(xy) {
//         if (this.invisible || this.isDisabled || !this.inside(xy)) return false;
//         this.parent.guard.show();
//         if (this.parent.zIndex < layer) {
//             layer += 10;
//             this.parent.set({zIndex: layer});
//             this.parent.contents.set({zIndex: layer+1});
//         }
//         this.parent.guard.set({zIndex: this.parent.zIndex+2});
//         this.dragSize = [...this.parent.rawSize];
//         this.dragLocal = [...this.parent.local];
//         this.dragStart = [...xy];
//         this.focus();
//         return true;
//     }

//     release(xy) {
//         console.log("release");
//         // this.parent.guard.set({zIndex: this.parent.zIndex -1 });
//         this.blur();
//     }

//     drag(xy) {
//         const diff = v2_sub(xy, this.dragStart);
//         const raw = [...this.parent.rawSize];
//         const s0 = v2_add(this.dragSize, diff);
//         const s1 = v2_sub(this.dragSize, diff);
//         const ul = v2_add(this.dragLocal, diff);
//         switch (this.dragType) {
//             case "move":
//                 this.parent.set({local: ul});
//                 break;
//             case "topLeft":
//                 this.parent.set({local: ul, size: s1});
//                 break;
//             case "top":
//                 this.parent.set({local: [this.dragLocal[0], ul[1]], size: [raw[0], s1[1]]});
//                 break;
//             case "left":
//                 this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], raw[1]]});
//                 break;
//             case "topRight":
//                 this.parent.set({local: [this.dragLocal[0], ul[1]], size: [s0[0], s1[1]]});
//                 break;
//             case "bottomLeft":
//                 this.parent.set({local: [ul[0], this.dragLocal[1]], size: [s1[0], s0[1]]});
//                 break;
//             case "bottomRight":
//                 this.parent.set({size: s0});
//                 break;
//             case "right":
//                 this.parent.set({size: [s0[0], raw[1]]});
//                 break;
//             case "bottom":
//                 this.parent.set({size: [raw[0], s0[1]]});
//                 break;
//             default:
//         }
//     }

//     localXY(xy) {
//         return v2_sub(xy, this.global);
//     }

// }

// export class PaneWidget extends CanvasWidget {

//     buildChildren() {
//         super.buildChildren();
//         this.control = new PaneControlWidget(this, {autoSize:[1,1]});
//         this.contents = new IFrameWidget(this, {autoSize: [1,1], border:[10,50,10,10], zIndex: this.zIndex + 1});
//         this.guard = new CanvasWidget(this, {autoSize:[1,1], border:[10,50,10,10], zIndex: this.zIndex + 2, visible:true}); // Guard needs to be refreshed once to position it.
//         this.contents.set({source: "https://croquet.io/quub/#GUEST/1cry0ylrjmy"});
//     }

//     updateChildren() {
//         this.control.update();
//         this.contents.update();
//         this.guard.update();
//     }


//     // mouseMove(xy) { // Propagates down the widget tree. Returns true if a child handles it.
//     //     if (!this.isVisible || !this.inside(xy)) {
//     //         if (this.head.isVisible) this.head.hide();
//     //         return false;
//     //     }
//     //     this.head.show();
//     //     if (this.head.inside(xy)) this.setCursor("default");
//     //     if (this.frame.inside(xy)) this.setCursor("move");
//     //     return true;
//     // }


// }
