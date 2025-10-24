

const objects = [
    {
        name: 'bird',
        path: 'assets/3d-objects/bird/',
        mtl: '12213_Bird_v1_l3.mtl',
        obj: '12213_Bird_v1_l3.obj',
        scale: 0.06,
        rotation: {
            x: -Math.PI / 2,
            y: 0,
            z: 0
        },
        position: {
            x: 0,
            y: -0.2,
            z: 0
        },
        lights: {
            key: 1,
            fill: 0.5,
            back: 1
        },
        label: {
            x: 0.5,
            y: 0.5,
            z: 0,
            scale: 1.0,
            text: "Bird\nThis is a nice bird",
            color: 0xffffff
        }
    },
    {
        name: 'dolphin',
        path: 'assets/3d-objects/dolphin/',
        mtl: '10014_dolphin_v2_max2011_it2.mtl',
        obj: '10014_dolphin_v2_max2011_it2.obj',
        scale: 0.005,
        rotation: {
            x: -Math.PI / 2,
            y: Math.PI / 5,
            z: Math.PI / 2
        },
        position: {
            x: -0.3,
            y: -0.3,
            z: 0
        },
        lights: {
            key: 5,
            fill: 2,
            back: 5
        },
        label: {
            x: 0.45,
            y: -0.5,
            z: 0,
            scale: 1.0,
            text: "Coolest dolphin\nThis is a nice dolphin",
            color: 0xff0000
        }
    },
    {
        name: 'fish',
        path: 'assets/3d-objects/fish/',
        mtl: 'fish.mtl',
        obj: 'fish.obj',
        scale: 0.2,
        rotation: {
            x: 0,
            y: -Math.PI / 2,
            z: 0
        },
        position: {
            x: 0.2,
            y: 0,
            z: 0.5
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        },
        label: {
            x: -0.95,
            y: -0.5,
            z: 0,
            scale: 2.0,
            text: "Swim, swim...",
            color: 0x000000
        }
    },
    {
        name: 'kangaroo',
        path: 'assets/3d-objects/kangaroo/',
        mtl: '12271_Kangaroo_v1_L3.mtl',
        obj: '12271_Kangaroo_v1_L3.obj',
        scale: 0.003,
        rotation: {
            x: -Math.PI / 2,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: -0.2,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
    {
        name: 'lamp-post',
        path: 'assets/3d-objects/lamp-post/',
        mtl: 'rv_lamp_post_4.mtl',
        obj: 'rv_lamp_post_4.obj',
        scale: 0.03,
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: -0.35,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
    {
        name: 'lantern',
        path: 'assets/3d-objects/Lantern/',
        mtl: 'lantern_obj.mtl',
        obj: 'lantern_obj.obj',
        scale: 0.007,
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: -0.25,
            z: 0.0
        },
        lights: {
            key: 3,
            fill: 3,
            back: 3
        }
    },
    {
        name: 'RattleSnake',
        path: 'assets/3d-objects/RattleSnake/',
        mtl: '10050_RattleSnake_v4_L3.mtl',
        obj: '10050_RattleSnake_v4_L3.obj',
        scale: 0.02,
        rotation: {
            x: -Math.PI / 2,
            y: 0,
            z: Math.PI
        },
        position: {
            x: 0.0,
            y: -0.2,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
    {
        name: 'skeleton',
        path: 'assets/3d-objects/skeleton/',
        mtl: 'skeleton.mtl',
        obj: 'skeleton.obj',
        scale: 0.01,
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: 0.1,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
    {
        name: 'skull',
        path: 'assets/3d-objects/skull/',
        mtl: '12140_Skull_v3_L2.mtl',
        obj: '12140_Skull_v3_L2.obj',
        scale: 0.02,
        rotation: {
            x: -Math.PI / 2,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: -0.25,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
    {
        name: 'whale',
        path: 'assets/3d-objects/whale/',
        mtl: '10054_Whale_v2_L3.mtl',
        obj: '10054_Whale_v2_L3.obj',
        scale: 0.0015,
        rotation: {
            x: -Math.PI / 2,
            y: 0,
            z: 0
        },
        position: {
            x: 0.0,
            y: 0,
            z: 0.0
        },
        lights: {
            key: 2,
            fill: 2,
            back: 2
        }
    },
    {
        name: 'wolf',
        path: 'assets/3d-objects/wolf/',
        mtl: 'WOLF.MTL',
        obj: 'WOLF.OBJ',
        scale: 0.5,
        rotation: {
            x: 0,
            y: Math.PI / 2,
            z: 0
        },
        position: {
            x: 0.0,
            y: -0.2,
            z: 0.0
        },
        lights: {
            key: 1,
            fill: 1,
            back: 1
        }
    },
];

const defaultObjectIndex = objects.findIndex(
    object => object.name === 'dolphin');