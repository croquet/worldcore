class UserModel extends Croquet.Model {
    init({viewId}) {
        super.init();

        this.viewId = viewId;

        this.matrix = new THREE.Matrix4();
        this.subscribe(this.viewId, 'set-matrix', this.setMatrix);
    }

    setMatrix(array) {
        this.matrix.fromArray(array);
        this.publish(this.viewId, 'did-set-matrix');
    }
}
UserModel.register("User");

export default UserModel;