# Changelog
All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2022-11-28
### Changed
- Use Croquet OS version 1.1.0-14.

## [1.3.1] - 2022-8-12
### Fixed
- Redundant handling of rotation in PM_Smoothed is removed
- The order of invoking services in ViewRoot.update() places PawnManager at the right spot.
- The sayCache mechanism handles throttling better.
- the children structure of a pawn with a child is properly initialized.

## [1.3.0] - 2022-6-16
### Changed
- Parent/child relationships are included in the base functionality of Actors and Pawns
- Actors aren't required to have Pawns
- PM_Dynamic rolled into base Pawn class.
- Pawns have a throttle parameter in their say() method by default.
- The event published by Actor set() is "propertySet" instead of "_property".
- q_equals() defaults to epsilon = 0;

## Fixed
- InputManager generates pointerDelta events during a drag.

### Added
- Pawn set() -- you can set actor options from the Pawn.
- PlayerManager destroyPlayer() -- override to customize player destruction
- PM_Driver mixin

### Removed
- PM_MouselookAvatar mixin

## [1.2.0] - 2022-4-20
### Added
- Pawns have init() so you don't need to define constructors
- Base mixins/classes for generic renderer support:
  - PM_Visible
  - PM_Camera
  - RenderManager
- add xy to click and wheel events

### Fixed
- DoubleDown and TripleDown events work on touch devices

### Removed
smoothSet() from AM_Smoothed
defineSmoothedPawnProperty from PM_Smoothed

## [1.1.0] - 2022-1-28
## Added
- Actors listen for "_set" to allow remote call of set()
- smoothSet() in AM_Smoothed
- localOffset in _PM_Smoothed
- defineSmoothedPawnProperty in PM_Smoothed
- actorFromID to Actor

## Changed
- Actor set() sorts options to prevent divergence
- PM_Dynamic pawns have throttle argument in their say()
- PM_Smoothed tug no longer uses parent tug
- PM_Smoothed posts "ViewGlobalChanged" in global getter
- Avatar mixins renamed to Predictive (old name is deprecated)
- Pawn.destroy sets doomed

## [1.0.8] - 2021-12-17
### Changed
- Pawns are no longer created immediately to allow actors to set properties after super.init()

## [1.0.5] - 2021-12-08
### Fixed
- Fixed bug with view services being destroyed in wrong order.

## [1.0.4] - 2021-12-06
### Added
- Added FocusManager

## [1.0.3] - 2021-11-24
### Added
- InputManager has AddAllListeners() method
### Changed
- ActorManager allows inheritance
- InputManager allows inheritance
- PawnManager allows inheritance
- PlayerManager allows inheritance
- PlayerManager allows null return for CreatePlayer()
### Fixed
- Fixed bug with initialization of async services

## [1.0.0] - 2021-10-20
### Added
- Initial release

## Pending



