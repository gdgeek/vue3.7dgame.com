<template>
    <el-card class="box-card" style="margin-bottom: 10px">
        <div slot="header" class="clearfix">
            <b>定位物体变换</b>

        </div>
        <br />
        <el-form v-if="props.data && props.data.scale && props.data.rotate && props.data.position" :model="props.data"
            label-width="auto" style="max-width: 600px">
            <!--三元向量输入element ui, 在一行,只能是数字，然后size是mini，前面标题是缩放-->
            <el-form-item label="缩放">
                <el-input v-model.number="props.data.scale.x" placeholder="X" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.scale.y" placeholder="Y" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.scale.z" placeholder="Z" size="small" type="number"
                    style="width: 60px;" />
            </el-form-item>
            <el-form-item label="旋转">
                <el-input v-model.number="props.data.rotate.x" placeholder="X" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.rotate.y" placeholder="Y" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.rotate.z" placeholder="Z" size="small" type="number"
                    style="width: 60px;" />
            </el-form-item>
            <el-form-item label="位置">
                <el-input v-model.number="props.data.position.x" placeholder="X" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.position.y" placeholder="Y" size="small" type="number"
                    style="width: 60px;" />
                <el-input v-model.number="props.data.position.z" placeholder="Z" size="small" type="number"
                    style="width: 60px;" />
            </el-form-item>
        </el-form>
        <el-button icon="check" @click="handleSave" size="small" style="width: 100%">
            保存数据
        </el-button>
    </el-card>
</template>

<script setup lang="ts">

import { on } from "events";
import { onMounted, Ref } from 'vue'


interface TransformData {
    scale: { x: number; y: number; z: number }
    rotate: { x: number; y: number; z: number }
    position: { x: number; y: number; z: number }
}


const handleSave = () => {

    emit("save", {
        scale: props.data.scale,
        rotate: props.data.rotate,
        position: props.data.position
    });
};

const emit = defineEmits<{
    (e: 'save', data: any): void

}>()
//启动时候执行
onMounted(() => {

    if (props.data) {
        {
            if (!props.data.scale) {
                props.data.scale = { x: 1, y: 1, z: 1 };
            }
            if (!props.data.rotate) {
                props.data.rotate = { x: 0, y: 0, z: 0 };
            }
            if (!props.data.position) {
                props.data.position = { x: 0, y: 0, z: 0 };
            }
        }


    }
});


const props = withDefaults(defineProps<{
    data: Partial<TransformData>
}>(), {
    data: () => ({
        scale: { x: 1, y: 1, z: 1 },
        rotate: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: 0, z: 0 }
    })
})


</script>
