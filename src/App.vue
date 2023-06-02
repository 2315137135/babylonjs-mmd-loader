<template>
  <canvas id="bjs">
  </canvas>
</template>


<script lang="ts" setup>
import {onMounted, onUnmounted} from "vue";
import {ArcRotateCamera, Color3, DirectionalLight, Engine, Scene, Vector3} from "@babylonjs/core";
import "@babylonjs/inspector"
import {ImportMMDMeshAsync, loadVmdAnimationAsync} from "./lib/mmd-loader.ts";

async function createScene(scene: Scene) {
  scene.debugLayer.show({embedMode: true}).then()
  scene.clearColor = Color3.White().scale(0.7).toColor4()
  scene.ambientColor = Color3.FromHexString("#F3D5DF")
  scene.imageProcessingConfiguration.toneMappingEnabled = true
  let sun = new DirectionalLight("sun", Vector3.FromArray([-1, -2.5, 5]), scene)
  sun.intensity = 1.5
  let camera = new ArcRotateCamera("", -1.57, 1.5, 30, Vector3.Up().scale(15), scene)
  camera.attachControl()

  //https://www.aplaybox.com/details/model/tNkGgxoWN4Ql
  // let mesh = await ImportMMDMeshAsync("/pmx/yyb", "/yyb.pmx", scene)
  let mesh = await ImportMMDMeshAsync("/mmd/", "/miku_v2.pmd", scene)
  // let mesh = await ImportMMDMeshAsync("http://localhost:5173/models/pmx/[MODELS] Lovesick girls ver.1", "[LSG] Jennie (Miku) ver.1.pmx", scene)
  await loadVmdAnimationAsync("/vmd/wavefile_v2.vmd", mesh)


  // new Debug.SkeletonViewer(mesh.skeleton!, mesh, scene, true, 1, {displayMode: 0})

  // let ik = CCDIkController.CreateFromEffectBoneIndex(mesh, 74, 2, {iteration: 10, ikBoneIndex: 90})
  // let ik2 = CCDIkController.CreateFromEffectBoneIndex(mesh, 42, 2, {iteration: 10, ikBoneIndex: 89})

  // console.log(ik)
}

onMounted(() => {
  let engine = new Engine(document.querySelector("#bjs") as HTMLCanvasElement)
  let scene = new Scene(engine)

  let renderLoop = function () {
    scene.render()
  }

  createScene(scene).then(() => {
    engine.runRenderLoop(renderLoop)
  })

  onUnmounted(() => {
    scene.dispose()
    engine.dispose()
  })
})

</script>


<style scoped>
#bjs {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
