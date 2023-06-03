import {Bone, Nullable, Observer} from "@babylonjs/core";
import {MMDBoneGrantData} from "mmd-parser";

const _grantResultMap = new Map();

export class GrantSolve {
    private readonly updateHandle: Nullable<Observer<any>>;
    private targetBone: Bone;

    constructor(private bone: Bone, private data: MMDBoneGrantData) {
        this.targetBone = bone.getSkeleton().bones[data.parentIndex]
        bone.onDisposeObservable.addOnce(eventData => {
            this.dispose()
        })
        this.updateHandle = bone.getScene().onBeforeRenderObservable.add(this.update.bind(this))

        if (!this.targetBone) {
            this.dispose()
        }
    }

    update() {
        let {isLocal} = this.data
        if (this.data.affectPosition) {
            // TODO
        }
        if (this.data.affectRotation) {
            this.grantRotation(isLocal)
        }
    }

    grantPosition(isLocal: boolean) {
        //TODO
    }

    grantRotation(isLocal: boolean) {
        if (isLocal) {
            //TODO
        } else {
        }
    }

    dispose() {
        if (this.updateHandle) this.updateHandle._willBeUnregistered = true
    }
}
