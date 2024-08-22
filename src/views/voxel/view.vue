<template>
  <div v-loading="loading" class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">体素名称：</b>
            <span v-if="voxelData">{{ voxelData.name }}</span>
          </template>
          <div v-loading="false" class="box-item">
            <Voxel
              v-if="voxelData"
              ref="three"
              :file="voxelData.file"
              @loaded="loaded"
              @progress="progress"
            ></Voxel>
          </div>
          <el-progress :percentage="percentage"></el-progress>
        </el-card>
        <br />
        <el-card v-loading="false" class="box-card">
          <el-button
            style="width: 100%"
            type="primary"
            size="small"
            @click="createVerse"
          >
            <font-awesome-icon icon="plus"></font-awesome-icon>
            &nbsp;用体素创建【宇宙】
          </el-button>
        </el-card>
        <br />
      </el-col>
      <el-col :sm="8">
        <el-card class="box-card">
          <template #header> <b>体素信息</b>: </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" label="条目"></el-table-column>
              <el-table-column prop="text" label="内容"></el-table-column>
            </el-table>
            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="success" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  改名
                </el-button>
                <el-button type="danger" size="small" @click="deleteWindow">
                  <i class="el-icon-delete"></i>
                  删除
                </el-button>
              </el-button-group>
            </aside>
          </div>
        </el-card>
        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useFileStore } from "@/store/modules/config";
import { getVoxel, putVoxel, deleteVoxel } from "@/api/resources/index";
import { createVerseFromResource } from "@/api/v1/meta-verse";
import { postFile } from "@/api/v1/files";
import { printVector3 } from "@/assets/js/helper";
import Voxel from "@/components/Voxel.vue";

const loading = ref(false);
const voxelData = ref<any>(null);
const percentage = ref(0);
const expire = ref(false);

const store = useFileStore().store;
const route = useRoute();
const router = useRouter();

const id = computed(() => route.query.id as string);

const prepare = computed(
  () => voxelData.value != null && voxelData.value.info !== null
);

const tableData = computed(() => {
  if (voxelData.value && prepare.value) {
    const info = JSON.parse(voxelData.value.info);
    return [
      { item: "模型名称", text: voxelData.value.name },
      { item: "创建者", text: voxelData.value.author.nickname },
      { item: "创建时间", text: voxelData.value.created_at },
      { item: "文件大小", text: voxelData.value.file.size + "字节" },
      { item: "体素尺寸", text: printVector3(info.size) },
      { item: "体素中心", text: printVector3(info.center) },
      { item: "体素数量", text: info.count },
    ];
  } else {
    return [];
  }
});

const dataInfo = computed(() =>
  prepare.value ? JSON.parse(voxelData.value.info) : null
);

const meshSize = computed(() =>
  prepare.value ? dataInfo.value.size : "等待更新"
);

const meshCenter = computed(() =>
  prepare.value ? dataInfo.value.center : "等待更新"
);

const loadVoxelData = async () => {
  expire.value = true;
  try {
    const response = await getVoxel(id.value);
    voxelData.value = (response as any).data;
  } catch (error) {
    console.error(error);
  }
};

const progress = (percentage: number) => {
  percentage = percentage;
};

const createVerse = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      "用此模型创建【宇宙】",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputValue: voxelData.value.name,
        inputErrorMessage: "请填写相应名称",
      }
    );

    if (value) {
      loading.value = true;
      try {
        const response = await createVerseFromResource(
          "Voxel",
          value,
          voxelData.value
        );
        ElMessage.success("你创建了新的场景: " + value);
        setTimeout(() => {
          router.push("/meta-verse/index");
        }, 300);
      } catch (error) {
        ElMessage.error("创建失败: " + error);
      } finally {
        loading.value = false;
      }
    } else {
      ElMessage.info("取消输入");
    }
  } catch {
    ElMessage.info("取消输入");
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      closeOnClickModal: false,
      type: "warning",
    });

    await deleteVoxel(voxelData.value.id);
    ElMessage.success("删除成功!");
    router.push("/ResourceAdmin/voxel/index");
  } catch {
    ElMessage.info("已取消删除");
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      "请输入新名称",
      "修改模型名称",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputValue: voxelData.value.name,
      }
    );

    if (value) {
      await named(voxelData.value.id, value);
      ElMessage.success("新的模型名称: " + value);
    } else {
      ElMessage.info("取消输入");
    }
  } catch {
    ElMessage.info("取消输入");
  }
};

const named = async (id: string, name: string) => {
  const voxel = { name };
  try {
    const response = await putVoxel(id, voxel);
    voxelData.value.name = response.data.name;
  } catch (error) {
    console.error(error);
  }
};

const updateVoxel = async (imageId: number, info: any) => {
  const voxel = { image_id: imageId, info: JSON.stringify(info) };
  try {
    const response = await putVoxel(voxelData.value.id, voxel);
    voxelData.value.image_id = response.data.image_id;
    voxelData.value.info = response.data.info;
    console.log(dataInfo.value);
    console.log(meshCenter.value);
    expire.value = false;
  } catch (error) {
    console.error(error);
  }
};

const saveFile = async (
  md5: string,
  extension: string,
  info: any,
  file: File,
  handler: any
) => {
  const data = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: store.fileUrl(md5, extension, handler, "screenshot/voxel"),
  };

  const response = await postFile(data);
  await updateVoxel(response.data.id!, info);
};

const loaded = async (info: any) => {
  if (prepare.value) {
    expire.value = false;
    return;
  }

  const blob = await screenshot();
  blob.name = voxelData.value.name;
  blob.extension = ".jpg";
  const file = blob;
  const md5 = await store.fileMD5(file);
  const handler = await store.publicHandler();

  const has = await store.fileHas(
    md5,
    file.extension,
    handler,
    "screenshot/voxel"
  );
  if (!has) {
    await store.fileUpload(
      md5,
      file.extension,
      file,
      () => {},
      handler,
      "screenshot/voxel"
    );
  }

  await saveFile(md5, file.extension, info, file, handler);
};

const screenshot = () => {
  return (ref("three").value as any).screenshot();
};

onMounted(() => {
  loadVoxelData();
});
</script>

<style lang="scss" scoped>
@import "@/styles/view-style.scss";
</style>
