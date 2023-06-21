import { AM_Behavioral,  AccountManager, ModelRoot,  Actor, mix, ModelService, Behavior, Shuffle, WorldcoreModel, Account} from "@croquet/worldcore";
import { Nickname } from "./Names";
// import { Question, QuestionCount } from "./Questions";
// import { CharacterName, CharacterCount } from "./Characters";

//------------------------------------------------------------------------------------------
// -- Game ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class Game extends mix(Actor).with(AM_Behavioral) {

    init(options) {
        super.init(options);
    }

}
Game.register('Game');

//------------------------------------------------------------------------------------------
// -- Account ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class MyAccount extends Account {

    get pawn() {return "MyPawn"}

    init(options) {
        super.init(options);
        console.log("custom account");
        this.nickname = Nickname();
        console.log(this.nickname);
    }

}
MyAccount.register('MyAccount');

class MyAccountManager extends AccountManager {

    get defaultAccount() {return MyAccount}

}
MyAccountManager.register('MyAccountManager');

//------------------------------------------------------------------------------------------
//-- MyModelRoot ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MyModelRoot extends ModelRoot {

    static modelServices() {
        return [MyAccountManager];
    }

    init(...args) {
        super.init(...args);
        console.log("Start root model!!");
        this.game = Game.create();
    }

}
MyModelRoot.register("MyModelRoot");
