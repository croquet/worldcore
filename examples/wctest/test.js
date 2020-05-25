// World Core Test
//
// Croquet Studios, 2020

import { Constants, Session } from "@croquet/croquet";
import { ModelRoot, ViewRoot, Actor, Pawn, NamedView, GetNamedView, mix, WebInputManager, AM_Smoothed, PM_Smoothed, AM_Spatial, PM_Avatar,
    UIManager, ButtonWidget, SliderWidget, ToggleWidget, TextFieldWidget, BoxWidget, TextWidget, UserListBase, UserBase, ThisUserBase } from "../worldcore";


//------------------------------------------------------------------------------------------
// Actor & Pawn
//------------------------------------------------------------------------------------------

class TestActor extends mix(Actor).with(AM_Smoothed) {
    init() {
        super.init('TestPawn');
    }
}
TestActor.register("TestActor");

class TestPawn extends mix(Pawn).with(PM_Smoothed) {
    constructor(...args) {
        super("Alpha", ...args);
    }
}
TestPawn.register('TestPawn');


//------------------------------------------------------------------------------------------
// User Stuff
//------------------------------------------------------------------------------------------

class UserList extends UserListBase {
    createUser(id) { return User.create(id); }
 }
 UserList.register("UserList");

class User extends UserBase {
    init(id) {
        super.init(id);
        this.listen("setName", name => {this.name = name; this.changed("name");});
    }
}
User.register("User");

class ThisUser extends ThisUserBase {
    setName(name) {return this.say("setName", name);}
}

//------------------------------------------------------------------------------------------
// MyModelRoot
//------------------------------------------------------------------------------------------

class MyModelRoot extends ModelRoot {
    init() {
        super.init();
        this.userList = this.addManager(UserList.create());
    }
}
MyModelRoot.register("MyModelRoot");

//------------------------------------------------------------------------------------------
// MyViewRoot
//------------------------------------------------------------------------------------------

class NameWidget extends TextWidget {
    constructor(...args) {
        super(...args);
        this.subscribe(this.viewId, "changed", this.refresh);
    }

    refresh() {
        console.log("Refreshed widget!");
        console.log(GetNamedView("ThisUser"));
        this.setText(GetNamedView("ThisUser").user.name);
    }

}

class MyViewRoot extends ViewRoot {
    constructor(model) {
        console.log("Running view constructor!");
        super(model);

        this.webInput = this.addManager(new WebInputManager());
        this.ui = this.addManager(new UIManager());
        this.thisUser = this.addManager(new ThisUser());

        const textBackground = new BoxWidget(this.ui.root);
        textBackground.setPivot([1,0]);
        textBackground.setAnchor([1,0]);
        textBackground.setSize([300,300]);
        textBackground.setLocal([-20,20]);

        const textBox = new NameWidget(textBackground);
        textBox.setAutoSize([1,1]);
        textBox.setBorder([5,5,5,5]);
        textBox.setColor([1,1,1]);
        textBox.setAlignX('right');
        textBox.setAlignY('bottom');
        textBox.setClip(true);
        textBox.setWrap(true);
        textBox.setText("This is a very long piece of text that needs to wrap!\n\nBut what happens if it's too long to fit in the box? Will it clip?");

        this.textField = new TextFieldWidget(this.ui.root);
        this.textField.setSize([600,45]);
        this.textField.setLocal([20,20]);
        this.textField.text.setText("This is a text field. Type in it!");
        // textField.disable();


        // const showButton = new ButtonWidget(this.ui.root);
        // showButton.label.setText(`Show`);
        // showButton.setSize([200, 50]);
        // showButton.setLocal([20, 120]);
        // showButton.onClick = () => {
        //     console.log("Show!");
        //     this.input.style.visibility = 'visible'; // unhide the input
        // };

        const focusButton = new ButtonWidget(this.ui.root);
        focusButton.label.setText(`Enable`);
        focusButton.setSize([200, 50]);
        focusButton.setLocal([20, 180]);
        focusButton.onClick = () => {
            this.textField.enable();
        };

        const hideButton = new ButtonWidget(this.ui.root);
        hideButton.label.setText(`Disable`);
        hideButton.setSize([200, 50]);
        hideButton.setLocal([20, 240]);
        hideButton.onClick = () => {
            this.textField.disable();
        };

        this.testButton = new ButtonWidget(this.ui.root);
        this.testButton.label.setText(`Test`);
        this.testButton.setSize([200, 50]);
        this.testButton.setLocal([20, 300]);
        this.testButton.onClick = () => {
            console.log("Test!");
            this.thisUser.setName("The Babadook");
        };

        this.toggle0 = new ToggleWidget(this.ui.root);
        this.toggle0.setSize([200, 50]);
        this.toggle0.setLocal([0, 0]);
        this.toggle0.setPivot([0.5,0.5]);
        this.toggle0.setAnchor([0.5,0.5]);
        // testButton.onClick = () => {
        //     textField.blur();
        // };


        this.testSlider = new SliderWidget(this.ui.root);
        this.testSlider.setSize([20, 200]);
        this.testSlider.setLocal([400,400]);
        // testSlider.disable();


    }

}


Session.join("game", MyModelRoot, MyViewRoot, {tps: "10"});
