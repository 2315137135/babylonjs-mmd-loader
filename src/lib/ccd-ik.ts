import {
    Bone,
    GizmoManager,
    InspectableType,
    Mesh,
    Nullable,
    Observer,
    Quaternion,
    Scalar,
    Space,
    TmpVectors,
    TransformNode,
    Vector3
} from "@babylonjs/core";

interface Link {
    boneIndex: number
    limitation?: Vector3
}

export interface CCDIkOption {
    // 控制的末端骨骼的索引
    effectIndex: number
    // 解算次数
    links: Link[],
    iteration?: number
    ikBoneIndex?: number

    maxAngle?: number
    minAngle?: number
}


/**
 *
 */
export class CCDIkController extends TransformNode {
    private _updateHandle?: Nullable<Observer<any>>
    private _debugGizmo: GizmoManager | null = null
    private readonly _targetMesh: Mesh;

    constructor(name: string, skeletonMesh: Mesh, private option: CCDIkOption) {
        super("CCDIkController", skeletonMesh.getScene());
        this._targetMesh = skeletonMesh
        this.parent = this._targetMesh
        this.position.copyFrom(skeletonMesh.skeleton!.bones[option.effectIndex].getAbsolutePosition())
        this.ikEnabled = true

        this.inspectableCustomProperties = this.inspectableCustomProperties ?? []
        this.inspectableCustomProperties.push({

            label: "ikEnabled",
            propertyName: "ikEnabled",
            type: InspectableType.Checkbox

        })
    }


    private _ikEnabled = false

    get ikEnabled(): boolean {
        return this._ikEnabled;
    }

    set ikEnabled(value: boolean) {
        if (value === this._ikEnabled) return
        if (value) {
            this._updateHandle = this._scene.onAfterAnimationsObservable.add(this.updateIk.bind(this))
        } else {
            if (this._updateHandle) this._updateHandle._willBeUnregistered = true
            this._updateHandle = null
        }
        this._ikEnabled = value;
    }

    get debugEnable() {
        return !!this._debugGizmo
    }

    set debugEnable(value: boolean) {
        if (this.debugEnable === value) return
        if (value) {
            this._debugGizmo = new GizmoManager(this._scene)
            this._debugGizmo.attachToNode(this)
            this._debugGizmo.positionGizmoEnabled = true
            this._debugGizmo.enableAutoPicking = false
        } else {
            this._debugGizmo?.dispose()
            this._debugGizmo = null
        }
    }

    static CreateFromEffectBone(mesh: Mesh, effectBone: Bone, chainLength = 3, option: Partial<CCDIkOption> = {}) {
        if (!mesh.skeleton) throw Error("The mesh does not have a skeleton property")
        if (!effectBone) throw Error("Invalid bones")

        let currentLinkBone: Bone | null = effectBone
        let fineOption: CCDIkOption = {effectIndex: effectBone.getIndex(), links: [], ...option}
        for (let i = 0; i < chainLength; i++) {
            currentLinkBone = currentLinkBone.getParent()
            if (!currentLinkBone) break
            fineOption.links[i] = {...fineOption.links[i], boneIndex: currentLinkBone.getIndex()}
        }
        // fineOption.links = fineOption.links.reverse()
        return new CCDIkController("CCDIkController", mesh, fineOption)
    }

    static CreateFromEffectBoneIndex(mesh: Mesh, effectBoneIndex: number, chainLength = 2, option: Partial<CCDIkOption> = {}) {
        if (!mesh.skeleton) throw Error("The mesh does not have a skeleton property")
        let effectBone = mesh.skeleton.bones[effectBoneIndex]
        if (!effectBone) throw Error("Invalid bones")
        return this.CreateFromEffectBone(mesh, effectBone, chainLength, option)
    }


    updateIk() {
        let ikOption = this.option
        let skeleton = this._targetMesh.skeleton
        if (!skeleton) return;

        let ikBoneIndex = ikOption.ikBoneIndex ?? -1
        if (ikBoneIndex >= 0 && ikBoneIndex < skeleton.bones.length) {
            let ikBone = skeleton.bones[ikBoneIndex]
            skeleton.computeAbsoluteTransforms()
            ikBone.computeAbsoluteTransforms()
            //TODO 解决动画播放时骨骼世界位置不更新的问题
            this.position.copyFrom(ikBone.getAbsolutePosition())
        }
        let target = this.position.clone()


        let effect = skeleton.bones[ikOption.effectIndex]
        let iteration = ikOption.iteration ?? 1
        for (let i = 0; i < iteration; i++) {
            let power = 1

            ikOption.links.forEach(link => {
                let bone = skeleton!.bones[link.boneIndex]

                let targetV = target.subtract(bone.getAbsoluteTransform().getTranslation()).normalize()
                let effectV = effect.getAbsoluteTransform().getTranslation().subtract(bone.getAbsoluteTransform().getTranslation()).normalize()
                // @ts-ignore
                Vector3.TransformNormalToRef(targetV, bone.getRotationMatrix(Space.WORLD, null).invert(), targetV)
                // @ts-ignore
                Vector3.TransformNormalToRef(effectV, bone.getRotationMatrix(Space.WORLD, null).invert(), effectV)

                let angle = Vector3.Dot(targetV, effectV)
                angle = Scalar.Clamp(angle, -1, 1)
                // if (angle > 1.0) {
                //     angle = 1.0;
                // } else if (angle < -1.0) {
                //     angle = -1.0;
                // }
                angle = Math.acos(angle) * power
                power *= 0.9
                if (Math.abs(angle) < 0.0001) return;

                if (ikOption.maxAngle !== undefined) {
                    if (angle >= ikOption.maxAngle) {
                        angle = ikOption.maxAngle
                    }
                }


                let axis = Vector3.Cross(targetV, effectV).normalize()
                let scale = TmpVectors.Vector3[0].copyFrom(bone.scaling)
                // bone.rotate(axis, -angle, Space.LOCAL)
                bone.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxis(axis, -angle))
                bone.setScale(scale)

                if (link.limitation !== undefined) {
                    let c = bone.rotationQuaternion.w;
                    if (c > 1.0) c = 1.0;
                    const c2 = Math.sqrt(1 - c * c);
                    bone.rotationQuaternion.set(-link.limitation.x * c2,
                        link.limitation.y * c2,
                        link.limitation.z * c2,
                        c);
                }
                bone.computeAbsoluteTransforms()

            })
        }

    }

    dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        if (this._debugGizmo) this._debugGizmo.dispose()
        if (this._updateHandle) this._updateHandle._willBeUnregistered = true
    }
}
