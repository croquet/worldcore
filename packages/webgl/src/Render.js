import { View, LoadImage, m4_identity, m4_invert, m4_perspective, m4_transpose, v3_transform, v3_sub, v3_normalize, v3_cross, m4_multiply, v4_transform, v3_scale, m4_getTranslation, TAU, v2_rotate, m4_toNormal4, v3_multiply, toRad, viewRoot  } from "@croquet/worldcore-kernel";
// import { LoadImage } from "./ViewAssetCache";
// import { m4_identity, m4_invert, m4_perspective, m4_transpose, v3_transform, v3_sub, v3_normalize, v3_cross, m4_multiply, v4_transform, v3_scale, m4_getTranslation, TAU, v2_rotate, m4_toNormal4, v3_multiply, toRad } from "./Vector";
// import { viewRoot } from "./Root";

//------------------------------------------------------------------------------------------
// Rendering Globals
//------------------------------------------------------------------------------------------

let gl;
let glVersion = 0;      // 0 = Basic WebGL, 1 = WebGL + Extensions, 2 = WebGL2
let glAttributes = 0;   // Needs to be at least 16 for instanced rendering
let glShader;           // The current shader that we're using.
let glCamera;           // The current camera that we're using.
let glPipeline;

//-- Necessary WebGL 1.0 extensions

let instancedArraysExt;
let drawBuffersExt;
let depthTextureExt;
let textureFloatExt;
let textureFloatLinearExt;

//-- Necessary WebGL 2.0 extensions

let colorBufferFloatExt;

//-- Global access functions

// export function GetGL() {
//     return gl;
// }

export function GetGLVersion() {
    return glVersion;
}

export function SetGLCamera(camera) {
    glCamera = camera;
}

export function SetGLPipeline(pipeline) {
    glPipeline = pipeline;
}

//------------------------------------------------------------------------------------------
//-- RenderTarget --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Generic base class for any object that can be rendered into. This includes things like the
// main display, or a gbuffer, or a texture framebuffer.
//
// You can set the width and height directly in the parameters, or set autoResize to make it
// track the size of the main display. (AutoResize takes a scaling factor as its value, so
// you can create render targets with the same aspect ratio as the main display but smaller.)
//
// RenderTarget also creates a default camera.
//
// You can call draw directly on a RenderTarget without creating any geometry primitives.
// It will automatically create a single quad to trigger the render. This
// is handy if you're using passthru shaders that don't have a vector component.

class RenderTarget {
    constructor(parameters = {width: 1, height: 1}) {
        this.parameters = parameters;
        this.background = [0.5, 0.5, 0.5, 1];
        this.scale = 1;
        if (parameters.width) this.width = parameters.width;
        if (parameters.height) this.height = parameters.height;
        if (parameters.autoResize) {
            this.scale = parameters.autoResize;
            const model = viewRoot.model;
            this.view = new View(model);
            this.view.subscribe("input", "resize", () => this.resizeToWindow());
        }
    }

    destroy() {
        if (this.quad) this.quad.destroy();
        if (this.view) this.view.detach();
    }

    setBackground(background) {
        this.background = background;
    }

    resizeToWindow() {
        this.width = window.innerWidth * this.scale;
        this.height = window.innerHeight * this.scale;
        this.buildBuffers();
        this.updateCameraAspect();
    }

    buildBuffers() {}

    setCamera(camera) {
        this.camera = camera;
        this.updateCameraAspect();
    }

    updateCameraAspect() {
        if (this.camera) this.camera.setAspect(this.width, this.height);
    }

    start() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.setup();
    }

    setup() {
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(...this.background);
        gl.clearDepth(1.0);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.POLYGON_OFFSET_FILL); // Allows line primitives to draw in front of triangles
        gl.polygonOffset(1, 0);
    }

    // Creates a viewport-filling quad so you can call draw even without a triangle list
    // (This can be used for passthru shaders)
    draw() {
        if (!this.quad) {
            this.quad = new Triangles(); // Fullscreen quad passthru rendering
            this.quad.addFace([[-1,-1,0], [1,-1,0], [1,1,0], [-1,1,0]]);
            this.quad.load();
            this.quad.clear();
        }
        this.quad.draw();
    }
}

//------------------------------------------------------------------------------------------
//-- MainDisplay ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The MainDisplay creates a canvas element and adds it to the current document. It then
// checks to see which version of WebGL it can run. The three options are:
//
// 0: Vanilla WebGL with no extensions.
// 1: WebGL plus every extension this library uses.
// 2: WebGL2
//
// Creating a MainDisplay is what starts up WegGL, so do it first.

export class MainDisplay extends RenderTarget {
    constructor() {
        super({autoResize: 1.0}); // The main display always autoresizes to match the window

        this.canvas = document.createElement("canvas");
        this.canvas.id = "GLCanvas";
        this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
        document.body.insertBefore(this.canvas, null);
        this.setVersion();
        this.getAttributeCount();
        console.log("GL Version: " + glVersion);
        console.log("GL Max Attributes: " + glAttributes);
        if (glAttributes < 16) console.log("Warning -- too few GL attributes to support instanced rendering!");

        this.resizeToWindow();
    }

    destroy() {
        super.destroy();
        this.canvas.remove();
    }

    buildBuffers() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setVersion() {
        glVersion = 0;
        gl = this.canvas.getContext('webgl2', { antialias: true });
        // gl = canvas.getContext('webgl',
        //          { antialias: true });
        if (gl) {
            glVersion = 2;
            // If the device has webgl2 but not the color float texture extension, deferring lighting will break.
            // Thankfully this doesn't seem to be common. But there might need to be more error handling here.
            colorBufferFloatExt = gl.getExtension('EXT_color_buffer_float');
            if (!colorBufferFloatExt) console.log("WebGL2 without color float textures!");
            return;
        }

        gl = this.canvas.getContext('webgl');

        // We SHOULD be able to support WebGL 1 with extensions so we can get pretty rendering on Macs, however there's
        // currently a bug in the float textures that breaks 1+ rendering. Rather than spending time tracking it down
        // now, I'm commenting out the extension checks to force everything to vanilla webGL 1. 2/10/20

        // There's a bunch of WebGL 1 extension code scattered thru the renderer that mostly works. However, depending on
        // how long its been since its been commented out, you should probably check it all to make sure it hasn't
        // succumbed to rot ... .

        // instancedArraysExt = gl.getExtension('ANGLE_instanced_arrays');
        // drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');
        // depthTextureExt =gl.getExtension('WEBGL_depth_texture');
        // textureFloatExt = gl.getExtension('OES_texture_float');
        // textureFloatLinearExt = gl.getExtension('ANGLE_instanced_arrays');

        // const hasExtensions = instancedArraysExt && drawBuffersExt && depthTextureExt && textureFloatExt && textureFloatLinearExt;
        // if (hasExtensions) glVersion = 1;

    }

    getAttributeCount() {
        glAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    }

}

//------------------------------------------------------------------------------------------
//-- GeometryBuffer ------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A render target that combines four buffers:
//
// * diffuse -- The scene rendered with only ambient light + one directional light.
// * normal -- The scene normals in view space.
// * position -- The surface positions in view space.
// * depthStencil -- A combination depth and stencil buffer.
//
// Generally this buffer is rendered using a GeometryShader as the first stage in a
// deferred lighting pipeline.

export class GeometryBuffer extends RenderTarget {

    constructor(parameters) {
        super(parameters);
        if (glVersion === 0) { console.log("This device does not support geometry buffers!"); return; }

        this.fb = gl.createFramebuffer();

        if (parameters.width) this.width = parameters.width;
        if (parameters.height) this.width = parameters.height;
        if (parameters.autoResize) {
            this.width = window.innerWidth * this.scale;
            this.height = window.innerHeight * this.scale;
        }

        this.fb = gl.createFramebuffer();
        this.buildBuffers();
        this.updateCameraAspect();
    }

    buildBuffers() {
        if (this.diffuse) this.diffuse.destroy();
        if (this.normal) this.normal.destroy();
        if (this.position) this.position.destroy();
        if (this.depthStencil) this.depthStencil.destroy();

        this.diffuse = new FloatTexture(this.width, this.height);
        this.normal = new FloatTexture(this.width, this.height);
        this.position = new FloatTexture(this.width, this.height);
        this.depthStencil = new DepthStencilBuffer(this.width, this.height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

        if (glVersion === 1) { // Different syntax for WebGL and WebGL2
            gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExt.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.diffuse.texture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExt.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.normal.texture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExt.COLOR_ATTACHMENT2_WEBGL, gl.TEXTURE_2D, this.position.texture, 0);
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.diffuse.texture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.normal.texture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.position.texture, 0);
        }
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.depthStencil.buffer);
    }

    destroy() {
        super.destroy();
        gl.deleteFramebuffer(this.fb);
        this.diffuse.destroy();
        this.normal.destroy();
        this.position.destroy();
        this.depthStencil.destroy();
    }

    start() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        if (glVersion === 1) { // Different syntax for WebGL and WebGL2
            drawBuffersExt.drawBuffersWEBGL([
                drawBuffersExt.COLOR_ATTACHMENT0_WEBGL,   // diffuse lighting
                drawBuffersExt.COLOR_ATTACHMENT1_WEBGL,   // normals
                drawBuffersExt.COLOR_ATTACHMENT2_WEBGL    // positions
                ]);
        } else {
              gl.drawBuffers([
                gl.COLOR_ATTACHMENT0,   // diffuse lighting
                gl.COLOR_ATTACHMENT1,   // normals
                gl.COLOR_ATTACHMENT2    // positions
              ]);
        }

        this.setup();
    }
}

//------------------------------------------------------------------------------------------
//-- Framebuffer ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A render target that has only a destination texture but no depth buffer. Generally this is
// used for intemediate rendering stages in the pipeline.

export class Framebuffer extends RenderTarget {
    constructor(parameters) {
        super(parameters);

        this.fb = gl.createFramebuffer();
        if (parameters.width) this.width = parameters.width;
        if (parameters.height) this.width = parameters.height;
        if (parameters.autoResize) {
            this.width = window.innerWidth * this.scale;
            this.height = window.innerHeight * this.scale;
        }
        this.buildBuffers();
        this.updateCameraAspect();
    }

    buildBuffers() {
        if (this.texture) this.texture.destroy();
        this.texture = new Texture(this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture.texture, 0);
    }

    destroy() {
        super.destroy();
        gl.deleteFramebuffer(this.fb);
        this.texture.destroy();
    }

    start() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        this.setup();
    }

}

//------------------------------------------------------------------------------------------
//-- SharedStencilFramebuffer --------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A special type of framebuffer that shares a depthStencil buffer with another render target
// You initialize it by passing it the pointer to the other render target. Note:
//
// * It will be the same size as the other render target
// * It does not destroy the stencil buffer on destruction
//
// This allows letter stages of the deferred lighting pipeline to use the stencil created by
// the geometry buffer.

export class SharedStencilFramebuffer extends Framebuffer {
    constructor(owner) {
        super(owner.parameters);
        this.owner = owner;
        this.buildBuffers();
    }

    buildBuffers() {
        super.buildBuffers();
        if (!this.owner) return;
        this.depthStencil = this.owner.depthStencil;
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.depthStencil.buffer);
    }
}

//------------------------------------------------------------------------------------------
//-- Texture -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Basic 2D texture. It can be loaded from a source image, or used as a render target.
// If you load from a power of 2 image, it will generate mips and set the parameters so it will tile.

export class Texture {

    constructor(width = 1, height = 1) {
        this.texture = gl.createTexture();
        this.width = width;
        this.height = height;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    destroy() {
        gl.deleteTexture(this.texture);
    }

    loadFromURL(url) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
        const cached = LoadImage(url, image => this.loadImage(image));
        if (cached) this.loadImage(cached);
    }

    loadFromByteArray(width, height, array) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, array);
        this.width = width;
        this.height = height;
        if (this.isPowerOfTwo) { // Generate MIPs
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else { // Display options are restricted in WebGL for non-power-of-two textures
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
    }

    loadImage(image) {
        if (!gl.isTexture(this.texture)) return; // In case texture is destroyed while we're waiting for it to load.
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.width = image.width;
        this.height = image.height;
        if (this.isPowerOfTwo) { // Generate MIPs
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else { // Display options are restricted in WebGL for non-power-of-two textures
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
    }

    apply(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        glShader.setUniform("uSampler" + unit, unit);
        glShader.setUniform("uTextureWidth" + unit, this.width);
        glShader.setUniform("uTextureHeight" + unit, this.height);
    }

    get isPowerOfTwo() {
        return !(this.width & (this.width-1)) && !(this.height & (this.height-1));
    }

}

//------------------------------------------------------------------------------------------
//-- DepthStencilBuffer --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Creates a buffer that will store both depth and stencil information.

export class DepthStencilBuffer {
    constructor(width = 1, height = 1) {
        if (glVersion === 0) { console.log("This device does not support depth buffers!"); return; }
        this.width = width;
        this.height = height;
        this.buffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.buffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
    }

    destroy() {
        gl.deleteRenderbuffer(this.buffer);
    }

}

//------------------------------------------------------------------------------------------
//-- DepthTexture --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Stores depth information as a texture if you want to read from it later.
// Only use the red channel of the texture to access the depth information.

export class DepthTexture {
    constructor(width = 1, height = 1) {
        if (glVersion === 0) { console.log("This device does not support depth textures!"); return; }
        this.texture = gl.createTexture();
        this.width = width;
        this.height = height;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (glVersion === 1) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    destroy() {
        gl.deleteTexture(this.texture);
    }

    apply(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        glShader.setUniform("uSampler" + unit, unit);
        glShader.setUniform("uTextureWidth" + unit, this.width);
        glShader.setUniform("uTextureHeight" + unit, this.height);
    }

}

//------------------------------------------------------------------------------------------
//-- FloatTexture --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A texture that stores RGBA values as floats instead of bytes. Used by the GeometryBuffer
// for diffuse/normal/position data.

// BUG -- There seems to be an error in Safari on Macs. They use WebGL 1 with the OEM float texture
// extension, but somehow this is throwing an error? Might be that the texture width/height is fractional
// because of the scaling used in the AO buffer? Or using the wrong enum value for the internal format?
// Needs experimentation.

export class FloatTexture {
    constructor(width = 1, height = 1) {
        if (glVersion === 0) { console.log("This device does not support float textures!"); return; }
        this.texture = gl.createTexture();
        this.width = width;
        this.height = height;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (glVersion === 1) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    destroy() {
        gl.deleteTexture(this.texture);
    }

    apply(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        glShader.setUniform("uSampler" + unit, unit);
        glShader.setUniform("uTextureWidth" + unit, this.width);
        glShader.setUniform("uTextureHeight" + unit, this.height);
    }

}

//------------------------------------------------------------------------------------------
//-- TextureTable --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A special texture for storing vector4 values as RGBA in a float texture. Unlike normal
// FloatTextures, TextureTables do not interpolate between values when sampled. Used to pass
// extra data into shaders.
//
// The source is an array of vector4: source = [[r0, g0, b0, a0], [r1, g1, b1, a1], ...]

export class TextureTable {
    constructor(width, height, source) {
        if (glVersion === 0) { console.log("This device does not support texture tables!"); return; }

        this.texture = gl.createTexture();
        this.width = width;
        this.height = height;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        if (glVersion === 1) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, new Float32Array(source.flat()));
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, new Float32Array(source.flat()));
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    destroy() {
        gl.deleteTexture(this.texture);
    }

    apply(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        glShader.setUniform("uSampler" + unit, unit);
        glShader.setUniform("uTextureWidth" + unit, this.width);
        glShader.setUniform("uTextureHeight" + unit, this.height);
    }

}

//------------------------------------------------------------------------------------------
//-- Material ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Materials are used to organize draw calls into passes. They hold configuration information
// about how meshes should be rendered.

export class Material {

    constructor() {
        this.pass = 'opaque';
        this.texture = new Texture();
        this.texture.loadFromByteArray(1,1, new Uint8Array([255, 255, 255, 255]));
        this.decal = new Texture();
        this.decal.loadFromByteArray(1,1, new Uint8Array([0, 0, 0, 0]));
        this.zOffset = 1;
    }

    destroy() {
        this.texture.destroy();
        this.decal.destroy();
    }

    apply() {
        gl.polygonOffset(this.zOffset, 0);
        this.texture.apply(0);
        this.decal.apply(1);
    }

}

//------------------------------------------------------------------------------------------
//-- Scene ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The scene holds lights and camera and lists of draw calls organized by rendering pass (opaque, translucent, etc).
// Right now the draw calls aren't sorted by material/mesh, but eventually they probably should be
// to minimize context changes.
//
// In particular, translucent draw calls need to be sorted back to front! Overlapping translucent
// polys won't render properly until that is done.

export class Scene {
    constructor() {
        this.background = [0,0,0,1];
        this.lights = new Lights();
        this.camera = new Camera();
        this.passLists = new Map();
    }

    addDrawCall(drawCall) {
        if (!this.passLists.has(drawCall.material.pass)) this.passLists.set(drawCall.material.pass, new Set());
        const passList = this.passLists.get(drawCall.material.pass);
        passList.add(drawCall);
    }

    removeDrawCall(drawCall) {
        const passList = this.passLists.get(drawCall.material.pass);
        if (!passList) return;
        passList.delete(drawCall);
    }

    drawPass(pass) {
        const passList = this.passLists.get(pass);
        if (passList) passList.forEach(call => call.draw());
    }
}

//------------------------------------------------------------------------------------------
//-- InstancedDrawCall ---------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A drawcall is just an object holding a mesh, a material and a transform.
// Don't change the material after you've added the call to a scene.
// Right now scenes don't sort draw calls beyond grouping them by pass.

export class InstancedDrawCall {
    constructor(mesh, material) {
        this.mesh = mesh;
        this.material = material;
        this.instances = new Instances();
    }

    destroy() {
        this.instances.destroy();
    }

    draw() {
        if (this.isHidden || this.instances.count === 0) return;
        if (glVersion === 0) {  // Fallback for version that doesn't support instancing
            if (this.instances.mapChanged) this.instances.rebuild();
            if (this.instances.count > 0) {
                this.material.texture.apply(0);
                this.material.decal.apply(1);
                for (let i = 0; i < this.instances.count; i++) {
                    this.instances.applyOne(i);
                    this.mesh.draw();
                }
            }
        } else if (this.instances.count > 0) {
            this.material.texture.apply(0);
            this.material.decal.apply(1);
            this.instances.apply();
            this.mesh.drawInstanced(this.instances.count);
            for (let i = 0; i < glAttributes; i++) { // Not all GL implementations automatically reset the attribute divisor.
                if (glVersion === 2) {
                    gl.vertexAttribDivisor(i,0); // Be sure to set this back to zero after you're done or it will break rendering on Android.
                } else {
                    instancedArraysExt.vertexAttribDivisorANGLE(i,0);
                }
            }
        }

    }
}

//------------------------------------------------------------------------------------------
//-- DrawCall ------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A drawcall is just an object holding a mesh, a material and a transform.
// Don't change the material after you've added the call to a scene.
// Right now scenes don't sort draw calls beyond grouping them by pass.

export class DrawCall {
    constructor(mesh, material = new Material()) {
        this.mesh = mesh;
        this.material = material;
        this.transform = new Transform();
    }

    draw() {
        if (this.isHidden) return;
        this.material.apply();
        this.transform.apply();
        this.mesh.draw();
    }
}

//------------------------------------------------------------------------------------------
//-- Transform -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds the local model transform. Lazily generates a normal transform matrix.

export class Transform {

    constructor() {
        this.meshMatrix = m4_identity();
    }

    set(m) {
        this.meshMatrix = m;
        this._normalMatrix = null;
    }

    get normalMatrix() {
        this._normalMatrix = this._normalMatrix || m4_toNormal4(this.meshMatrix);
        return this._normalMatrix;
    }

    apply() {   // Concatenates the view transform before applying

        glShader.setUniform("uMeshMatrix", this.meshMatrix);
        glShader.setUniform("uNormalMatrix", this.normalMatrix);

        if (glShader.hasUniform("uMeshToViewMatrix")) glShader.setUniform("uMeshToViewMatrix", m4_multiply(this.meshMatrix, glCamera.viewMatrix));
        if (glShader.hasUniform("uNormalToViewMatrix")) glShader.setUniform("uNormalToViewMatrix", m4_multiply(this.normalMatrix, glCamera.viewNormalMatrix));
        if (glShader.hasUniform("uMeshToScreenMatrix")) glShader.setUniform("uMeshToScreenMatrix", m4_multiply(this.meshMatrix, glCamera.w2vMatrix));
    }
}

//------------------------------------------------------------------------------------------
//-- Instances -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Instances {
    constructor() {
        this.clear();
        this.iBuffer = new GLMatrixBuffer('aMeshMatrix');
        this.nBuffer = new GLMatrixBuffer('aNormalMatrix');
    }

    destroy() {
        this.iBuffer.destroy();
        this.nBuffer.destroy();
    }

    clear() {
        this.count = 0;
        this.entries = null;
        this.matrices = [];
        this.normals = [];
    }

    set(key, m, n) {
        n = n || m4_toNormal4(m);
        if (!this.entries) this.entries = new Map();
        if (!this.entries.has(key)) this.entries.set(key, this.count++);
        const offset = 16 * this.entries.get(key);
        this.matrices.splice(offset, 16, ...m);
        this.normals.splice(offset, 16, ...n);
        this.valueChanged = true;
    }

    delete(key) {
        if (this.entries) this.entries.delete(key);
        this.mapChanged = true;
        this.valueChanged = true;
    }

    rebuild() {
        const oldEntries = this.entries;
        const oldMatrices = this.matrices;
        const oldNormals = this.normals;
        this.clear();
        oldEntries.forEach((i,key) => {
            const offset = 16 * i;
            const m = oldMatrices.slice(offset, offset + 16);
            const n = oldNormals.slice(offset, offset + 16);
            this.set(key,m,n);
        });
        this.mapChanged = false;
    }

    load() {
        if (this.mapChanged) this.rebuild();
        if (this.count > 0) {
            this.iBuffer.load(this.matrices);
            this.nBuffer.load(this.normals);
        }
        this.valueChanged = false;
    }

    apply() {
        if (this.valueChanged) this.load();
        if (this.count > 0) {
            this.iBuffer.apply();
            this.nBuffer.apply();
        }
    }

    // Fallback rountines
    //
    // These exist to let the renderer use the information in an instance buffer even if it doesn't support instancing.

    getMeshMatrix(i) {
        const offset = 16 * i;
        return this.matrices.slice(offset, offset + 16);
    }

    getNormalMatrix(i) {
        const offset = 16 * i;
        return this.normals.slice(offset, offset + 16);
    }

    applyOne(i) {
        const m = this.getMeshMatrix(i);
        const n = this.getNormalMatrix(i);
        glShader.setUniform("uMeshMatrix", m);
        glShader.setUniform("uNormalMatrix", n);

        if (glShader.hasUniform("uMeshToViewMatrix")) glShader.setUniform("uMeshToViewMatrix", m4_multiply(m, glCamera.viewMatrix));
        if (glShader.hasUniform("uNormalToViewMatrix")) glShader.setUniform("uNormalToViewMatrix", m4_multiply(n, glCamera.viewNormalMatrix));
        if (glShader.hasUniform("uMeshToScreenMatrix")) glShader.setUniform("uMeshToScreenMatrix", m4_multiply(m, glCamera.w2vMatrix));
    }

}

//------------------------------------------------------------------------------------------
//-- Mesh ----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Mesh is a base class that handles glBuffer management and common types of data
// manipulation for the different types of draw primitives

class Mesh {
    constructor(template) {
        this.clear();
        if (template) this.copy(template);
        this.vertexBuffer = new GLBuffer('aVertex');
        this.normalBuffer = new GLBuffer('aNormal');
        this.colorBuffer = new GLBuffer('aColor');
        this.coordinateBuffer = new GLBuffer('aCoordinate');
    }

    get vertexCount() { return this.vertices.length / 3;}

    destroy() {
        this.vertexBuffer.destroy();
        this.normalBuffer.destroy();
        this.colorBuffer.destroy();
        this.coordinateBuffer.destroy();
    }

    // Deletes the local buffers, but not the glBuffers.
    clear() {
        this.vertices = [];
        this.normals = [];
        this.colors = [];
        this.coordinates = [];
    }

    // Copies another mesh into this one. Does not copy the glBuffers, so you'll probably want to do a load immediately after
    copy(source) {
        this.vertices = source.vertices.slice();
        this.normals = source.normals.slice();
        this.colors = source.colors.slice();
        this.coordinates = source.coordinates.slice();
    }

    // Merges another mesh with this one. Does not merge the glBuffers, so you'll probably want to do a load immediately after
    merge(source) {
        this.vertices = this.vertices.concat(source.vertices);
        this.normals = this.normals.concat(source.normals);
        this.colors = this.colors.concat(source.colors);
        this.coordinates = this.coordinates.concat(source.coordinates);
    }

    // Transforms all the vertices and normals using a 4x4 matrix.
    transform(m4) {
        const vertices = this.vertices;
        for (let i = 0; i < this.vertices.length; i+=3) {
            const v0 = [vertices[i], vertices[i+1], vertices[i+2]];
            const v1 = v3_transform(v0,m4);
            vertices[i] = v1[0];
            vertices[i+1] = v1[1];
            vertices[i+2] = v1[2];
        }
        if (this.normals.length === 0) return;
        const nm4 = m4_toNormal4(m4);
        const normals = this.normals;
        for (let i = 0; i < this.normals.length; i+=3) {
            const n0 = [normals[i], normals[i+1], normals[i+2]];
            const n1 = v3_normalize(v3_transform(n0, nm4));
            normals[i] = n1[0];
            normals[i+1] = n1[1];
            normals[i+2] = n1[2];
        }
    }

    setColor(color) {
        this.colors = [];
        const vertexCount = this.vertexCount;
        for (let i = 0; i < vertexCount; i++) {
            this.colors.push(...color);
        }
    }

    // Loads the local buffers into the glBuffers
    load() {
        this.vertexBuffer.load(this.vertices);
        this.normalBuffer.load(this.normals);
        this.colorBuffer.load(this.colors);
        this.coordinateBuffer.load(this.coordinates);
        this.saveDrawCount();
    }

    saveDrawCount() {
        this.drawCount = this.vertices.length / 3;
    }

    apply() {
        this.vertexBuffer.apply();
        this.normalBuffer.apply();
        this.colorBuffer.apply();
        this.coordinateBuffer.apply();
    }

    findNormal(v0, v1, v2) {
        const d0 = v3_sub(v1, v0);
        const d1 = v3_sub(v2, v0);
        return v3_normalize(v3_cross(d1, d0));
    }

}

//------------------------------------------------------------------------------------------
//-- Triangles -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Triangles extends Mesh {

    draw() {
        if (this.drawCount === 0) return;
        this.apply();
        gl.drawArrays(gl.TRIANGLES, 0, this.drawCount);
    }

    drawInstanced(instanceCount) {
        if (instanceCount === 0 || this.drawCount === 0) return;
        this.apply();
        if (glVersion === 2) {
            gl.drawArraysInstanced(gl.TRIANGLES, 0, this.drawCount, instanceCount);
            // const err = gl.getError();
            // console.log("Draw Instanced " + err);
        } else {
            instancedArraysExt.drawArraysInstancedANGLE(gl.TRIANGLES, 0, this.drawCount, instanceCount);
        }
    }

    //-- Builder methods --

    // The vertices are ordered CCW around the perimeter of the face. Vertex0 is shared by all triangles in the face.
    addFace(vertices, colors, coordinates, normals) {
        const triCount = vertices.length - 2;
        if (triCount < 1) return;

        // if (!normals) {
        //     normals = [];
        //     const n = this.findNormal(vertices[0], vertices[1], vertices[2]);
        //     for (let i = 0; i < vertices.length; i++) normals.push(n);
        // }

        for (let i = 0; i < triCount; i++) {

            let n = this.findNormal(vertices[0], vertices[i+1], vertices[i+2]);

            //-- Vertex A--

            this.vertices.push(...vertices[0]);
            if (normals) { this.normals.push(...normals[0]); } else { this.normals.push(...n) };
            if (colors) this.colors.push(...colors[0]);
            if (coordinates) this.coordinates.push(...coordinates[0]);

            //-- Vertex B --

            this.vertices.push(...vertices[i+1]);
            if (normals) { this.normals.push(...normals[i+1]) } else { this.normals.push(...n) };
            if (colors) this.colors.push(...colors[i+1]);
            if (coordinates) this.coordinates.push(...coordinates[i+1]);

            //-- Vertex C --

            this.vertices.push(...vertices[i+2]);
            if (normals) { this.normals.push(...normals[i+2]) } else { this.normals.push(...n) };
            if (colors) this.colors.push(...colors[i+2]);
            if (coordinates) this.coordinates.push(...coordinates[i+2]);
        }
    }

}

//------------------------------------------------------------------------------------------
//-- Lines ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Lines extends Mesh {

    draw() {
        if (this.drawCount === 0) return;
        this.apply();
        gl.drawArrays(gl.LINES, 0, this.drawCount);
    }

    drawInstanced(instanceCount) {
        if (instanceCount === 0 || this.drawCount === 0) return;
        this.apply();
        if (glVersion === 2) {
            gl.drawArraysInstanced(gl.LINES, 0, this.drawCount, instanceCount);
        } else {
            instancedArraysExt.drawArraysInstancedANGLE(gl.LINES, 0, this.drawCount, instanceCount);
        }
    }

    saveDrawCount() {
        this.drawCount = this.vertices.length / 3;
    }

    //-- Builder methods --

    // Just a colored line with no lighting info
    addDebugLine(start, end, color) {
        this.vertices.push(...start);
        this.vertices.push(...end);
        if (color) {
            this.colors.push(...color);
            this.colors.push(...color);
        }
        this.normals.push(...[0,0,0]);
        this.normals.push(...[0,0,0]);
        this.coordinates.push(...[0,0]);
        this.coordinates.push(...[0,0]);
    }

    addLine(vertices, colors, coordinates, normals) {
        const lineCount = vertices.length-1;

        for (let i = 0; i < lineCount; i++) {

            //-- Vertex A--

            this.vertices.push(...vertices[i]);
            if (normals) this.normals.push(...normals[i]);
            if (colors) this.colors.push(...colors[i]);
            if (coordinates) this.coordinates.push(...coordinates[i]);

            //-- Vertex B --

            const b = (i+1);
            this.vertices.push(...vertices[b]);
            if (normals) this.normals.push(...normals[b]);
            if (colors) this.colors.push(...colors[b]);
            if (coordinates) this.coordinates.push(...coordinates[b]);

        }
    }

    addFace(vertices, colors, coordinates, normals) {
        const lineCount = vertices.length;
        if (lineCount < 3) return;

        if (!normals) {
            normals = [];
            const n = this.findNormal(vertices[0], vertices[1], vertices[2]);
            for (let i = 0; i < vertices.length; i++) normals.push(n);
        }

        for (let i = 0; i < lineCount; i++) {

            //-- Vertex A--

            this.vertices.push(...vertices[i]);
            if (normals) this.normals.push(...normals[i]);
            if (colors) this.colors.push(...colors[i]);
            if (coordinates) this.coordinates.push(...coordinates[i]);

            //-- Vertex B --

            const b = (i+1) % lineCount;
            this.vertices.push(...vertices[b]);
            if (normals) this.normals.push(...normals[b]);
            if (colors) this.colors.push(...colors[b]);
            if (coordinates) this.coordinates.push(...coordinates[b]);

        }

    }
}


//------------------------------------------------------------------------------------------
// -- GLBuffer -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Low-level interface to the shader. GLBuffers know how to lead themselves onto the graphics
// card and apply themselves during rendering. They hold array data for the renderer like
// lists of vertices, normals, colors, and texture coordinates.

class GLBuffer {
    constructor(attribute, mode = 'dynamicDraw') {
        this.attribute = attribute;
        switch (mode) {
            case 'staticDraw':
                this.mode = gl.STATIC_DRAW;
                break;
            case 'dynamicDraw':
            default:
                this.mode = gl.DYNAMIC_DRAW;
        }
    }

    destroy() {
        if (this.buffer) gl.deleteBuffer(this.buffer);
    }

    load(values) {
        if (values.length === 0) {
            if (this.buffer) gl.deleteBuffer(this.buffer);
            this.buffer = null;
            return;
        }
        if (!this.buffer) this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), this.mode);
    }

    apply() {
        if (this.buffer) glShader.setAttribute(this.attribute, this.buffer);
    }

}

//------------------------------------------------------------------------------------------
// -- GLMatrixBuffer -----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Low-level interface to the shader. GLBuffers know how to lead themselves onto the graphics
// card and apply themselves during rendering. They hold 4x4 matrix data.

class GLMatrixBuffer {
    constructor(attribute, mode = 'dynamicDraw') {
        this.attribute = attribute;
        switch (mode) {
            case 'staticDraw':
                this.mode = gl.STATIC_DRAW;
                break;
            case 'dynamicDraw':
            default:
                this.mode = gl.DYNAMIC_DRAW;
        }
    }

    destroy() {
        if (this.buffer) gl.deleteBuffer(this.buffer);
    }

    load(values) {
        if (values.length === 0) {
            if (this.buffer) gl.deleteBuffer(this.buffer);
            this.buffer = null;
            return;
        }
        if (!this.buffer) this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), this.mode);
    }

    apply() {
        if (this.buffer) glShader.setMatrixAttribute(this.attribute, this.buffer);
    }

}

//------------------------------------------------------------------------------------------
//-- Lights --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Default lighting for a scene is an ambient value and one directional light.

export class Lights {
    constructor() {
        this.ambientColor = [0.7, 0.7, 0.7];
        this.directionalColor = [0.3, 0.3, 0.3];
        this.directionalAim = [0,-1,0];
    }

    apply() {
        glShader.setUniform("uAmbientColor", this.ambientColor);
        glShader.setUniform("uDirectionalColor", this.directionalColor);
        glShader.setUniform("uDirectionalAim", this.directionalAim);
    }

    setAmbientColor(color) {
        this.ambientColor = color;
    }

    setDirectionalColor(color) {
        this.directionalColor = color;
    }

    setDirectionalAim(aim) {
        this.directionalAim = v3_normalize(aim);
    }
}


//------------------------------------------------------------------------------------------
//-- Camera --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Camera {
    constructor() {
        this.locationMatrix = m4_identity();
        this.fov = toRad(60);
        this.near = 1;
        this.far = 10000;
    }

    setFOV(fov) {
        this.fov = fov;
        this._projectionMatrix = null;
        this._v2wMatrix = null;
        this._w2vMatrix = null;
        glPipeline.updateFOV();
    }

    setProjection(fov, near, far) {
        this.fov = fov;
        this.near = near;
        this.far = far;
        this._projectionMatrix = null;
        this._v2wMatrix = null;
        this._w2vMatrix = null;
    }

    setAspect(width, height) {
        this.width = width;
        this.height = height;
        this.aspect = this.width / this.height;
        this._projectionMatrix = null;
        this._v2wMatrix = null;
        this._w2vMatrix = null;
    }

    setLocation(m) {
        this.locationMatrix = m;
        this._viewMatrix = null;
        this._viewNormalMatrix = null;
        this._v2wMatrix = null;
        this._w2vMatrix = null;
    }

    get location() {
        return m4_getTranslation(this.locationMatrix);
    }

    get projectionMatrix() {
        if (!this._projectionMatrix) this._projectionMatrix = m4_perspective(this.fov, this.aspect, this.near, this.far);
        return this._projectionMatrix;
    }

    get viewMatrix() {
        if (!this._viewMatrix) this._viewMatrix = m4_invert(this.locationMatrix);
        return this._viewMatrix;
    }

    get viewNormalMatrix() { //This may cause lighting issues if the camera has a scale transform because the shaders don't renormalize
        if (!this._viewNormalMatrix) this._viewNormalMatrix = m4_transpose(this.locationMatrix);
        return this._viewNormalMatrix;
    }

    get v2wMatrix() {
        if (!this._v2wMatrix) this._v2wMatrix = m4_invert(this.w2vMatrix);
        return this._v2wMatrix;
    }

    get w2vMatrix() {
        if (!this._w2vMatrix) this._w2vMatrix = m4_multiply(this.viewMatrix, this.projectionMatrix);
        return this._w2vMatrix;
    }

    apply() {
        glShader.setUniform("uViewMatrix", this.viewMatrix);                // Transforms world to view space
        glShader.setUniform("uViewNormalMatrix", this.viewNormalMatrix);    // Transforms normals from world to view space
        glShader.setUniform("uProjectionMatrix", this.projectionMatrix);    // Projects view space to screen
        glShader.setUniform("uCameraMatrix", this.w2vMatrix);               // Combined view and projection matrix
    }

    worldToView(v3) {
        const v = v3_transform(v3, this.w2vMatrix);
        return [(v[0] + 1.0) * this.width * 0.5, (v[1] + 1.0) * this.height * 0.5];
    }

    clippedWorldToView(v3) {
        const v2 = this.worldToView(v3);
        v2[0] = Math.max(v2[0], 0);
        v2[0] = Math.min(v2[0], this.width);
        v2[1] = Math.max(v2[1], 0);
        v2[1] = Math.min(v2[1], this.height);
        return v2;
    }

    viewToWorld(v3) {
        return v3_transform(v3, this.v2wMatrix);
    }

    // Returns a normalized ray from the camera position that passes through the specified position
    // in the view. The view position ranges from -1 to 1 in both the x and y
    // directions. The default [0,0] is the direction the camera is pointing.

    lookRay(x = 0, y = 0) {
        const v0 = [x,y,-1];
        const v1 = [x,y,1];
        const ray = v3_sub(this.viewToWorld(v1), this.viewToWorld(v0));
        return v3_normalize(ray);
    }

    // Like normal lookRay, but takes view x,y pixel coordinates as its inputs.

    viewLookRay(x, y) {
        x = (2.0 * x / this.width) - 1.0;
        y = 1.0 - (2.0 * y / this.height);
        return this.lookRay(x, y);
    }

}

//------------------------------------------------------------------------------------------
//-- Shader --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The base class that all shaders are derived from.  It encapsulates compiling the vertex
// and fragment sources, and setting uniforms and attributes.
//
// Each shader is expected to have source for both WebGL and WebGL2.

export class Shader {

    constructor() {
        this.program = null;
        this.attributes = new Map();
        this.uniforms = new Map();
    }

    destroy() {
        gl.deleteProgram(this.program);
    }

    apply() {

        gl.useProgram(this.program);
        glShader = this;
        for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i); // Disable previous buffers
    }

    build(vSource, fSource, vSource2, fSource2) {
        // Load and compile the vertex and fragment shaders
        let vertexShader;
        let fragmentShader;
        if (glVersion < 2) {
            vertexShader = this.compile(gl.VERTEX_SHADER, vSource);
            fragmentShader = this.compile(gl.FRAGMENT_SHADER, fSource);
        } else {
            vertexShader = this.compile(gl.VERTEX_SHADER, vSource2);
            fragmentShader = this.compile(gl.FRAGMENT_SHADER, fSource2);
        }

        // Create the shader program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) { // Report if creating shader program failed
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.program));
            gl.deleteProgram(this.program);
            this.program = null;
            return;
        }

        this.findAttributes();
        this.findUniforms();

    }

    compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { // Report if compiling shader failed
            console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    findAttributes() {
        this.attributes.clear();
        const n = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < n; ++i) {
            const info = gl.getActiveAttrib(this.program, i);
            const location = gl.getAttribLocation(this.program, info.name);
            const name = info.name.replace("[0]", "");
            let size = 1;
            const type = gl.FLOAT;
            switch (info.type) {
                case gl.FLOAT:
                    size = 1;
                    break;
                case gl.FLOAT_VEC2:
                    size = 2;
                    break;
                case gl.FLOAT_VEC3:
                    size = 3;
                    break;
                case gl.FLOAT_VEC4:
                    size = 4;
                    break;
                case gl.FLOAT_MAT4:
                    size = 16;
                    break;
                default:
                    console.log("Unrecognized attribute type!");
                    return;
            }
            this.attributes.set(name, {
                type,
                size,
                location
            });
        }
    }

    findUniforms() {
        this.uniforms.clear();
        const n = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; ++i) {
            const info = gl.getActiveUniform(this.program, i);
            const location = gl.getUniformLocation(this.program, info.name);
            const name = info.name.replace("[0]", "");
            this.uniforms.set(name, {
                type: info.type,
                size: info.size,
                location
            });
        }
    }

    setAttribute(name, buffer) {
        const attribute = this.attributes.get(name);
        if (!attribute) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(attribute.location, attribute.size, attribute.type, false, 0, 0);
        gl.enableVertexAttribArray(attribute.location);
    }

    // Sets 4x4 matrix attributer as four 4 vectors
    setMatrixAttribute(name, buffer) {
        if (!this.attributes.has(name)) return;
        const attribute = this.attributes.get(name);
        const stride = 64;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        for (let i = 0; i < 4; i++) {
            const location = attribute.location + i;
            const offset = i * 16;
            gl.vertexAttribPointer(location, 4, attribute.type, false, stride, offset);
            gl.enableVertexAttribArray(location);
            if (glVersion === 2) {
                gl.vertexAttribDivisor(location, 1); // Be sure to set this back to zero after you're done or it will break rendering on Android.
            } else {
                instancedArraysExt.vertexAttribDivisorANGLE(location, 1);
            }
        }
    }

    hasUniform(name) {
        return this.uniforms.has(name);
    }

    setUniform(name, value) {
        const uniform = this.uniforms.get(name);
        if (!uniform) return;
        let v;
        if (value.length) {
            v = value.flat();
        } else {
            v = [value];
        }
        switch (uniform.type) {
            case gl.INT:
            case gl.BOOL:
            case gl.SAMPLER_2D:
                gl.uniform1iv(uniform.location, v);
                break;
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                gl.uniform2iv(uniform.location, v);
                break;
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                gl.uniform3iv(uniform.location, v);
                break;
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                gl.uniform4iv(uniform.location, v);
                break;
            case gl.FLOAT:
                gl.uniform1fv(uniform.location, v);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2fv(uniform.location, v);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3fv(uniform.location, v);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4fv(uniform.location, v);
                break;
            case gl.FLOAT_MAT2:
                gl.uniformMatrix2fv(uniform.location, false, v);
                break;
            case gl.FLOAT_MAT3:
                gl.uniformMatrix3fv(uniform.location, false, v);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(uniform.location, false, v);
                break;
            default:
                console.log("Unrecognized uniform type!");
        }
    }

    get gl() { return gl; }

}

//------------------------------------------------------------------------------------------
//--Geometric Primitives -------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function UnitCube() {
    const cube = new Triangles();
    cube.addFace([[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[0.5, 0.5, 0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5]], [[1,1,1,1], [1,1,1,1], [1,1,1,1], [1,1,1,1]], [[0,0], [1,0], [1,1], [0,1]]);
    return cube;
}

export function Cube(x, y, z, color = [1,1,1,1]) {
    const cube = new Triangles();
    x /= 2;
    y /= 2;
    z /= 2;
    cube.addFace([[-x, -y, -z], [-x, y, -z], [x, y, -z], [x, -y, -z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[x, y, z], [x, y, -z], [-x, y, -z], [-x, y, z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[x, y, z], [-x, y, z], [-x, -y, z], [x, -y, z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    cube.addFace([[x, y, z], [x, -y, z], [x, -y, -z], [x, y, -z]], [color, color, color, color], [[0,0], [1,0], [1,1], [0,1]]);
    return cube;
}

export function Sphere(r, facets, c = [1,1,1,1]) {
    const sphere = new Triangles();
    const ff = 1/facets;

    //-- -X --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([-1, -1 + 2*ff*i, -1 + 2*ff*j]),r);
            const p1 = v3_scale(Spherify([-1, -1 + 2*ff*i, -1 + 2*ff*(j+1)]),r);
            const p2 = v3_scale(Spherify([-1, -1 + 2*ff*(i+1), -1 + 2*ff*(j+1)]),r);
            const p3 = v3_scale(Spherify([-1, -1 + 2*ff*(i+1), -1 + 2*ff*j]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    //-- +X --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([1, -1 + 2*ff*i, -1 + 2*ff*j]),r);
            const p1 = v3_scale(Spherify([1, -1 + 2*ff*(i+1), -1 + 2*ff*j]),r);
            const p2 = v3_scale(Spherify([1, -1 + 2*ff*(i+1), -1 + 2*ff*(j+1)]),r);
            const p3 = v3_scale(Spherify([1, -1 + 2*ff*i, -1 + 2*ff*(j+1)]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    //-- -Y --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([-1 + 2*ff*i, -1 , -1 + 2*ff*j]),r);
            const p1 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1 , -1 + 2*ff*j]),r);
            const p2 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1,  -1 + 2*ff*(j+1)]),r);
            const p3 = v3_scale(Spherify([-1 + 2*ff*i, -1, -1 + 2*ff*(j+1)]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    //-- +Y --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([-1 + 2*ff*i, 1, -1 + 2*ff*j]),r);
            const p1 = v3_scale(Spherify([-1 + 2*ff*i, 1, -1 + 2*ff*(j+1)]),r);
            const p2 = v3_scale(Spherify([-1 + 2*ff*(i+1), 1, -1 + 2*ff*(j+1)]),r);
            const p3 = v3_scale(Spherify([-1 + 2*ff*(i+1), 1, -1 + 2*ff*j]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    //-- -Z --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([-1 + 2*ff*i, -1 + 2*ff*j, -1]),r);
            const p1 = v3_scale(Spherify([-1 + 2*ff*i, -1 + 2*ff*(j+1), -1]),r);
            const p2 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1 + 2*ff*(j+1), -1]),r);
            const p3 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1 + 2*ff*j, -1]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    //-- +Z --

    for (let i = 0; i < facets; i++) {
        for (let j = 0; j < facets; j++) {

            const p0 = v3_scale(Spherify([-1 + 2*ff*i, -1 + 2*ff*j, 1]),r);
            const p1 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1 + 2*ff*j, 1]),r);
            const p2 = v3_scale(Spherify([-1 + 2*ff*(i+1), -1 + 2*ff*(j+1), 1]),r);
            const p3 = v3_scale(Spherify([-1 + 2*ff*i, -1 + 2*ff*(j+1), 1]),r);

            const u0 = i * ff;
            const u1 = u0 + ff;
            const v0 = j * ff;
            const v1 = v0 + ff;

            sphere.addFace([p0, p1, p2, p3], [c, c, c, c], [[u0,v0], [u1,v0], [u1,v1], [u0,v1]]);
        }
    }

    return sphere;
}

// This yields more equal-sized triangles that the typical normalization approach
// For more info see: http://mathproofs.blogspot.com/2005/07/mapping-cube-to-sphere.html
// And: https://medium.com/game-dev-daily/four-ways-to-create-a-mesh-for-a-sphere-d7956b825db4

function Spherify(v3) {
    const p2 = v3_multiply(v3, v3);
    const x = p2[0];
    const y = p2[1];
    const z = p2[2];
    const rx = v3[0] * Math.sqrt(1.0 - 0.5 * (y + z) + y*z/3.0);
    const ry = v3[1] * Math.sqrt(1.0 - 0.5 * (z + x) + z*x/3.0);
    const rz = v3[2] * Math.sqrt(1.0 - 0.5 * (x + y) + x*y/3.0);
    return [rx, ry, rz];
}

export function Cone(r0, r1, h, facets, color = [1,1,1,1]) {
    const cone = new Triangles();
    const b = [];
    const t = [];
    const angle = TAU / facets;
    const rotor0 = [0,r0];
    const rotor1 = [0,r1];
    for (let i = 0; i < facets; i++) {
        const a = i * angle;
        b.push(v2_rotate(rotor0, a));
        t.push(v2_rotate(rotor1, a));
    }

    const diameter = r0 * TAU;
    for (let i = 0; i < facets; i++) {
        const j = (i+1) % facets;
        const c0 = b[i];
        const c1 = b[j];
        const c2 = t[j];
        const c3 = t[i];
        const v0 = [c0[1], -h/2, c0[0]];
        const v1 = [c1[1], -h/2, c1[0]];
        const v2 = [c2[1], h/2, c2[0]];
        const v3 = [c3[1], h/2, c3[0]];
        const u0 = i*diameter / (facets + 1);
        const u1 = (i+1) * diameter / (facets + 1);
        cone.addFace([v0, v1, v2, v3], [color, color, color, color], [[u0,0], [u1,0], [u1,h], [u0,h]]);
    }

    b.reverse();
    const bVertices = [];
    const bColors = [];
    const bCoordinates = [];
    for (let i = 0; i < facets; i++) {
        const p = [b[i][1], -h/2, b[i][0]];
        bVertices.push(p);
        bColors.push(color);
        bCoordinates.push(b[i]);
    }
    cone.addFace(bVertices, bColors, bCoordinates);

    const tVertices = [];
    const tColors = [];
    const tCoordinates = [];
    for (let i = 0; i < facets; i++) {
        const p = [t[i][1], h/2, t[i][0]];
        tVertices.push(p);
        tColors.push(color);
        tCoordinates.push(t[i]);
    }
    cone.addFace(tVertices, tColors, tCoordinates);

    return cone;
}

export function Cylinder(r, h, facets, color = [1,1,1,1]) {
    const cylinder = new Triangles();
    const b = [];
    const angle = TAU / facets;
    const rotor = [0,r];
    for (let i = 0; i < facets; i++) {
        const a = i * angle;
        b.push(v2_rotate(rotor, a));
    }

    const diameter = r * TAU;
    for (let i = 0; i < facets; i++) {
        const j = (i+1) % facets;
        const c0 = b[i];
        const c1 = b[j];
        const v0 = [c0[1], -h/2, c0[0]];
        const v1 = [c1[1], -h/2, c1[0]];
        const v2 = [c1[1], h/2, c1[0]];
        const v3 = [c0[1], h/2, c0[0]];
        const u0 = i*diameter / (facets + 1);
        const u1 = (i+1) * diameter / (facets + 1);
        cylinder.addFace([v0, v1, v2, v3], [color, color, color, color], [[u0,0], [u1,0], [u1,h], [u0,h]]);
    }

    const tVertices = [];
    const tColors = [];
    const tCoordinates = [];
    for (let i = 0; i < facets; i++) {
        const p = [b[i][1], h/2, b[i][0]];
        tVertices.push(p);
        tColors.push(color);
        tCoordinates.push(b[i]);
    }
    cylinder.addFace(tVertices, tColors, tCoordinates);

    b.reverse();
    const bVertices = [];
    const bColors = [];
    const bCoordinates = [];
    for (let i = 0; i < facets; i++) {
        const p = [b[i][1], -h/2, b[i][0]];
        bVertices.push(p);
        bColors.push(color);
        bCoordinates.push(b[i]);
    }
    cylinder.addFace(bVertices, bColors, bCoordinates);
    return cylinder;
}

//------------------------------------------------------------------------------------------
//--Stencil Functions ----------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export function StartStencilCapture() {
    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.stencilMask(0xff);
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
    gl.clearStencil(0);
    gl.clear(gl.STENCIL_BUFFER_BIT);
}

export function EndStencil() {
    gl.disable(gl.STENCIL_TEST);
}

export function StartStencilApply() {
    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilMask(0x00);
    gl.stencilFunc(gl.EQUAL, 1, 0xFF);
}

export function ClearAttribDivisor() {
    for (let i = 0; i < 16; i++) {
        gl.vertexAttribDivisor(i, 0);
    }
}

