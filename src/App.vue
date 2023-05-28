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
  let sun = new DirectionalLight("sun", Vector3.FromArray([-1, -2.5, 2]), scene)
  sun.intensity = 1.5
  let camera = new ArcRotateCamera("", -1.57, 1.5, 30, Vector3.Up().scale(15), scene)
  camera.attachControl()

  //https://www.aplaybox.com/details/model/tNkGgxoWN4Ql
  // let mesh = await ImportMMDMeshAsync("/pmx/yyb", "/yyb.pmx", scene)
  let mesh = await ImportMMDMeshAsync("/mmd", "/miku_v2.pmd", scene)
  await loadVmdAnimationAsync("/vmd/wavefile_v2.vmd", mesh)

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
