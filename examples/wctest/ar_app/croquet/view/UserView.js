class UserView extends Croquet.View {
    constructor(userModel) {
        super(userModel);
        this.userModel = userModel;

        if(this.userModel.viewId !== this.viewId) {
            this.mesh = new THREE.Mesh(
                new THREE.BoxBufferGeometry(0.025, 0.025, 0.025),
                new THREE.MeshLambertMaterial({color: 'red'}),
            );
            this.mesh.matrixAutoUpdate = false;
            this.mesh.name = this.userModel.viewId;
        }
    }

    detach() {
        if(this.mesh && this.mesh.parent)
            this.mesh.parent.remove(this.mesh);
    }
}

export default UserView;