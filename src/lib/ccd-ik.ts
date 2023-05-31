import {Scalar, Skeleton, Space, TmpVectors, TransformNode, Vector3} from "@babylonjs/core";

/**@typedef  {{
 * target:BABYLON.TransformNode,
 * effect:number,
 * links:number[] }} IK*/

type IKConfig = {
    target: TransformNode,
    effect: number
    links: number[]
}

function updateIk(ik: IKConfig, skeleton: Skeleton) {
    let target = ik.target.getWorldMatrix().getTranslation()
    let effect = skeleton.bones[ik.effect]
    if (Vector3.DistanceSquared(target, effect.getWorldMatrix().getTranslation()) <= 0.005) {
        return
    }

    ik.links.forEach(link => {
        let bone = skeleton.bones[link]
        let tmpV1 = TmpVectors.Vector3[0]

        let targetV = target.subtract(bone.getWorldMatrix().getTranslation()).normalize()
        let effectV = effect.getAbsoluteTransform().getTranslation().subtract(bone.getWorldMatrix().getTranslation()).normalize()

        let axis = Vector3.Cross(targetV, effectV)
        let angle = Vector3.Dot(targetV, effectV)
        angle = Scalar.Clamp(angle, -1, 1)

        angle = -Math.acos(angle)

        if (Math.abs(angle) <= 0.0001) {
            return
        }
        bone.rotate(axis, angle, Space.WORLD)
    })
}
