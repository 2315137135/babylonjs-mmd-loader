import {
    MMDAnimationData,
    MMDModelData,
    MMDMorphAnimationData,
    MMDMorphData,
    MMDMotionAnimationData,
    MMDParser
} from "mmd-parser";
import {
    Animation,
    AnimationGroup,
    Bone,
    Color3,
    IAnimationKey,
    Matrix,
    Mesh,
    MorphTarget,
    MorphTargetManager,
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
import {parseIKs} from './ikParser.ts';
import {CCDIkController, CCDIkOption} from "./ccd-ik.ts";

const parser = new MMDParser.Parser()

export async function ImportMMDMeshAsync(rootUrl: string, url: string, scene: Scene) {

    let fineUrl = `${rootUrl}/${url}`
    let rawData = await Tools.LoadFileAsync(fineUrl, true)

    let mmdData
    if (url.includes(".pmd")) {
        mmdData = parser.parsePmd(rawData)
    } else {
        mmdData = parser.parsePmx(rawData)
    }
    let textures = parseTextures(mmdData, scene, rootUrl)
    let mmdMesh = await parseMesh(mmdData, scene)
    let mat = parseMaterial(mmdData, scene, rootUrl, textures)
    let skeleton = parseSkeleton(mmdData, scene)
    mmdMesh.skeleton = skeleton
    mmdMesh.material = mat
    mmdMesh.metadata = mmdData.metadata

    let iks = parseIKs(mmdData)
    iks.forEach(e => {
        let option: CCDIkOption = {
            effectIndex: e.effector,
            maxAngle: e.maxAngle,
            iteration: e.iteration,
            ikBoneIndex: e.target,
            links: []
        }

        e.links.forEach(e => {
            option.links.push({boneIndex: e.index, limitation: e.limitation})
        })
        let ik = new CCDIkController("CCD ik", mmdMesh, option)
        ik.debugEnable = false
    })
    scene.onBeforeRenderObservable.addOnce(eventData => {
        skeleton.returnToRest()
    })

    if (mmdData.metadata.format === "pmx") {
    }

    return mmdMesh
}


export function parseMaterial(mmdData: MMDModelData, scene: Scene, rootUrl: string, textures: Texture[]) {
    let multiMat = new MultiMaterial("")
    mmdData.materials.forEach((e, index) => {
        let mat = new StandardMaterial(`${e.name ?? index}`, scene)
        mat.sideOrientation = 0
        mat.backFaceCulling = false

        mat.ambientColor = Color3.FromArray(e.ambient)
        mat.diffuseColor = Color3.FromArray(e.diffuse)
        mat.alpha = e.diffuse[3] ?? 1
        mat.specularColor = Color3.FromArray(e.specular)
        //https://computergraphics.stackexchange.com/questions/1515/what-is-the-accepted-method-of-converting-shininess-to-roughness-and-vice-versa
        mat.roughness = 0.25 * Math.pow(e.shininess, 0.2)
        if (e.textureIndex && e.textureIndex > -1) {
            mat.diffuseTexture = textures[e.textureIndex]
        } else if (e.fileName) {
            let fineUrl = `${rootUrl}/${e.fileName}`
            mat.diffuseTexture = new Texture(fineUrl, scene)
        }
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

function parseMorph(data: MMDModelData, mmdMesh: Mesh) {
    let scene = mmdMesh._scene
    let morphTargetManager = mmdMesh.morphTargetManager = mmdMesh.morphTargetManager ?? new MorphTargetManager(scene)

    function updatePosition(positions: number [], morphData: MMDMorphData, scale: number) {
        for (let i = 0; i < morphData.elements.length; i++) {
            let element = morphData.elements[i]
            let index = element.index
            if (data.metadata.format === 'pmd') {
                index = data.morphs[0].elements[element.index].index;
            }
            positions[index * 3] += element.position[0]
            positions[index * 3 + 1] += element.position[1]
            positions[index * 3 + 2] += element.position[2]
        }
    }

    data.morphs.forEach((morphData, index) => {
        let positions = [...mmdMesh.getVerticesData("position") ?? []]
        if (positions.length <= 0) throw Error("The mesh has no position vertex data")
        let hasUpdate = false
        if (data.metadata.format === 'pmd') {
            if (index != 0) {
                updatePosition(positions, morphData, 1)
                hasUpdate = true
            }
        } else {
            if (morphData.type === 0 && false) { // group
                for (let j = 0; j < morphData.elementCount; j++) {
                    const morph2 = data.morphs[morphData.elements[j].index];
                    const ratio = morphData.elements[j].ratio;
                    if (morph2.type === 1) {
                        updatePosition(positions, morph2, ratio);
                        hasUpdate = true
                    } else {

                    }
                }

                let morphTarget = new MorphTarget(morphData.name, 0, scene)
                morphTarget.setPositions(positions)
                morphTargetManager.addTarget(morphTarget)
            } else if (morphData.type === 1) {
                updatePosition(positions, morphData, 1)
                hasUpdate = true
            } else if (morphData.type === 2) {
                // 不知道干嘛的, 预留
            }
        }
        if (hasUpdate) {
            let morphTarget = new MorphTarget(morphData.name, 0, scene)
            morphTarget.setPositions(positions)
            morphTargetManager.addTarget(morphTarget)
        }
    })
}

export function parseMesh(pmd: MMDModelData, scene: Scene) {
    let mmdMesh = new Mesh(pmd.metadata?.modelName.toString() || "mmd", scene)

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
        indices.push(...f)
    }
    let vertexData = new VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.uvs = uvs
    vertexData.matricesWeights = skinWeights
    vertexData.matricesIndices = skinIndices
    vertexData.applyToMesh(mmdMesh, false)
    parseMorph(pmd, mmdMesh)
    parseSubMesh(pmd, mmdMesh)

    return mmdMesh
}

function parseSkeleton(pmd: MMDModelData, scene: Scene) {
    let skeleton = new Skeleton("sk", scene.getUniqueId().toString(), scene)
    for (let i = 0; i < pmd.bones.length; i++) {
        const boneData = pmd.bones[i];
        let parent = null
        if (boneData.parentIndex > -1) {
            parent = skeleton.bones[boneData.parentIndex]
        }
        let rotation = Quaternion.Identity()
        let scale = Vector3.One()
        let position = Vector3.FromArray(boneData.position)
        let m = Matrix.Compose(scale, rotation, position.subtract(parent?.getPosition(Space.BONE) || Vector3.Zero()))
        let bone = new Bone(boneData.name, skeleton, parent, m)

    }
    skeleton.returnToRest()
    return skeleton
}

function parseTextures(pmd: MMDModelData, scene: Scene, rootUrl: string) {
    let textures: Texture[] = []
    if (!pmd.textures) return []
    pmd.textures.forEach(e => {
        let fineUrl = `${rootUrl}/${e}`
        let tex = new Texture(fineUrl, scene, false, false)
        textures.push(tex)
    })
    return textures
}


export async function loadVmdAnimationAsync(url: string, mmdMesh: Mesh) {
    let raw = await Tools.LoadFileAsync(url, true)
    let vmd = parser.parseVmd(raw)
    let animations = parseAnimation(vmd)
    return applyAnimationToSkeleton(mmdMesh, animations)
}


type MMDBoneAnimation = { boneName: string, positionAnimation: Animation, rotationAnimation: Animation }
type MMDMorphAnimation = { morphName: string, morphAnimation: Animation }
type MMDAnimations = { boneAnimations: MMDBoneAnimation[], morphAnimations: MMDMorphAnimation[] }


function parseAnimation(vmd: MMDAnimationData): MMDAnimations {
    let motionsMap = new Map<string, MMDMotionAnimationData[]>()
    let morphsMap = new Map<string, MMDMorphAnimationData[]>()
    vmd.motions.forEach(e => {
        motionsMap.set(e.boneName, motionsMap.get(e.boneName) || [])
        motionsMap.get(e.boneName)!.push(e)
    })
    vmd.morphs.forEach(e => {
        morphsMap.set(e.morphName, morphsMap.get(e.morphName) || [])
        morphsMap.get(e.morphName)!.push(e)
    })

    let boneAnimations: MMDBoneAnimation[] = []
    let morphAnimations: MMDMorphAnimation[] = []
    let rate = 30

    motionsMap.forEach((value, boneName /*boneName*/) => {
        value.sort((a, b) => a.frameNum - b.frameNum) // 排序保证遍历时按帧顺序来
        let positionKeys: IAnimationKey[] = []
        let rotationKeys: IAnimationKey[] = []
        for (let i = 0; i < value.length; i++) {
            const current = value[i]
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

    morphsMap.forEach((e, morphName) => {
        e.sort((a, b) => a.frameNum - b.frameNum)
        let morphKeys: IAnimationKey[] = []
        for (let i = 0; i < e.length; i++) {
            const current = e[i]
            morphKeys.push({
                frame: current.frameNum,
                value: current.weight,
            })
        }
        let morphAnimation = new Animation(morphName, "influence", rate, Animation.ANIMATIONTYPE_FLOAT)
        morphAnimation.setKeys(morphKeys)
        morphAnimations.push({
            morphName,
            morphAnimation
        })
    })
    return {boneAnimations, morphAnimations}
}


function applyAnimationToSkeleton(mesh: Mesh, {boneAnimations, morphAnimations}: MMDAnimations,) {
    let {skeleton, morphTargetManager} = mesh
    let animationGroup = new AnimationGroup(mesh.name + "_mmd", mesh.getScene())
    if (skeleton) {
        for (let i = 0; i < boneAnimations.length; i++) {
            const boneAnimation = boneAnimations[i];
            let boneIndex = skeleton.getBoneIndexByName(boneAnimation.boneName)
            let bone = skeleton.bones[boneIndex]
            if (!bone) continue;
            let positionAnime = boneAnimation.positionAnimation.clone()
            positionAnime.getKeys().map(e => (e.value as Vector3).addInPlace(bone.position))
            animationGroup.addTargetedAnimation(positionAnime, bone)
            animationGroup.addTargetedAnimation(boneAnimation.rotationAnimation, bone)
        }
    }
    if (morphTargetManager) {
        let morphTargets = []
        for (let i = 0; i < morphTargetManager.numTargets; i++) {
            morphTargets.push(morphTargetManager.getTarget(i))
        }
        for (let i = 0; i < morphAnimations.length; i++) {
            let morphAnime = morphAnimations[i]
            let name = morphAnime.morphName
            let morphTarget = morphTargets.find(e => e.name === name)
            if (!morphTarget) continue;
            let animation = morphAnime.morphAnimation
            animationGroup.addTargetedAnimation(animation, morphTarget)
        }
    }
    animationGroup.normalize()
    animationGroup.play(true)
    return animationGroup
}
