declare module "mmd-parser" {
    export type Vec2 = [number, number]
    export type Vec3 = [number, number, number]
    export type Vec4 = [number, number, number, number]

    export interface MMDVertex {
        edgeFlag: number
        position: Vec3
        normal: Vec3
        uv: Vec2
        skinIndices: []
        skinWeights: []
    }

    export interface MMDMaterial {
        ambient: Vec3
        diffuse: Vec4
        edgeFlag: number
        faceCount: number
        fileName?: string
        textureIndex?: number
        shininess: 5
        specular: Vec3
    }

    export interface MMDData {
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
        boneFrameNames: { name: string }[]
        boneFrames: { boneIndex: number, frameIndex: number }[]
        materials: MMDMaterial[]

    }

    export class Parser {
        parsePmd(data: ArrayBuffer | string): MMDData

        parsePmx(data: ArrayBuffer | string): MMDData

        parseVmd(data: ArrayBuffer | string)
    }

    export declare var MMDParser = {
        Parser: Parser
    }

}

