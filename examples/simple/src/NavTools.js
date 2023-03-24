import { WorldcoreView, THREE } from "@croquet/worldcore";


export const PM_NavGridGizmo = superclass => class extends superclass {
    constructor(model) {
        super(model);

        this.redMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        this.greenMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
        this.yellowMaterial = new THREE.LineBasicMaterial( { color: 0xffff00 } );
        this.cyanMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff } );
        this.magentaMaterial = new THREE.LineBasicMaterial( { color: 0xff00ff } );

        this.drawGizmo();

        this.listenOnce("navGridChanged", this.drawGizmo);
        this.listenOnce("drawPath", this.drawPathGizmo);
    }

    destroy() {
        super.destroy();
        this.redMaterial.dispose();
        this.greenMaterial.dispose();
        this.yellowMaterial.dispose();
        this.cyanMaterial.dispose();
        this.magentaMaterial.dispose();
    }

    drawGizmo() {
        const rm = this.service("ThreeRenderManager");
        if (this.gizmo) rm.scene.remove(this.gizmo);
        this.gizmo = new THREE.Group();

        switch (this.actor.gridPlane) {
            default:
            case 0: this.drawGizmoXZ(); break;
            case 1: this.drawGizmoXY(); break;
            case 2: this.drawGizmoYZ(); break;
        }

        rm.scene.add(this.gizmo);
    }

    drawGizmoXY() {
        const grid = this.actor;
        const s = grid.gridScale;
        const a = 0.25*grid.gridScale;
        const b = 0.5*grid.gridScale;
        const c = 0.75*grid.gridScale;
        let d = 0.1;
        const x0 = 0;
        const y0 = 0;

        let material;
        let geometry
        let p0
        let p1;
        let line;

        grid.navNodes.forEach( node => {

            const x = x0 + s*node.xy[0];
            const y = y0 + s*node.xy[1];

            // -- west --

            material = node.west ? this.yellowMaterial : this.redMaterial;
            d = node.west ? 0.1 : 0.2;

            p0 = [x+0,y+0,d];
            p1 = [x+0,y+s,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- south --

            material = node.south ? this.yellowMaterial : this.redMaterial;
            d = node.south ? 0.1 : 0.2;

            p0 = [x+0,y+0,d];
            p1 = [x+s,y+0,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- east --

            material = node.east ? this.yellowMaterial : this.redMaterial;
            d = node.east ? 0.1 : 0.2;

            p0 = [x+s,y+0,d];
            p1 = [x+s,y+s,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- north --

            material = node.north ? this.yellowMaterial : this.redMaterial;
            d = node.north ? 0.1 : 0.2;

            p0 = [x+0,y+s,d];
            p1 = [x+s,y+s,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southwest --

            material = node.southwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1

            p0 = [x+b,y+b,d];
            p1 = [x+a,y+a,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southeast --

            material = node.southeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1

            p0 = [x+b,y+b,d];
            p1 = [x+c,y+a,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northeast --

            material = node.northeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1

            p0 = [x+b,y+b,d];
            p1 = [x+c,y+c,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northwest --

            material = node.northwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1

            p0 = [x+b,y+b,d];
            p1 = [x+a,y+c,d];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();
        });

    }

    drawGizmoXZ() {
        const grid = this.actor;
        const s = grid.gridScale;
        const a = 0.25*grid.gridScale;
        const b = 0.5*grid.gridScale;
        const c = 0.75*grid.gridScale;
        let d = 0.1
        const x0 = 0;
        const y0 = 0;

        let material;
        let geometry
        let p0
        let p1;
        let line;

        grid.navNodes.forEach( node => {

            const x = x0 + s*node.xy[0];
            const y = y0 + s*node.xy[1];

            // -- west --

            material = node.west ? this.yellowMaterial : this.redMaterial;
            d = node.west ? 0.1 : 0.2;

            p0 = [x,d,y+0];
            p1 = [x+0,d,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- south --

            material = node.south ? this.yellowMaterial : this.redMaterial;
            d = node.south ? 0.1 : 0.2;

            p0 = [x+0,d,y+0];
            p1 = [x+s,d,y+0];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- east --

            material = node.east ? this.yellowMaterial : this.redMaterial;
            d = node.east ? 0.1 : 0.2;

            p0 = [x+s,d,y+0];
            p1 = [x+s,d,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- north --

            material = node.north ? this.yellowMaterial : this.redMaterial;
            d = node.north ? 0.1 : 0.2;

            p0 = [x+0,d,y+s];
            p1 = [x+s,d,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southwest --

            material = node.southwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [x+b,d,y+b];
            p1 = [x+a,d,y+a];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southeast --

            material = node.southeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [x+b,d,y+b];
            p1 = [x+c,d,y+a];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northeast --

            material = node.northeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [x+b,d,y+b];
            p1 = [x+c,d,y+c];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northwest --

            material = node.northwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [x+b,d,y+b];
            p1 = [x+a,d,y+c];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();
        });
    }

    drawGizmoYZ() {
        const grid = this.actor;
        const s = grid.gridScale;
        const a = 0.25*grid.gridScale;
        const b = 0.5*grid.gridScale;
        const c = 0.75*grid.gridScale;
        let d = 0.1
        const x0 = 0;
        const y0 = 0;

        let material;
        let geometry
        let p0
        let p1;
        let line;

        grid.navNodes.forEach( node => {

            const x = x0 + s*node.xy[0];
            const y = y0 + s*node.xy[1];

            // -- west --

            material = node.west ? this.yellowMaterial : this.redMaterial;
            d = node.west ? 0.1 : 0.2;

            p0 = [d,x,y+0];
            p1 = [d,x+0,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- south --

            material = node.south ? this.yellowMaterial : this.redMaterial;
            d = node.south ? 0.1 : 0.2;

            p0 = [d,x+0,y+0];
            p1 = [d,x+s,y+0];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- east --

            material = node.east ? this.yellowMaterial : this.redMaterial;
            d = node.east ? 0.1 : 0.2;

            p0 = [d,x+s,y+0];
            p1 = [d,x+s,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- north --

            material = node.north ? this.yellowMaterial : this.redMaterial;
            d = node.north ? 0.1 : 0.2;

            p0 = [d,x+0,y+s];
            p1 = [d,x+s,y+s];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southwest --

            material = node.southwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [d,x+b,y+b];
            p1 = [d,x+a,y+a];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- southeast --

            material = node.southeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [d,x+b,y+b];
            p1 = [d,x+c,y+a];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northeast --

            material = node.northeast ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [d,x+b,y+b];
            p1 = [d,x+c,y+c];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();

            // -- northwest --

            material = node.northwest ? this.cyanMaterial : this.redMaterial;
            d = 0.1;

            p0 = [d,x+b,y+b];
            p1 = [d,x+a,y+c];
            geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...p0),
                new THREE.Vector3(...p1)
            ]);
            line = new THREE.Line( geometry, material );
            this.gizmo.add(line);
            geometry.dispose();
        });
    }

    drawPathGizmo(path) {
        const rm = this.service("ThreeRenderManager");
        if (this.pathGizmo) rm.scene.remove(this.pathGizmo);

        switch (this.actor.gridPlane) {
            default:
            case 0: this.drawPathXZ(path); break;
            case 1: this.drawPathXY(path); break;
            case 2: this.drawPathYZ(path); break;
        }

        rm.scene.add(this.pathGizmo);
    }

    drawPathXZ(path) {
        const grid = this.actor;
        const points = [];

        path.forEach(key=> {
            const xy = unpackKey(key);
            const x = (xy[0] + 0.5) * grid.gridScale;
            const y = (xy[1] + 0.5) * grid.gridScale;
            const p = [x,0.15,y]
            points.push(new THREE.Vector3(...p));
        })

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.pathGizmo = new THREE.Line(geometry, this.magentaMaterial);
        geometry.dispose();
    }

    drawPathXY(path) {
        const grid = this.actor;
        const points = [];

        path.forEach(key=> {
            const xy = unpackKey(key);
            const x = (xy[0] + 0.5) * grid.gridScale;
            const y = (xy[1] + 0.5) * grid.gridScale;
            const p = [x,y,0.15]
            points.push(new THREE.Vector3(...p));
        })

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.pathGizmo = new THREE.Line(geometry, this.magentaMaterial);
        geometry.dispose();
    }

        drawPathYZ(path) {
        const grid = this.actor;
        const points = [];

        path.forEach(key=> {
            const xy = unpackKey(key);
            const x = (xy[0] + 0.5) * grid.gridScale;
            const y = (xy[1] + 0.5) * grid.gridScale;
            const p = [0.15, x,y]
            points.push(new THREE.Vector3(...p));
        })

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.pathGizmo = new THREE.Line(geometry, this.magentaMaterial);
        geometry.dispose();
    }

}

function unpackKey(key) {
    return [(key>>>14) & 0x3FFF,key & 0x3FFF];
}