import SceneView from './SceneView.js';
import UserView from './UserView.js';

class View extends Croquet.View {
    constructor(model) {
        super(model);
        this.model = model;

        this.scene = new SceneView(model);

        this.users = [];

        if(this.userModel)
            this.onJoin();
        else
            this.subscribe(this.viewId, 'user-join', this.onJoin);
    }

    getUserByViewId(viewId) {return this.users.find(user => user.userModel.viewId === viewId)}
    get user() {return this.getUserByViewId(this.viewId)}

    get userModel() {return this.model.getUserByViewId(this.viewId)}

    onJoin() {
        this.subscribe(this.sessionId, 'user-join', this.onUserJoin);
        this.subscribe(this.sessionId, 'user-exit', this.onUserExit);

        this.model.users.forEach(user => this.onUserJoin(user.viewId))
    }

    onUserJoin(viewId) {
        const userModel = this.model.getUserByViewId(viewId);
        if(userModel) {
            console.log(`user "${viewId}" joined`);
            const user = new UserView(userModel, this.scene.scene);
            this.users.push(user);
            
            if(user.mesh)
                this.scene.root.add(user.mesh);
        }
    }
    onUserExit(viewId) {
        const user = this.getUserByViewId(viewId);
        if(user) {
            console.log(`user "${viewId}" exited`);
            this.users.splice(this.users.indexOf(user), 1);
            user.detach();
        }
    }
}

export default View;