import { Messenger } from "@croquet/croquet";

let qUser = null;

export function Nickname() {
    if (qUser) return qUser.nickname;
    const a = Math.floor(Math.random() * adjectives.length);
    const n = Math.floor(Math.random() * nouns.length);
    return adjectives[a] + " " + nouns[n];
}

export async function checkQNickname() {
    if (!inIframe()) return;

    return new Promise(resolve => {
        setTimeout(resolve, 1000);
        Messenger.setReceiver({
            handleUserInfo(userInfo) {
                qUser = userInfo;
                resolve();
            }
        });
        Messenger.on("userInfo", "handleUserInfo");
        Messenger.send("userInfoRequest");
    });

    function inIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }
}

const adjectives = [
    "#1",
    "0g Trans-fat",
    "100% Organic",
    "30-Watt",
    "Admiral",
    "Aggro",
    "Alpha",
    "Amphibious",
    "Angry",
    "Anime",
    "Annoying",
    "Anxious",
    "Assistant",
    "Back-alley",
    "Baby",
    "Barbecued",
    "Battle",
    "Beatboxing",
    "Big Ol'",
    "Blue-collar",
    "Boiled",
    "Brain-dead",
    "Brainy",
    "Broken",
    "Bulletproof",
    "Canned",
    "Cardboard",
    "Cast-iron",
    "Champagne",
    "Cheap Plastic",
    "Chicken-fried",
    "Clockwork",
    "Colonel",
    "Commodore",
    "Conan the",
    "Cool Ranch",
    "Chocolate",
    "Chunk-style",
    "Crazy",
    "Cromulent",
    "Cruelty-free",
    "Crypto",
    "Curious",
    "Cute Lil'",
    "Cyber",
    "Daddy's Little",
    "Dancing",
    "Dead",
    "Deadly",
    "Defective",
    "Detective",
    "Disco",
    "D.J.",
    "Doomed",
    "Double",
    "Dr.",
    "Dreamy",
    "Dropkick",
    "Drunken",
    "Duck Duck",
    "Eccentric",
    "Eldrich",
    "Electric",
    "Emo",
    "Extreme",
    "Fancy",
    "Fearless",
    "Feral",
    "Flying",
    "Frankenstein's",
    "Freaky",
    "Free-range",
    "Frisky",
    "Fullmetal",
    "Funky",
    "Giant",
    "Glitch",
    "Glowing",
    "Gluten-free",
    "Golden",
    "Goth",
    "Groovy",
    "Gummi",
    "Hallucinating",
    "Hardboiled",
    "Hardcore",
    "Heavy Metal",
    "Heroic",
    "High-fiber",
    "Hip-hop",
    "Holy",
    "Hungry Hungry",
    "Immature",
    "Immortal",
    "Inch-high",
    "Inconsequential",
    "Infamous",
    "Invisible",
    "Ironic",
    "Kafkaesque",
    "Killer",
    "Kung Fu",
    "Kung Pao",
    "Lengendary",
    "Liquid",
    "Little Miss",
    "Lord",
    "Lovecraftian",
    "Luminous",
    "Lumpy",
    "Luxury",
    "Magical",
    "Malfunctioning",
    "Manic Pixie",
    "Massive",
    "Mayor",
    "M.C.",
    "Mega",
    "Microscopic",
    "Microwave-safe",
    "Mile-high",
    "Miniature",
    "Mirror-universe",
    "Misfit",
    "Mistress",
    "Moist",
    "Monster",
    "Murder",
    "Mystic",
    "Nacho Cheese",
    "Narcoleptic",
    "Nefarious",
    "Norwegian",
    "Notorious",
    "Nuclear",
    "Obsolete",
    "Part-time",
    "Pernicious",
    "Petrified",
    "Pink",
    "Posh",
    "President",
    "Princess",
    "Professor",
    "Prototype",
    "Public Domain",
    "Quantum",
    "Radioactive",
    "Rainbow",
    "Recently Divorced",
    "Replacement",
    "Rocky Horror",
    "Royal",
    "Rubber",
    "Rubenesque",
    "Sarcastic",
    "Salty",
    "Scary",
    "Sergeant",
    "Second",
    "Secret",
    "Selfless",
    "Sexy",
    "Shameless",
    "Shy",
    "Sly",
    "Smooooth",
    "Sneaky",
    "Sparkle",
    "Spherical",
    "Spicy",
    "Spooky",
    "Stealth",
    "Steamed",
    "Steampunk",
    "Stereotypical",
    "Sticky",
    "Stir-fried",
    "Strange",
    "Street-corner",
    "Subtle",
    "Super",
    "Sweet & Sour",
    "Swol",
    "The Best",
    "The Big Bad",
    "The Eternal",
    "The Fellowship of the",
    "The Last",
    "The Late, Great",
    "The Naked",
    "Thicc",
    "Thrift-store",
    "Timid",
    "Tiny",
    "Total",
    "Transcendental",
    "Trash",
    "Tricky",
    "Troublesome",
    "Ultra",
    "Unauthorized",
    "Uncanny",
    "Undead",
    "Unexpected",
    "Utterly Unremarkable",
    "Vampire",
    "Vanilla",
    "Velveteen",
    "Vengeful",
    "Virtual",
    "Waterproof",
    "Weird",
    "Wonder",
    "Zero Emission",
];

const nouns = [
    "Amoeba",
    "Ant",
    "Antagonist",
    "Apple",
    "Apricot",
    "Astronaut",
    "Baboon",
    "Backhoe",
    "Bacon",
    "Barbarian",
    "Banana",
    "Bean",
    "Bee",
    "Beef",
    "Blizzard",
    "Booty",
    "Brain",
    "Breadstick",
    "Breakfast",
    "Brick",
    "Buckaroo",
    "Bulldozer",
    "Bunny",
    "Burrito",
    "Butterfly",
    "Cactus",
    "Carrot",
    "Caveman",
    "Cheesesteak",
    "Chicken",
    "Chicken Nugget",
    "Cow",
    "Cowboy",
    "Cowgirl",
    "Cucumber",
    "Cupcake",
    "Cutie-pie",
    "Dad",
    "Dingo",
    "Dirtbag",
    "Dragon",
    "Dreamboat",
    "Dreamgirl",
    "Duck",
    "Dumpster Fire",
    "Dumptruck",
    "Dust Bunny",
    "Dynamite",
    "Egg",
    "Elf",
    "Fairy",
    "Forklift",
    "Freak",
    "Frog",
    "Glitter",
    "Goat",
    "God",
    "Goo",
    "Goldfish",
    "Goose",
    "Gorilla",
    "Gravy",
    "Ham",
    "Hamster",
    "Hedgehog",
    "Hermit",
    "Hero",
    "Hippie",
    "Hippo",
    "Hobbit",
    "Hobo",
    "Hog",
    "Horse",
    "Hot Pocket",
    "Hovercraft",
    "Hurricane",
    "Iceberg",
    "Jackhammer",
    "Jelly",
    "Kaiju",
    "Kangaroo",
    "Kitty",
    "Knight",
    "Lemon",
    "Librarian",
    "Love Interest",
    "Lumberjack",
    "Manatee",
    "Mastermind",
    "McGee",
    "Meatloaf",
    "Megalodon",
    "Mermaid",
    "Messiah",
    "Mom",
    "Monkey",
    "Moose",
    "Mouse",
    "Muffin",
    "Mummy",
    "Mushroom",
    "Mystic",
    "Narwhal",
    "Necromancer",
    "Ninja",
    "Noodle",
    "Ooze",
    "Orange",
    "Oyster",
    "Panda",
    "Pile Driver",
    "Peanut",
    "Penguin",
    "Philosopher",
    "Pickle",
    "Pigeon",
    "Pirate",
    "Pixie",
    "Pizza",
    "Platypus",
    "Plushie",
    "Pony",
    "Poodle",
    "Potato",
    "Princess",
    "Protagonist",
    "Pudding",
    "Puppy",
    "Riot",
    "Robot",
    "Rock",
    "Rocket",
    "Rodeo",
    "Roomba",
    "Samurai",
    "Sauce",
    "Skeleton",
    "Slime",
    "Shark",
    "Sheep",
    "Snowflake",
    "Soup",
    "Spam",
    "Sperm Whale",
    "Sponge",
    "Spud",
    "Squid",
    "Squirrel",
    "Steamroller",
    "Stick",
    "Sunshine",
    "Supernova",
    "Sushi",
    "T-Rex",
    "Toaster",
    "Tofu",
    "Tomato",
    "Tornado",
    "Tractor",
    "Turtle",
    "Underpants",
    "Unicorn",
    "Waif",
    "Wasabi",
    "Weirdo",
    "Witch",
    "Wizard",
    "Wombat",
    "Yak",
    "Zebra",
    "Zeppelin",
    "Zombie",
];
