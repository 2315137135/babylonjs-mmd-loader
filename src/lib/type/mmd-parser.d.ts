declare module "mmd-parser" {
    type Vec2 = [number, number]
    type Vec3 = [number, number, number]
    type Vec4 = [number, number, number, number]

    export interface MMDVertex {
        edgeFlag: number
        position: Vec3
        normal: Vec3
        uv: Vec2
        skinIndices: []
        skinWeights: []
    }


    export interface MMDMaterial {
        name: string
        ambient: Vec3
        diffuse: Vec4
        edgeFlag: number
        faceCount: number
        fileName?: string
        textureIndex?: number
        shininess: 5
        specular: Vec3
    }

    type MMDMorphAnimationData = { frameNum: number, morphName: string, weight: number }
    type MMDMotionAnimationData = {
        boneName: string,
        frameNum: number,
        interpolation: number[],
        position: Vec3,
        rotation: Vec4
    }
    type MMDMorphData = {
        elementCount: number,
        elements: {
            ratio: number;
            index: number, position: Vec3
        }[],
        englishName: string,
        name: string,
        panel: number
        type: number
    }

    export interface MMDAnimationData {
        metadata: Record<string, string | number>
        morphs: MMDMorphAnimationData []
        motions: MMDMotionAnimationData []
    }

    export interface MMDModelData {
        metadata: Record<string, string | number>
        morphs: MMDMorphData[]
        vertices: MMDVertex []
        faces: { indices: Vec3 }[]
        textures?: string[]
        bones: {
            ikIndex: number
            name: string
            parentIndex: number
            position: Vec3
            tailIndex: number
            type: number
        }[]
        materials: MMDMaterial[]
    }

    export class Parser {
        parsePmd(data: ArrayBuffer | string): MMDModelData

        parsePmx(data: ArrayBuffer | string): MMDModelData

        parseVmd(data: ArrayBuffer | string): MMDAnimationData
    }

    export declare var MMDParser = {
        Parser: Parser
    }

}

