class SceneView extends Croquet.View {
    constructor(model) {
        super(model);
        this.model = model;

        this.scene = new THREE.Scene();
        this.root = new THREE.Group();
        this.scene.add(this.root);

        const aspectRatio = document.documentElement.offsetWidth / document.documentElement.offsetHeight;
        this.camera = new THREE.PerspectiveCamera(70, aspectRatio, 0.05, 1000);
        this.camera.matrixAutoUpdate = false;
        this.scene.add(this.camera);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.directionalLight.position.set(0, 10, 20);
        this.root.add(this.directionalLight);
        this.root.add(this.directionalLight.target);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.root.add(this.ambientLight);

        this.box = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.025, 0.025, 0.025),
            new THREE.MeshLambertMaterial({color: 'green'}),
        );
        this.box.position.set(0, 0, -0.25);
        this.root.add(this.box);

        this.hitTestBox = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.025, 0.025, 0.025),
            new THREE.MeshLambertMaterial({color: 'blue'}),
        );
        this.hitTestBox.visible = false;
        this.hitTestBox.matrixAutoUpdate = false;
        this.root.add(this.hitTestBox);

        this.hitTestBoxes = [];

        if(navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                if(supported) {
                    document.addEventListener('click', event => {
                        navigator.xr.requestSession('immersive-ar', {
                            requiredFeatures: ['local', 'hit-test'],
                        }).then(xrSession => {
                            this.xrSession = xrSession;
                            this.xrSession.addEventListener('end', this.onXRSessionEnd.bind(this));
                            this.xrSession.addEventListener('select', this.onXRSessionSelect.bind(this));
                            this.xrSession.addEventListener('visibilitychange', this.onXRSessionVisibilityChange.bind(this));
                            

                            Promise.all([this.xrSession.requestReferenceSpace('local'), this.xrSession.requestReferenceSpace('viewer')]).then(referenceSpaces => {
                                const [localReferenceSpace, viewerReferenceSpace] = referenceSpaces;
                                
                                this.localReferenceSpace = localReferenceSpace;
                                this.viewerReferenceSpace = viewerReferenceSpace;

                                this.xrSession.requestHitTestSource({space: this.viewerReferenceSpace}).then(hitTestSource => {
                                    this.hitTestSource = hitTestSource;

                                    this.canvas = document.createElement('canvas');
                                    this.context = this.canvas.getContext('webgl', {xrCompatible: true});
        
                                    this.renderer = new THREE.WebGLRenderer({
                                        canvas: this.canvas,
                                        context: this.context,
                                        antialias: false,
                                        logarithmicDepthBuffer: false,
                                        alpha: false
                                    });
                                    this.renderer.autoClear = false;
                                    this.renderer.setPixelRatio(window.devicePixelRatio);
        
                                    window.addEventListener('resize', this.onResize.bind(this));
                                    this.onResize();
        
                                    this.baseLayer = new XRWebGLLayer(this.xrSession, this.context);
                                    this.xrSession.updateRenderState({baseLayer: this.baseLayer});
        
                                    this.xrSession.requestAnimationFrame(this.animationFrameHandler.bind(this));
                                });
                            }).catch(error => console.error(error));
                        }).catch(error => console.error(error));
                    }, {once: true});
                }
            });
        }
    }

    onXRSessionEnd(event) {console.log(event)}
    onXRSessionSelect(event) {
        console.log(event);
        const hitTestBox = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.025, 0.025, 0.025),
            new THREE.MeshLambertMaterial({color: 'yellow'}),
        );
        hitTestBox.matrixAutoUpdate = false;
        hitTestBox.matrix.copy(this.hitTestBox.matrix);
        hitTestBox.matrixWorldNeedsUpdate = true;
        hitTestBox.updateMatrixWorld();
        this.root.add(hitTestBox);
        this.hitTestBoxes.push(hitTestBox);
    }
    onXRSessionVisibilityChange(event) {console.log(event)}

    onResize() {
        const {devicePixelRatio} = window;
        const {clientWidth, clientHeight} = this.canvas;

        this.canvas.width = clientWidth * devicePixelRatio;
        this.canvas.height = clientHeight * devicePixelRatio;
    }

    animationFrameHandler(timestamp, frame) {
        if(!this.xrSession || this.xrSession.ended) return;
                                        
        this.xrSession.requestAnimationFrame(this.animationFrameHandler.bind(this));

        this.hitTestBox.visible = false;
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if(hitTestResults.length) {
            const hitTestPose = hitTestResults[0].getPose(this.localReferenceSpace);
            this.hitTestBox.visible = true;
            this.hitTestBox.matrix.fromArray(hitTestPose.transform.matrix);
            this.hitTestBox.matrixWorldNeedsUpdate = true;
        }

        const pose = frame.getViewerPose(this.localReferenceSpace);
        if(pose) {
            this.startFrame();
            pose.views.forEach(view => {
                this.publish(this.viewId, 'set-matrix', view.transform.matrix);
                this.setUsers(view);
                this.setupCamera(view);
                const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
                this.preRender(viewport);
                this.render();
            });
        }
    }

    startFrame() {this.renderer.clear()}
    setupCamera(view) {
        this.camera.matrix.fromArray(view.transform.matrix);
        this.camera.matrixWorldNeedsUpdate = true
        this.camera.updateMatrixWorld();
        this.camera.projectionMatrix.fromArray(view.projectionMatrix);
    }
    preRender(viewport) {
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight, false);
        this.renderer.setViewport(viewport.x / window.devicePixelRatio, viewport.y / window.devicePixelRatio, viewport.width / window.devicePixelRatio, viewport.height / window.devicePixelRatio);
    }
    setUsers() {
        this.model.users.forEach(userModel => {
            const mesh = this.root.children.find(mesh => mesh.type === "Mesh" && mesh.name === userModel.viewId);
            if(mesh) {
                const matrix = userModel.viewId === this.viewId?
                    view.transform.matrix:
                    userModel.matrix;
                mesh.matrix.copy(matrix);
                mesh.matrixWorldNeedsUpdate = true;
            }
        });
    }
    render() {
        this.context.bindFramebuffer(this.context.FRAMEBUFFER, this.baseLayer.framebuffer);
        this.renderer.clearDepth()
        this.renderer.render(this.scene, this.camera)
    }
}

export default SceneView;