import { Constants } from "@croquet/croquet";
import { Actor, Pawn, mix, PM_Visible, Material, AM_Avatar, PM_Avatar, AM_Smoothed, PM_Smoothed, q_multiply, q_axisAngle,
    DrawCall, Cube, m4_translation, v3_add, toDeg, toRad, v3_rotate, v3_scale, v3_zero, GetNamedView, Cylinder, AM_RapierPhysics } from "@croquet/worldcore";
import paper from "../assets/paper.jpg";
import { isDisplay } from "./Mode";

//------------------------------------------------------------------------------------------
// CarActor
//------------------------------------------------------------------------------------------

Constants.carTick = 30;
Constants.maxSpeed = 40.0;
Constants.maxSteerAngle = toRad(30);
Constants.wheelbase = 3.5;

export class CarActor extends mix(Actor).with(AM_Smoothed, AM_RapierPhysics) {
    init(options) {
        super.init("CarPawn", options);

        this.frontRight = WheelActor.create({parent: this, translation: [1.75, -1.5, 0.75]});
        this.rearRight = WheelActor.create({parent: this, translation: [-1.75, -1.5, 0.75]});
        this.frontLeft = WheelActor.create({parent: this, translation: [1.75, 1.5, 0.75]});
        this.rearLeft = WheelActor.create({parent: this, translation: [-1.75, 1.5, 0.75]});

        this.name = this.randomName();

        const modelRoot = this.wellKnownModel("modelRoot");
        this.collision = modelRoot.level.size - 4; // Radius of collision cylinder

        this.speed = 0;
        this.steer = 0;

        this.addRigidBody({type: 'kinematic'});

        this.addBoxCollider({
            translation: [0,0,0.1],
            size: [3,1.5,1.5],
            friction: 1,
            density: 1,
            restitution: 0
        });

        this.subscribe(this.playerId, "s", this.onSteer);
        this.subscribe(this.playerId, "g", this.onGas);
        this.subscribe(this.playerId, "color", this.onColor);
        this.subscribe(this.playerId, "reset", this.onReset);

        this.future(0).tick();
    }

    get color() { return this._color || [1,1,1,1]}

    onSteer(x) {
        this.steer = -x * Constants.maxSteerAngle;
        const q = q_axisAngle([0,0,1], this.steer);
        this.frontRight.rotateTo(q);
        this.frontLeft.rotateTo(q);
    }

    onGas(x) {
        this.speed = -x * Constants.maxSpeed;
        // this.speed = 20; // Can be used to create constant speed for testing
    }

    onColor(c) {
        const cc = [...c, 1];
        this.set({color: cc});
        this.say("colorChange");
    }

    onReset() {
        this.speed = 0;
        this.steer = 0;
    }

    get playerId() { return this._playerId};

    tick() {
        const factor = 1000 / Constants.carTick;
        const angularVelocity = this.speed * Math.sin(this.steer) / Constants.wheelbase / factor;
        this.rotateTo(q_multiply(this.rotation, q_axisAngle([0,0,1], angularVelocity)))
        const velocity = this.speed / factor;
        const v = v3_scale(v3_rotate([1,0,0], this.rotation), velocity);
        const target = v3_add(this.translation, v);
        target[0] = Math.max(-this.collision, Math.min(this.collision, target[0]));
        target[1] = Math.max(-this.collision, Math.min(this.collision, target[1]));
        this.moveTo(target);
        this.future(Constants.carTick).tick();
    }

    randomName() {
        const names =["Acorn","Allspice","Almond","Ancho","Anise","Aoli","Apple","Apricot","Arrowroot", "Asiago", "Asparagus","Avocado","Baklava","Balsamic",
            "Banana","Barbecue","Bacon", "Banana","Basil","Bay Leaf","Bergamot","Blackberry","Blueberry","Broccoli", "Bubblegum",
            "Buttermilk","Cabbage","Camphor","Canaloupe","Cappuccino","Caramel","Caraway","Cardamom", "Carrot", "Catnip","Cauliflower","Cayenne","Celery",
            "Cheddar", "Cherry", "Chervil","Chives","Chipotle","Chocolate","Coconut","Cookie Dough","Chicory","Chutney","Cilantro","Cinnamon","Clove",
            "Coriander","Cranberry","Croissant","Cucumber","Cupcake","Cumin","Curry","Dandelion","Dill","Durian","Eclair","Eggplant","Espresso","Felafel","Fennel",
            "Fenugreek","Fig","Garlic","Gelato", "Ginger", "Gumbo","Honeydew","Hyssop","Garlic", "Ghost Pepper",
            "Ginger","Ginseng","Grapefruit","Habanero","Harissa","Hazelnut","Horseradish","Jalepeno","Juniper","Ketchup","Key Lime","Kiwi","Kohlrabi","Kumquat","Latte",
            "Lavender","Lemon Grass","Lemon Zest","Licorice","Macaron","Mango","Maple Syrup","Marjoram","Marshmallow",
            "Matcha","Mayonnaise","Mint","Mulberry", "Mushroom", "Mustard", "Nacho", "Nectarine","Nutmeg","Olive Oil", "Onion", "Orange Peel","Oregano",
            "Parmesan", "Pickle", "Papaya","Paprika","Parsley","Parsnip","Peach","Peanut", "Pear", "Pecan","Pennyroyal","Peppercorn","Persimmon",
            "Pineapple","Pistachio","Plum","Pomegranate","Poppy Seed", "Potato", "Prune", "Pumpkin","Quince", "Quinine",
            "Ragout", "Raisin", "Raspberry","Ratatouille","Rosemary","Rosewater","Saffron","Sage", "Sassafras",
            "Sea Salt","Sesame Seed","Shiitake","Sorrel","Soy Sauce","Spearmint","Strawberry","Strudel","Sunflower Seed","Sriracha","Tabasco","Tamarind","Tandoori","Tangerine",
            "Tarragon","Thyme","Tofu","Truffle","Tumeric","Valerian","Vanilla","Vinegar","Wasabi","Walnut","Watercress","Watermelon","Wheatgrass","Yarrow","Yuzu","Zucchini"];
        return names[Math.floor(Math.random() * names.length)];
    }

}
CarActor.register('CarActor');

//------------------------------------------------------------------------------------------
// CarPawn
//------------------------------------------------------------------------------------------

class CarPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);
        if (isDisplay) {
            this.setDrawCall(this.buildDraw());
            this.listen("colorChange", this.onColorChange);
        }
    }

    onColorChange() {
        this.mesh.setColor(this.actor.color);
        this.mesh.load();
    }

    buildDraw() {
        this.mesh = this.buildMesh();
        const material = this.buildMaterial();
        const draw = new DrawCall(this.mesh, material);
        return draw;
    }

    buildMesh() {
        const cab = Cube(3.8,2.8,1.5, this.actor.color);
        cab.transform(m4_translation([-1,0,1.5]));
        const body = Cube(6,3,1.5, this.actor.color);
        body.merge(cab);
        body.transform(m4_translation([0,0,1]));
        body.load();
        return body;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'opaque';
        material.texture.loadFromURL(paper);
        return material;
    }

    update(time,delta) {
        super.update(time,delta);
        if (!isDisplay) return;
        const viewRoot = GetNamedView("ViewRoot");
        const camera = viewRoot.render.camera;
        const display = viewRoot.render.display;
        this.screenXY = camera.worldToView(this.translation);
        this.screenXY[1] = display.height - this.screenXY[1];
    }

}
CarPawn.register('CarPawn');

//------------------------------------------------------------------------------------------
// WheelActor
//------------------------------------------------------------------------------------------

export class WheelActor extends mix(Actor).with(AM_Smoothed) {
    init(options) {
        super.init("WheelPawn", options);
    }
}
WheelActor.register('WheelActor');

//------------------------------------------------------------------------------------------
// WheelPawn
//------------------------------------------------------------------------------------------

class WheelPawn extends mix(Pawn).with(PM_Smoothed, PM_Visible) {
    constructor(...args) {
        super(...args);
        if (isDisplay) {
            this.setDrawCall(this.buildDraw());
        }
    }

    buildDraw() {
        this.mesh = this.buildMesh();
        const material = this.buildMaterial();
        const draw = new DrawCall(this.mesh, material);
        return draw;
    }

    buildMesh() {
        const mesh = Cylinder(0.75, 0.75, 12, [0.4,0.4,0.4,1]);
        mesh.load();
        return mesh;
    }

    buildMaterial() {
        const material = new Material();
        material.pass = 'opaque';
        material.texture.loadFromURL(paper);
        return material;
    }

}
WheelPawn.register('WheelPawn');