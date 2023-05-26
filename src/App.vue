<template>
  <canvas id="bjs">

  </canvas>
</template>


<script lang="ts" setup>
import {onMounted, onUnmounted} from "vue";
import {Engine, MeshBuilder, Scene, Tools, VertexData} from "@babylonjs/core";
import "@babylonjs/inspector"
import {MMDParser} from "mmd-parser"

type Tuple<TItem, TLength extends number> = [TItem, ...TItem[]] & { length: TLength };

type Vec2 = [number, number]
type Vec3 = [number, number, number]

interface MMDVertex {
  edgeFlag: number
  position: Vec3
  normal: Vec3
  uv: Vec2
  skinIndices: []
  skinWeights: []
}

interface MMDData {
  vertices: MMDVertex []
  faces: { indices: Vec3 }[]
  boneFrameNames: { name: string }[]
  boneFrames: { boneIndex: number, frameIndex: number }[]
}

declare namespace MMDParser {
  class Parser {
    parsePmd(data: ArrayBuffer | string): MMDData
  }
}


async function createScene(scene) {
  scene.debugLayer.show({embedMode: true}).then()
  let box = MeshBuilder.CreateBox("box")

  let parser = new MMDParser.Parser()
  Tools.LoadFileAsync("/mmd/miku_v2.pmd", true).then(value => {

    let pmd = parser.parsePmd(value)
    let positions = []
    let indices = []
    let normals = []
    console.log(pmd)

    for (let i = 0; i < pmd.vertices.length; i++) {
      let vertex = pmd.vertices[i]
      positions.push(...vertex.position)
      normals.push(...vertex.normal)
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

    vertexData.applyToMesh(box, true)
    scene.createDefaultCameraOrLight(true, true, true)

  })

  scene.createDefaultCameraOrLight(true, true, true)
}

onMounted(() => {
  let engine = new Engine(document.querySelector("#bjs") as HTMLCanvasElement)
  let scene = new Scene(engine)

  let renderLoop = function () {
    scene.render()
  }

  createScene(scene).then(value => {
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
