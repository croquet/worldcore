import UserModel from './UserModel.js';

class Model extends Croquet.Model {
    init() {
        super.init();

        this.users = [];
        this.subscribe(this.sessionId, 'view-join', this.onViewJoin);
        this.subscribe(this.sessionId, 'view-exit', this.onViewExit);
    }

    static types() {
        return {
            "THREE.Matrix4": THREE.Matrix4,
        };
    }

    getUserByViewId(viewId) {return this.users.find(user => user.viewId === viewId)}
    
    onViewJoin(viewId) {
        const user = UserModel.create({viewId});
        this.users.push(user);
        this.publish(this.sessionId, 'user-join', viewId);
        this.publish(viewId, 'user-join');
    }
    onViewExit(viewId) {
        const user = this.getUserByViewId(viewId);
        if(user) {
            this.users.splice(this.users.indexOf(user), 1);
            user.destroy();
            this.publish(this.sessionId, 'user-exit', viewId);
        }
    }
}
Model.register("Model");

export default Model;