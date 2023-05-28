import {MMDAnimationData, MMDModelData, MMDMotion, MMDParser} from "mmd-parser";
import {
    Animation,
    AnimationGroup,
    Bone,
    Color3,
    IAnimationKey,
    Matrix,
    Mesh,
    MultiMaterial,
    Quaternion,
    Scene,
    Skeleton,
    Space,
    StandardMaterial,
    SubMesh,
    Texture,
    Tools,
    Vector3,
    VertexData
} from "@babylonjs/core";
import {EasingFunction, IEasingFunction} from "@babylonjs/core/Animations/easing";

const parser = new MMDParser.Parser()

export async function ImportMMDMeshAsync(rootUrl: string, url: string, scene: Scene) {
    let fineUrl = `${rootUrl}/${url}`
    fineUrl = fineUrl.replace(/\/+/, "/")
    let rawData = await Tools.LoadFileAsync(fineUrl, true)

    let mmdData
    if (url.includes(".pmd")) {
        mmdData = parser.parsePmd(rawData)
    } else {
        mmdData = parser.parsePmx(rawData)
    }
    console.log(mmdData)
    let textures = parseTextures(mmdData, scene, rootUrl)
    let mmdMesh = await parseMesh(mmdData, scene)
    let mat = parseMaterial(mmdData, scene, rootUrl, textures)
    let skeleton = parsSkeleton(mmdData, scene)

    mmdMesh.skeleton = skeleton
    mmdMesh.material = mat
    mmdMesh.metadata = mmdData.metadata
    return mmdMesh
}

export function parseMaterial(pmd: MMDModelData, scene: Scene, rootUrl: string, textures: Texture[]) {
    let multiMat = new MultiMaterial("")
    pmd.materials.forEach((e, index) => {
        let mat = new StandardMaterial(`${e.name ?? index}`, scene)
        mat.ambientColor = Color3.FromArray(e.ambient)
        mat.diffuseColor = Color3.FromArray(e.diffuse)
        mat.alpha = e.diffuse[3] ?? 1
        mat.specularColor = Color3.FromArray(e.specular)
        //https://computergraphics.stackexchange.com/questions/1515/what-is-the-accepted-method-of-converting-shininess-to-roughness-and-vice-versa
        mat.roughness = Math.pow(0.25 * e.shininess, 0.2)
        if (e.textureIndex && e.textureIndex > -1) {
            mat.diffuseTexture = textures[e.textureIndex]
        }
        if (e.fileName) {
            let fineUrl = `${rootUrl}/${e.fileName}`
            fineUrl = fineUrl.replace(/\/+/, "/")
            mat.diffuseTexture = new Texture(fineUrl, scene)
        }

        mat.sideOrientation = 1
        mat.backFaceCulling = false
        multiMat.subMaterials.push(mat)
    })
    return multiMat
}

function parseSubMesh(pmd: MMDModelData, mmdMesh: Mesh) {
    let mark = 0
    mmdMesh.subMeshes.length = 0
    pmd.materials.forEach((e, index) => {
        let count = e.faceCount * 3
        let subMesh = new SubMesh(index, 0, mmdMesh.getTotalVertices(), mark, count, mmdMesh)
        mark += count
    })
}

export function parseMesh(pmd: MMDModelData, scene: Scene) {
    let mmdMesh = new Mesh("mmd", scene)
    let positions = []
    let indices = []
    let normals = []
    let uvs = []
    let skinIndices = []
    let skinWeights = []

    // position normal uv
    for (let i = 0; i < pmd.vertices.length; i++) {
        let vertex = pmd.vertices[i]
        positions.push(...vertex.position)
        normals.push(...vertex.normal)
        uvs.push(...vertex.uv)

        let temp = [0, 0, 0, 0]
        vertex.skinWeights.forEach((value, index) => temp[index] = value)
        skinWeights.push(...temp)

        temp = [0, 0, 0, 0]
        vertex.skinIndices.forEach((value, index) => temp[index] = value)
        skinIndices.push(...temp)
    }
    for (let i = 0; i < pmd.faces.length; i++) {
        let f = pmd.faces[i].indices
        let temp = f[0]
        f[0] = f[1]
        f[1] = temp
        indices.push(...f)
    }


    let vertexData = new VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.uvs = uvs
    vertexData.matricesWeights = skinWeights
    vertexData.matricesIndices = skinIndices
    vertexData.applyToMesh(mmdMesh, true)
    parseSubMesh(pmd, mmdMesh)
    return mmdMesh
}

function parsSkeleton(pmd: MMDModelData, scene: Scene) {
    let skeleton = new Skeleton("sk", scene.getUniqueId().toString(), scene)
    for (let i = 0; i < pmd.bones.length; i++) {
        const boneData = pmd.bones[i];
        let parent = null
        if (boneData.parentIndex > -1) {
            parent = skeleton.bones[boneData.parentIndex]
        }
        let position = Vector3.FromArray(boneData.position)
        let m = Matrix.Compose(Vector3.One(), Quaternion.Identity(), position.subtract(parent?.position || Vector3.Zero()))
        let bone = new Bone(boneData.name, skeleton, parent, m)
        // bone.setScale(Vector3.One())
        // bone.setRotationQuaternion(Quaternion.Identity(), Space.BONE)

        bone.setPosition(position, Space.LOCAL)

    }
    skeleton.returnToRest()
    return skeleton
}

function parseTextures(pmd: MMDModelData, scene: Scene, rootUrl: string) {
    let textures: Texture[] = []
    if (!pmd.textures) return []
    pmd.textures.forEach(e => {
        let fineUrl = `${rootUrl}/${e}`
        fineUrl = fineUrl.replace(/[\/+]/, "/")
        fineUrl = fineUrl.replace(/[\\+]/, "/")
        let tex = new Texture(fineUrl, scene, false, false)
        console.log(fineUrl)
        textures.push(tex)
    })
    return textures
}


export async function loadVmdAnimationAsync(url: string, mmdMesh: Mesh) {
    let raw = await Tools.LoadFileAsync(url, true)
    let vmd = parser.parseVmd(raw)
    console.log(vmd)
    let animations = parseAnimation(vmd)
    applyAnimationToSkeleton(mmdMesh.skeleton!, animations)
}


class MMDEase extends EasingFunction implements IEasingFunction {

}


type MMDBoneAnimation = { boneName: string, positionAnimation: Animation, rotationAnimation: Animation }
type MMDMorphAnimation = { morphName: string, }

function parseAnimation(vmd: MMDAnimationData) {
    let motionsMap = new Map<string, MMDMotion[]>()
    let morphsMap = new Map<string, Animation>()
    vmd.motions.forEach(e => {
        motionsMap.set(e.boneName, motionsMap.get(e.boneName) || [])
        motionsMap.get(e.boneName)!.push(e)
    })

    let boneAnimations: MMDBoneAnimation[] = []
    motionsMap.forEach((value, boneName /*boneName*/) => {
        value.sort((a, b) => a.frameNum - b.frameNum) // 排序保证遍历时按帧顺序来
        let rate = 30
        let positionKeys: IAnimationKey[] = []
        let rotationKeys: IAnimationKey[] = []
        for (let i = 0; i < value.length; i++) {
            const last = value[i - 1] || null
            const current = value[i]
            const next = value[i + 1] || null
            let positionInTangent
            let positionOutTangent
            let rotationInTangent
            let rotationOutTangent

            let getHermite = function (index: number, interpolation: number[]) {
                let x1 = interpolation[index + 0] / 127
                let x2 = interpolation[index + 8] / 127
                let y1 = interpolation[index + 4] / 127
                let y2 = interpolation[index + 12] / 127
                // return bezierToHermite(x1, y1, x2, y2)
                return [(1 - y2) / (1 - x2), y1 / x1]
            }


            let [inT1, outT1] = getHermite(0, current.interpolation)
            let [inT2, outT2] = getHermite(1, current.interpolation)
            let [inT3, outT3] = getHermite(2, current.interpolation)
            let [inT4, outT4] = getHermite(3, current.interpolation)
            positionInTangent = Vector3.FromArray([inT1, inT2, inT3])
            positionOutTangent = Vector3.FromArray([outT1, outT2, outT3])
            rotationInTangent = Quaternion.FromArray([inT4, inT4, inT4, inT4])
            rotationOutTangent = Quaternion.FromArray([outT4, outT4, outT4, outT4])
            // babylonjs 的切线斜率是计算帧数量的, 而mmd的切线斜率计算是两关键帧之间标准化 0 到 1的
            if (last) {
                let scale = 1 / (current.frameNum - last.frameNum)
                positionInTangent.scaleInPlace(scale)
                rotationInTangent.scaleInPlace(scale)
                console.log(positionInTangent, current.frameNum - last.frameNum)

            }
            if (next) {
                let scale = 1 / (next.frameNum - current.frameNum)
                positionOutTangent.scaleInPlace(scale)
                rotationOutTangent.scaleInPlace(scale)
            }

            positionKeys.push({
                frame: current.frameNum,
                value: Vector3.FromArray(current.position),
            })
            rotationKeys.push({
                frame: current.frameNum,
                value: Quaternion.FromArray(current.rotation),
            })
        }

        let positionAnimation = new Animation(`${boneName}.position`, "position", rate, Animation.ANIMATIONTYPE_VECTOR3)
        let rotationAnimation = new Animation(`${boneName}.rotationQuaternion`, "rotationQuaternion", rate, Animation.ANIMATIONTYPE_QUATERNION)
        positionAnimation.setKeys(positionKeys)
        rotationAnimation.setKeys(rotationKeys)

        boneAnimations.push({
            boneName,
            positionAnimation,
            rotationAnimation
        })

    })
    console.log("boneAnimations: ", boneAnimations)
    console.log(motionsMap)
    return boneAnimations
}


function applyAnimationToSkeleton(skeleton: Skeleton, boneAnimations: MMDBoneAnimation[]) {
    if (!skeleton) return
    let animationGroup = new AnimationGroup(skeleton.name, skeleton.getScene())
    for (let i = 0; i < boneAnimations.length; i++) {
        let boneAnimation = boneAnimations[i]
        let boneIndex = skeleton.getBoneIndexByName(boneAnimation.boneName)
        let bone = skeleton.bones[boneIndex]
        boneAnimation.positionAnimation.getKeys().map(e => (e.value as Vector3).addInPlace(bone.position))
        animationGroup.addTargetedAnimation(boneAnimation.positionAnimation, bone)
        animationGroup.addTargetedAnimation(boneAnimation.rotationAnimation, bone)

    }
    animationGroup.play()
}
