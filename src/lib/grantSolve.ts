import {Bone, Quaternion, Skeleton} from "@babylonjs/core";
import {MMDBoneData} from "mmd-parser";


export class GrantSolve {
    _grantResultMap = new Map()

    constructor(private skeleton: Skeleton, private data: MMDBoneData[]) {
        this.skeleton.getScene().onBeforeRenderObservable.add(e => {
            this._grantResultMap.clear()
            for (let i = 0; i < skeleton.bones.length; i++) {
                this.updateOne(i)
            }
        })

    }

    updateOne(boneIndex: number) {
        const bones = this.skeleton.bones;
        const bonesData = this.data
        const boneData = bonesData[boneIndex];
        const bone = bones[boneIndex];

        if (this._grantResultMap.has(boneIndex)) return;

        const quaternion = Quaternion.Identity()
        this._grantResultMap.set(boneIndex, quaternion.copyFrom(bone.rotationQuaternion));

        if (boneData.grant &&
            !boneData.grant.isLocal && boneData.grant.affectRotation) {

            const parentIndex = boneData.grant.parentIndex;
            const ratio = boneData.grant.ratio;

            if (!this._grantResultMap.has(parentIndex)) {

                this.updateOne(parentIndex);

            }

            this.addBoneRotation(bone, this._grantResultMap.get(parentIndex), ratio);

        }

    }

    addBoneRotation(bone: Bone, rotation: Quaternion, ratio: number) {
        let q = Quaternion.Identity()
        q = Quaternion.Slerp(q, rotation, ratio)
        q = bone.rotationQuaternion.multiply(q)
        bone.setRotationQuaternion(q)
    }
}
