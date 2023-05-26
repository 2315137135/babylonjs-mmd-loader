import {MMDData, MMDParser} from "mmd-parser";
import {
    Bone,
    Color3,
    Matrix,
    Mesh,
    MultiMaterial, Quaternion,
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
import {Debug} from "@babylonjs/core/Legacy/legacy";

const parser = new MMDParser.Parser()

export async function ImportMMDMeshAsync(rootUrl: string, url: string, scene: Scene) {
    let fineUrl = `${rootUrl}/${url}`
    fineUrl = fineUrl.replace(/\/+/, "/")
    let rawData = await Tools.LoadFileAsync(fineUrl, true)
    let pmd = parser.parsePmd(rawData)
    console.log(pmd)
    let mmdMesh = await parseMesh(pmd, scene)
    let mat = parseMaterial(pmd, scene, rootUrl)
    let skeleton = parsSkeleton(pmd, scene)

    mmdMesh.skeleton = skeleton
    mmdMesh.material = mat
    return mmdMesh
}

export function parseMaterial(pmd: MMDData, scene: Scene, rootUrl: string) {
    let multiMat = new MultiMaterial("")
    pmd.materials.forEach((e, index) => {
        let mat = new StandardMaterial(`mmd_${index}`, scene)
        mat.ambientColor = Color3.FromArray(e.ambient)
        mat.diffuseColor = Color3.FromArray(e.diffuse)
        mat.specularColor = Color3.FromArray(e.specular)
        //https://computergraphics.stackexchange.com/questions/1515/what-is-the-accepted-method-of-converting-shininess-to-roughness-and-vice-versa
        mat.roughness = Math.pow(0.25 * e.shininess, 0.2)
        if (e.fileName) {
            let fineUrl = `${rootUrl}/${e.fileName}`
            fineUrl = fineUrl.replace(/\/+/, "/")
            mat.diffuseTexture = new Texture(fineUrl, scene)
        }

        mat.sideOrientation = 0
        mat.backFaceCulling = false
        multiMat.subMaterials.push(mat)
    })
    return multiMat
}

function parseSubMesh(pmd: MMDData, mmdMesh: Mesh) {
    let mark = 0
    mmdMesh.subMeshes.length = 0
    pmd.materials.forEach((e, index) => {
        let count = e.faceCount * 3
        new SubMesh(index, 0, mmdMesh.getTotalVertices(), mark, count, mmdMesh)
        mark += count
    })
}

export function parseMesh(pmd: MMDData, scene: Scene) {
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

function parsSkeleton(pmd: MMDData, scene: Scene) {
    let skeleton = new Skeleton("sk", scene.getUniqueId().toString(), scene)
    for (let i = 0; i < pmd.bones.length; i++) {
        const boneData = pmd.bones[i];
        let parent = null
        if (boneData.parentIndex > -1) {
            parent = skeleton.bones[boneData.parentIndex]
        }
        let m = Matrix.Compose(Vector3.One(), Quaternion.Identity(), Vector3.FromArray(boneData.position))
        let bone = new Bone(boneData.name, skeleton, undefined, m)
        bone.setParent(parent, false)
        bone.setScale(Vector3.One())
        bone.setRotation(Vector3.Zero())
        bone.setPosition(Vector3.FromArray(boneData.position), Space.BONE)

    }
    skeleton.setCurrentPoseAsRest()
    skeleton.returnToRest()
    // skeleton.setCurrentPoseAsRest()
    return skeleton
}
