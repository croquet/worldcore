# Changelog
All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2022-4-20
### Changed
- PM_ThreeCamera.raycast handles grouped objects
- PM_Visible inherits from base PM_Visible in kernel
- PM_ThreeCamera inherits from base PM_Camera in kernel
- ThreeRenderManager inherits from base RenderManager in kernel

### Added
- ThreeRenderManager has threeLayer() to access Three-specific layer data.
- ThreeRenderManager has threeLayerUnion()

- removeFromLayers dynamically removes an object from layers.
- BVH Bounding Volume Hierachy (three-mesh-bvh) is added as an option to optimize raycast.
- setColliderObject is used to set up the BVH geometry for an object.
- The result from the raycaster has distance property.
- setVelocitySpin is a convenience method to set _velocity and _spin at the same time.
- pointerRaycast takes an optional flag to restrict the set of targets to objects in the targets list.
- object that returns hitNormal can set the normal in pointerRaycast.

### Fixed
- invoke update() only once per object

## [1.1.2] - 2022-1-28
### Fixed
- Fixed crash if you create a raycast pointer with no targets.

## [1.1.0] - 2022-1-28
### Added
- ThreeCamera.pointerRaycast()

## [1.0.7] - 2021-12-10
### Added
- ThreeRenderManager composition of multiple rendering passes

## [1.0.6] - 2021-12-10
### Added
- ThreeRenderManager supports initialization options for WebGLRenderer

## [1.0.3] - 2021-11-24
### Changed
- ThreeRenderManager allows inheritance

## [1.0.0] - 2021-10-20
### Added
- Initial release

## Pending

