import {THREE} from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Three ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class MeshBuilder {
    constructor(material) {
        this.material = material;
        this.clear();
    }

    clear() {
        this.vertices = [];
        this.colors = [];
        this.uvs = [];
    }

    build(material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( this.vertices, 3 ) );
        geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( this.colors, 3) );
        geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( this.uvs, 2) );
        geometry.computeVertexNormals();
        this.clear();
        return new THREE.Mesh( geometry, material );
    }

    addFace(vertices, uvs, color) {
        const triCount = vertices.length - 2


        for (let i = 0; i < triCount; i++) {

            //-- Vertex A--

            this.vertices.push(...vertices[0]);
            this.colors.push(...color);
            this.uvs.push(...uvs[0]);

            // //-- Vertex B --

            this.vertices.push(...vertices[i+1]);
            this.colors.push(...color);
            this.uvs.push(...uvs[i+1]);

            // //-- Vertex C --

            this.vertices.push(...vertices[i+2]);
            this.colors.push(...color);
            this.uvs.push(...uvs[i+2]);
        }
    }
}
