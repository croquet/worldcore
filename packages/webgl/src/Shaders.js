import { Shader, TextureTable } from "./Render";
// import { m2_rotation, TAU, toRad } from "./Vector";
import { m2_rotation, TAU, toRad  } from "@croquet/worldcore-kernel";

// Standard Universals
//
// * uMeshMatrix            Transform mesh vertices into world space
// * uNormalMatrix          Transform mesh normals into world space
//
// * uViewMatrix            Transform vertices from world to view space
// * uViewNormalMatrix      Transform normals from world to view space
// * uProjectionMatrix      Transform vertices from view to screen space
// * uCameraMatrix          Transform vertices from world to screen space (combines uViewMatrix & uProjectionMatrix)

// * uMeshToViewMatrix      Transform mesh vertices into view space (combines uMeshMatrix & uViewMatrix)
// * uNormalToViewMatrix    Transfrom mesh normals into view space (combines uNormalMatrix & uViewNormalMatrix)
// * uMeshToScreenMatrix    Transform mesh vertices into screen space (combines uMeshMatrix & uViewMatrix & uProjectionMatrix)

//------------------------------------------------------------------------------------------
//-- BasicShader ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Forward rendering using textures + ambient and one directional light. This is the same
// as the ambient output of the GeometryShader.

export class BasicShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec3 aNormal;
            in vec4 aColor;
            in vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;
            uniform mat4 uNormalMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            out lowp vec2 vCoordinate;
            out lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uMeshToScreenMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);
                vCoordinate = aCoordinate;
                vLighting = aColor.rgb * (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                gl_Position = position;
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec3 vLighting;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            out lowp vec4 color;

            void main() {
                color = vec4(texture(uSampler0, vCoordinate).rgb * vLighting,1);
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;
            uniform mat4 uNormalMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uMeshToScreenMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);
                vCoordinate = aCoordinate;
                vLighting = aColor.rgb * (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                gl_Position = position;
            }
        `;

        const fSource = `
            varying lowp vec3 vLighting;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            void main() {
                gl_FragColor = vec4(texture2D(uSampler0, vCoordinate).rgb * vLighting,1);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}

//------------------------------------------------------------------------------------------
//-- InstancedShader ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Forward rendering using textures + ambient and one directional light. This is the same
// as the ambient output of the GeometryShader.

export class InstancedShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec3 aNormal;
            in vec4 aColor;
            in vec2 aCoordinate;
            in mat4 aMeshMatrix;
            in mat4 aNormalMatrix;

            uniform mat4 uCameraMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            out lowp vec2 vCoordinate;
            out lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uCameraMatrix * aMeshMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);
                vCoordinate = aCoordinate;
                vLighting = aColor.rgb * (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                gl_Position = position;
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec3 vLighting;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            out lowp vec4 color;

            void main() {
                color = vec4(texture(uSampler0, vCoordinate).rgb * vLighting,1);
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;
            attribute mat4 aMeshMatrix;
            attribute mat4 aNormalMatrix;

            uniform mat4 uCameraMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uCameraMatrix * aMeshMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);
                vCoordinate = aCoordinate;
                vLighting = aColor.rgb * (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                gl_Position = position;
            }
        `;

        const fSource = `
            varying lowp vec3 vLighting;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            void main() {
                gl_FragColor = vec4(texture2D(uSampler0, vCoordinate).rgb * vLighting,1);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}

//------------------------------------------------------------------------------------------
//-- TranslucentShader ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No lighting, just application of the color of the triangles with appropriate blend set.

export class TranslucentShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec4 aColor;
            in vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;

            out lowp vec4 vColor;
            out lowp vec2 vCoordinate;

            void main() {
                vColor = aColor;
                vCoordinate = aCoordinate;
                gl_Position = uMeshToScreenMatrix * vec4(aVertex,1);
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec4 vColor;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            out lowp vec4 color;

            void main() {
                color = texture(uSampler0, vCoordinate) * vColor;
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;

            varying lowp vec2 vCoordinate;
            varying lowp vec4 vColor;

            void main() {
                vColor = aColor;
                vCoordinate = aCoordinate;
                gl_Position = uMeshToScreenMatrix * vec4(aVertex,1);
            }
        `;

        const fSource = `

            varying lowp vec4 vColor;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            void main() {
                gl_FragColor = texture2D(uSampler0, vCoordinate) * vColor;
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

    apply() {
        super.apply();
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.depthMask(false);
        this.gl.polygonOffset(-1, 0);
    }

}


//------------------------------------------------------------------------------------------
//-- DecalShader ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Like the basic shader, but it also includes an optional decal texture.

export class DecalShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec3 aNormal;
            in vec4 aColor;
            in vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;
            uniform mat4 uNormalMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            out lowp vec3 vColor;
            out lowp vec2 vCoordinate;
            out lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uMeshToScreenMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);
                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vLighting = uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim);
                gl_Position = position;
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec3 vColor;
            in lowp vec3 vLighting;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            out lowp vec4 color;

            void main() {
                lowp vec3 t0 = texture(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                color = vec4(tt * vLighting,1);
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;

            uniform mat4 uNormalMatrix;
            uniform mat4 uMeshToScreenMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uMeshToScreenMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);
                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vLighting = uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim);
                gl_Position = position;
            }
        `;

        const fSource = `
            varying lowp vec3 vColor;
            varying lowp vec3 vLighting;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            void main() {
                lowp vec3 t0 = texture2D(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture2D(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                gl_FragColor = vec4(tt*vLighting,1);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}

//------------------------------------------------------------------------------------------
//-- InstancedDecalShader ------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Like the basic shader, but it also includes an optional decal texture.

export class InstancedDecalShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec3 aNormal;
            in vec4 aColor;
            in vec2 aCoordinate;
            in mat4 aMeshMatrix;
            in mat4 aNormalMatrix;

            uniform mat4 uCameraMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            out lowp vec3 vColor;
            out lowp vec2 vCoordinate;
            out lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uCameraMatrix * aMeshMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);
                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vLighting = uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim);
                gl_Position = position;
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec3 vColor;
            in lowp vec3 vLighting;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            out lowp vec4 color;

            void main() {
                lowp vec3 t0 = texture(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                color = vec4(tt * vLighting,1);
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;
            attribute mat4 aMeshMatrix;
            attribute mat4 aNormalMatrix;

            uniform mat4 uCameraMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;

            void main() {
                lowp vec4 position = uCameraMatrix * aMeshMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);
                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vLighting = uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim);
                gl_Position = position;
            }
        `;

        const fSource = `
            varying lowp vec3 vColor;
            varying lowp vec3 vLighting;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            void main() {
                lowp vec3 t0 = texture2D(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture2D(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                gl_FragColor = vec4(tt*vLighting,1);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}


//------------------------------------------------------------------------------------------
//-- GeometryShader ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// First pass in deferred lighting pipeline. Renders the diffuse scene, plus buffers containing
// normal and position data. Only use this if you're rendering into a GeometryBuffer.

export class GeometryShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
        in vec3 aVertex;
        in vec3 aNormal;
        in vec4 aColor;
        in vec2 aCoordinate;

        uniform mat4 uMeshToViewMatrix;
        uniform mat4 uNormalMatrix;
        uniform mat4 uViewNormalMatrix;
        uniform mat4 uProjectionMatrix;

        uniform vec3 uAmbientColor;
        uniform vec3 uDirectionalColor;
        uniform vec3 uDirectionalAim;

        out lowp vec3 vColor;
        out lowp vec2 vCoordinate;
        out lowp vec3 vLighting;
        out lowp vec3 vNormal;
        out lowp vec3 vPosition;

        void main() {

            lowp vec4 position = uMeshToViewMatrix * vec4(aVertex,1);
            lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);

            vColor = aColor.rgb;
            vCoordinate = aCoordinate;
            vNormal = (uViewNormalMatrix * vec4(normal,1)).xyz;
            vLighting = (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
            vPosition = position.xyz / position.w;

            gl_Position = uProjectionMatrix * position;
        }
    `;

    const fSource2 = `#version 300 es

        in lowp vec3 vColor;
        in lowp vec2 vCoordinate;
        in lowp vec3 vLighting;
        in lowp vec3 vNormal;
        in lowp vec3 vPosition;

        uniform sampler2D uSampler0;
        uniform sampler2D uSampler1;

        layout(location = 0) out lowp vec4 color0;
        layout(location = 1) out lowp vec4 color1;
        layout(location = 2) out lowp vec4 color2;

        void main() {
            lowp vec3 t0 = texture(uSampler0, vCoordinate).rgb * vColor;
            lowp vec4 t1 = texture(uSampler1, vCoordinate);
            lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
            color0 = vec4(tt * vLighting,1);
            color1 = vec4(vNormal,1.0);
            color2 = vec4(vPosition,1.0);
        }
    `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;

            uniform mat4 uMeshToViewMatrix;
            uniform mat4 uNormalMatrix;
            uniform mat4 uViewNormalMatrix;
            uniform mat4 uProjectionMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;
            varying lowp vec3 vNormal;
            varying lowp vec3 vPosition;

            void main() {
                lowp vec4 position = uMeshToViewMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((uNormalMatrix * vec4(aNormal,1)).xyz);

                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vNormal = (uViewNormalMatrix * vec4(normal,1)).xyz;
                vLighting = (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                vPosition = position.xyz / position.w;

                gl_Position = uProjectionMatrix * position;
            }
        `;

        const fSource = `
            #extension GL_EXT_draw_buffers : require

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;
            varying lowp vec3 vNormal;
            varying lowp vec3 vPosition;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            void main() {
                lowp vec3 t0 = texture2D(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture2D(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                gl_FragData[0] = vec4(tt * vLighting,1);
                gl_FragData[1] = vec4(vNormal,1.0);
                gl_FragData[2] = vec4(vPosition,1.0);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}

//------------------------------------------------------------------------------------------
//-- InstancedGeometryShader ---------------------------------------------------------------
//------------------------------------------------------------------------------------------

// First pass in deferred lighting pipeline. Renders the diffuse scene, plus buffers containing
// normal and position data. Only use this if you're rendering into a GeometryBuffer.

export class InstancedGeometryShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
        in vec3 aVertex;
        in vec3 aNormal;
        in vec4 aColor;
        in vec2 aCoordinate;
        in mat4 aMeshMatrix;
        in mat4 aNormalMatrix;

        uniform mat4 uViewMatrix;
        uniform mat4 uViewNormalMatrix;
        uniform mat4 uProjectionMatrix;

        uniform vec3 uAmbientColor;
        uniform vec3 uDirectionalColor;
        uniform vec3 uDirectionalAim;

        out lowp vec3 vColor;
        out lowp vec2 vCoordinate;
        out lowp vec3 vLighting;
        out lowp vec3 vNormal;
        out lowp vec3 vPosition;

        void main() {

            lowp vec4 position = uViewMatrix * aMeshMatrix * vec4(aVertex,1);
            lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);

            vColor = aColor.rgb;
            vCoordinate = aCoordinate;
            vNormal = (uViewNormalMatrix * vec4(normal,1)).xyz;
            vLighting = (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
            vPosition = position.xyz / position.w;

            gl_Position = uProjectionMatrix * position;
        }
    `;

    const fSource2 = `#version 300 es

        in lowp vec3 vColor;
        in lowp vec2 vCoordinate;
        in lowp vec3 vLighting;
        in lowp vec3 vNormal;
        in lowp vec3 vPosition;

        uniform sampler2D uSampler0;
        uniform sampler2D uSampler1;

        layout(location = 0) out lowp vec4 color0;
        layout(location = 1) out lowp vec4 color1;
        layout(location = 2) out lowp vec4 color2;

        void main() {
            lowp vec3 t0 = texture(uSampler0, vCoordinate).rgb * vColor;
            lowp vec4 t1 = texture(uSampler1, vCoordinate);
            lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
            color0 = vec4(tt * vLighting,1);
            color1 = vec4(vNormal,1.0);
            color2 = vec4(vPosition,1.0);
        }
    `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;
            attribute mat4 aMeshMatrix;
            attribute mat4 aNormalMatrix;

            uniform mat4 uViewMatrix;
            uniform mat4 uViewNormalMatrix;
            uniform mat4 uProjectionMatrix;

            uniform vec3 uAmbientColor;
            uniform vec3 uDirectionalColor;
            uniform vec3 uDirectionalAim;

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;
            varying lowp vec3 vNormal;
            varying lowp vec3 vPosition;

            void main() {
                lowp vec4 position = uViewMatrix * aMeshMatrix * vec4(aVertex,1);
                lowp vec3 normal = normalize((aNormalMatrix * vec4(aNormal,1)).xyz);

                vColor = aColor.rgb;
                vCoordinate = aCoordinate;
                vNormal = (uViewNormalMatrix * vec4(normal,1)).xyz;
                vLighting = (uAmbientColor + uDirectionalColor * dot(normal, uDirectionalAim));
                vPosition = position.xyz / position.w;

                gl_Position = uProjectionMatrix * position;
            }
        `;

        const fSource = `
            #extension GL_EXT_draw_buffers : require

            varying lowp vec3 vColor;
            varying lowp vec2 vCoordinate;
            varying lowp vec3 vLighting;
            varying lowp vec3 vNormal;
            varying lowp vec3 vPosition;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            void main() {
                lowp vec3 t0 = texture2D(uSampler0, vCoordinate).rgb * vColor;
                lowp vec4 t1 = texture2D(uSampler1, vCoordinate);
                lowp vec3 tt = ((1.0-t1.a)*t0) + (t1.a*t1.rgb);
                gl_FragData[0] = vec4(tt * vLighting,1);
                gl_FragData[1] = vec4(vNormal,1.0);
                gl_FragData[2] = vec4(vPosition,1.0);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}

//------------------------------------------------------------------------------------------
//-- TranslucentGeometryShader -------------------------------------------------------------
//------------------------------------------------------------------------------------------

// No lighting, just application of the color of the triangles with appropriate blend set.
// Leaves the other parts of the geometry buffer unchanged.

export class TranslucentGeometryShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;
            in vec4 aColor;
            in vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;

            out lowp vec4 vColor;
            out lowp vec2 vCoordinate;

            void main() {
                vColor = aColor;
                vCoordinate = aCoordinate;
                gl_Position = uMeshToScreenMatrix * vec4(aVertex,1);
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec4 vColor;
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            layout(location = 0) out lowp vec4 color0;
            layout(location = 1) out lowp vec4 color1;
            layout(location = 2) out lowp vec4 color2;

            void main() {
                color0 = texture(uSampler0, vCoordinate) * vColor;
                color1 = color1;
                color2 = color2;
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;
            attribute vec4 aColor;
            attribute vec2 aCoordinate;

            uniform mat4 uMeshToScreenMatrix;

            varying lowp vec2 vCoordinate;
            varying lowp vec4 vColor;

            void main() {
                vColor = aColor;
                vCoordinate = aCoordinate;
                gl_Position = uMeshToScreenMatrix * vec4(aVertex,1);
            }
        `;

        const fSource = `
            #extension GL_EXT_draw_buffers : require
            varying lowp vec4 vColor;
            varying lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            void main() {
                gl_FragData[0] = texture2D(uSampler0, vCoordinate) * vColor;
                gl_FragData[1] = gl_FragData[1];
                gl_FragData[2] = gl_FragData[2];
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

    apply() {
        super.apply();
        this.gl.enable(this.gl.BLEND);
        //this.gl.blendFunc(this.gl.ONE, this.gl.SRC_ALPHA);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        //this.gl.blendFunc(this.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        //this.gl.blendFunc(this.DEST_ALPHA, this.gl.ONE_MINUS_DEST_ALPHA);
        this.gl.depthMask(false);
        this.gl.polygonOffset(-1, 0);
    }

}

//------------------------------------------------------------------------------------------
//-- PassthruShader ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Passes the input texture unchanged to the framebuffer.

export class PassthruShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es
            in vec3 aVertex;

            out lowp vec2 vCoordinate;

            void main() {
                gl_Position = vec4(aVertex.xy, 0.0, 1.0);
                vCoordinate = (aVertex.xy + vec2(1.0)) / 2.0;
            }
        `;

        const fSource2 = `#version 300 es
            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;

            out lowp vec4 color;

            void main() {
                color = texture(uSampler0, vCoordinate);
            }
        `;

        // -- WebGL Source --

        const vSource = `
        attribute vec3 aVertex;

        varying lowp vec2 vCoordinate;

        void main() {
            gl_Position = vec4(aVertex.xy, 0.0, 1.0);
            vCoordinate = (aVertex.xy + vec2(1.0)) / 2.0;
        }
    `;

        const fSource = `
        varying lowp vec2 vCoordinate;

        uniform sampler2D uSampler0;

        void main() {
            gl_FragColor = texture2D(uSampler0, vCoordinate);
        }
    `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}


//------------------------------------------------------------------------------------------
//-- AOShader ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Given a set of geometry buffers, produces a lighting buffer with screen-space ambient
// occlusion. This uses the Alchemy AO algorithm.
//
// There are four parameters that affect the look of the ambient occusion:
//
// * Radius - Size of the sampling circle in world units.
// * Sample Count - Number of points to sample inside the circle.
// * Density - Darkness of the shadows.
// * Falloff - Exponential decrease of shadows with distance.
//
// Radius and Sample Count are set using generateKernel. Higher sample counts will yield smoother
// results but will add to compute time.

export class AOShader extends Shader {
    constructor() {
        super();

        this.radius = 1.0;
        this.count = 16;
        this.fov = toRad(60);
        this.density = 1.0;             // Darkness of shadow
        this.falloff = 1.0;             // How fast shadow fades from corner
        this.bias = 0.001;              // Distance correction factor for points perpendicular to normal
        this.epsilon = 0.0001;          // Prevents 0 divide for tiny sample vectors

        this.generateNoise();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es

            in vec3 aVertex;

            out lowp vec2 vCoordinate;

            void main() {
                gl_Position = vec4(aVertex.xy, 0.0, 1.0);
                vCoordinate = (aVertex.xy + vec2(1.0, 1.0)) / 2.0;
            }
        `;

        const fSource2 = `#version 300 es

            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;    // Normal
            uniform sampler2D uSampler1;    // Position
            uniform sampler2D uSampler2;    // Noise

            uniform highp vec2 uKernel[64];
            uniform int uKernelSize;
            uniform highp float uDensity;
            uniform highp float uFalloff;
            uniform highp float uBias;
            uniform highp float uEpsilon;
            uniform highp float uTextureWidth0;
            uniform highp float uTextureHeight0;
            uniform highp float uTextureWidth2;
            uniform highp float uTextureHeight2;

            out highp vec4 color;

            void main() {

                highp vec3 normal = texture(uSampler0, vCoordinate).xyz;
                highp vec3 centerXYZ = texture(uSampler1, vCoordinate).xyz;

                highp vec2 lookup = vec2(vCoordinate.x*(uTextureWidth0-1.0)/uTextureWidth2, vCoordinate.y*(uTextureHeight0-1.0)/uTextureHeight2);
                highp vec4 raw = texture(uSampler2, lookup);
                highp mat2 noise = mat2(raw.r, raw.g, raw.b, raw.a);

                highp float sum = 0.0;
                for (int i = 0; i < 64; i++) {
                    if (i == uKernelSize) break;
                    highp vec2 s = vCoordinate + ((uKernel[i]*noise) / -centerXYZ.z);
                    highp vec3 sampleXYZ = texture(uSampler1, s).xyz;
                    highp vec3 sampleVector = centerXYZ - sampleXYZ;
                    highp float normalDot = max(0.0, dot(sampleVector, normal) + centerXYZ.z * uBias);
                    highp float vectorDot = dot(sampleVector, sampleVector) + uEpsilon;
                    sum += (normalDot / vectorDot);
                }

                highp float occlusion = uDensity * sum / float(uKernelSize);
                highp float ao = pow(max(0.0, 1.0-occlusion), uFalloff);
                color = vec4(ao, ao, ao, 1);
            }
        `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;

            varying highp vec2 vCoordinate;

            void main() {
                gl_Position = vec4(aVertex.xy, 0.0, 1.0);
                vCoordinate = (aVertex.xy + vec2(1.0)) / 2.0;
            }
        `;

        const fSource = `
            varying highp vec2 vCoordinate;

            uniform sampler2D uSampler0;    // Normal
            uniform sampler2D uSampler1;    // Position
            uniform sampler2D uSampler2;    // Noise

            uniform lowp vec2 uKernel[64];
            uniform int uKernelSize;
            uniform lowp float uDensity;
            uniform lowp float uFalloff;
            uniform lowp float uBias;
            uniform lowp float uEpsilon;
            uniform lowp float uTextureWidth0;
            uniform lowp float uTextureHeight0;
            uniform lowp float uTextureWidth2;
            uniform lowp float uTextureHeight2;

            void main() {
                lowp vec3 normal = texture2D(uSampler0, vCoordinate).xyz;
                lowp vec3 centerXYZ = texture2D(uSampler1, vCoordinate).xyz;

                lowp vec2 lookup = vec2(vCoordinate.x*(uTextureWidth0-1.0)/uTextureWidth2, vCoordinate.y*(uTextureHeight0-1.0)/uTextureHeight2);
                lowp vec4 raw = texture2D(uSampler2, lookup);
                lowp mat2 noise = mat2(raw.r, raw.g, raw.b, raw.a);

                lowp float sum = 0.0;
                for (int i = 0; i < 64; i++) {
                    if (i == uKernelSize) break;
                    lowp vec2 sample = vCoordinate + (uKernel[i]*noise) / -centerXYZ.z;
                    lowp vec3 sampleXYZ = texture2D(uSampler1, sample).xyz;
                    lowp vec3 sampleVector = centerXYZ - sampleXYZ;
                    lowp float normalDot = max(0.0, dot(sampleVector, normal) + centerXYZ.z * uBias);
                    lowp float vectorDot = dot(sampleVector, sampleVector) + uEpsilon;
                    sum += normalDot / vectorDot;
                }
                lowp float occlusion = uDensity * sum / float(uKernelSize);
                lowp float ao = pow(max(0.0, 1.0-occlusion), uFalloff);

                gl_FragColor = vec4(ao, ao, ao, 1);

            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

    destroy() {
        super.destroy();
        if (this.noise) this.noise.destroy();
    }

    apply() {
        super.apply();
        if (this.noise) this.noise.apply(2);
        if (!this.kernel) this.generateKernel();
        this.setUniform("uKernel", this.kernel);
        this.setUniform("uKernelSize", this.kernel.length);
        this.setUniform("uDensity", this.density);
        this.setUniform("uFalloff", this.falloff);
        this.setUniform("uBias", this.bias);
        this.setUniform("uEpsilon", this.epsilon);
    }

    // This creates the sampling kernel used by the ao algorithm.
    // The radius is the distance in world space coordinates to check for occluders
    // The count is the number of samples taken for each pixel. Max is 64. Big numbers will slow rendering.

    setRadius(radius = 1) {
        this.radius = radius;
        this.kernel = null;
    }

    setCount(count = 16) {
        this.count = count;
        this.kernel = null;
    }

    setFOV(fov = 60) {
        this.fov = fov;
        this.kernel = null;
    }

    generateKernel() {
        this.kernel = [];
        const r = this.radius / Math.sin(this.fov/2);
        for (let i = 0; i < this.count; i++) { // Spiral sample points using golden angle.
            const rho = r*Math.sqrt((i+1)/this.count);
            const phi = i * 2.39996322972865332;
            this.kernel.push([rho * Math.cos(phi), rho * Math.sin(phi)]);
        }
    }

    // Noise is a dithered rotation matrix that is used to perturb the sample kernel so we can get away with using
    // fewer samples.

    generateNoise() {
        const noise = [];

        noise.push(m2_rotation(0 * TAU / 15));
        noise.push(m2_rotation(8 * TAU / 15));
        noise.push(m2_rotation(2 * TAU / 15));
        noise.push(m2_rotation(10 * TAU / 15));

        noise.push(m2_rotation(12 * TAU / 15));
        noise.push(m2_rotation(4 * TAU / 15));
        noise.push(m2_rotation(14 * TAU / 15));
        noise.push(m2_rotation(6 * TAU / 15));

        noise.push(m2_rotation(3 * TAU / 15));
        noise.push(m2_rotation(11 * TAU / 15));
        noise.push(m2_rotation(1 * TAU / 15));
        noise.push(m2_rotation(9 * TAU / 15));

        noise.push(m2_rotation(15 * TAU / 15));
        noise.push(m2_rotation(7 * TAU / 15));
        noise.push(m2_rotation(13 * TAU / 15));
        noise.push(m2_rotation(5 * TAU / 15));

        this.noise = new TextureTable(4, 4, noise);
    }

}

//------------------------------------------------------------------------------------------
//-- BlendShader -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Combines two images.

export class BlendShader extends Shader {
    constructor() {
        super();

        // -- WebGL2 Source --

        const vSource2 = `#version 300 es

            in vec3 aVertex;

            out lowp vec2 vCoordinate;

            void main() {
                gl_Position = vec4(aVertex.xy, 0.0, 1.0);
                vCoordinate = (aVertex.xy + vec2(1.0)) / 2.0;
            }
        `;

        const fSource2 = `#version 300 es

            in lowp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            out lowp vec4 color;

            void main() {
                color = texture(uSampler0, vCoordinate) * texture(uSampler1, vCoordinate);
            }
    `;

        // -- WebGL Source --

        const vSource = `
            attribute vec3 aVertex;

            varying lowp vec2 vCoordinate;

            void main() {
                gl_Position = vec4(aVertex.xy, 0.0, 1.0);
                vCoordinate = (aVertex.xy + vec2(1.0)) / 2.0;
            }
        `;

        const fSource = `
            varying highp vec2 vCoordinate;

            uniform sampler2D uSampler0;
            uniform sampler2D uSampler1;

            void main() {
                gl_FragColor = texture2D(uSampler0, vCoordinate) * texture2D(uSampler1, vCoordinate);
            }
        `;

        this.build(vSource, fSource, vSource2, fSource2);
    }

}
