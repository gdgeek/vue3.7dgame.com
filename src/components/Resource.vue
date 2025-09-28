<template>

    <resource-dialog :multiple="false" ref="resourceDialog" @selected="handleSelected" />


    <div v-if="props.resource">
        <el-card class="box-card">
            <!-- 强制刷新 polygen-view，当 file 改变时 -->
            <polygen-view ref="three" :file="props.resource.file" :key="props.resource.file" />
            <br />

            <el-button icon="box" @click="selecteModel" size="small" style="width: 100%">
                选择模型
            </el-button>

        </el-card>

    </div>
    <div v-else>

        <el-card class="box-card">

            <el-button icon="box" @click="selecteModel" size="small" style="width: 100%">
                选择模型
            </el-button>

        </el-card>


    </div>


</template>

<script setup lang="ts">
import { defineProps } from "vue";
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>(null)
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import PolygenView from "./PolygenView.vue";
const props = defineProps<{
    resource: any;
}>();
const handleSelected = (data: any, replace: boolean) => {

    emit("selected", data.context);
};

const emit = defineEmits<{
    (e: 'selected', data: any): void

}>()
const selecteModel = () => {
    resourceDialog.value?.openIt({ type: "polygen" });
    console.log("selecteModel");
};
</script>
