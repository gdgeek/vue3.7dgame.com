<template>
  <div v-loading="loading" class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">模型名称：</b>
            <span v-if="polygenData">{{ polygenData.name }}</span>
          </template>
          <div v-loading="expire" class="box-item">
            <three v-if="polygenData" ref="three" :file="polygenData.file" @loaded="loaded" @progress="progress">
            </three>
          </div>
          <el-progress :percentage="percentage"></el-progress>
        </el-card>
        <br />

        <el-card v-loading="expire" class="box-card">
          <el-button style="width: 100%" type="primary" size="small" @click="createVerse">
            <font-awesome-icon icon="plus"></font-awesome-icon>
            &nbsp;用此模型创建【宇宙】
          </el-button>
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header> <b>模型信息</b> : </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" label="条目"></el-table-column>
              <el-table-column prop="text" label="内容"></el-table-column>
            </el-table>

            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  改名
                </el-button>
                <el-button type="primary" size="small" @click="deleteWindow">
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
import Three from "@/components/Three.vue";
import { getPolygen, putPolygen, deletePolygen } from "@/api/resources/index";
import { createVerseFromResource } from "@/api/v1/meta-verse";
import { postFile } from "@/api/v1/files";
import { printVector3 } from "@/assets/js/helper";
import { useFileStore } from "@/store/modules/config";

const loading = ref(false);
const polygenData = ref<any>(null);
const expire = ref(false);
const percentage = ref(0);

const route = useRoute();
const router = useRouter();
const store = useFileStore().store;

const id = computed(() => route.query.id as string);
const prepare = computed(
  () => polygenData.value !== null && polygenData.value.info !== null
);
const dataInfo = computed(() =>
  prepare.value ? JSON.parse(polygenData.value.info) : null
);

const tableData = computed(() => {
  if (polygenData.value !== null && prepare.value) {
    return [
      { item: "模型名称", text: polygenData.value.name },
      { item: "创建者", text: polygenData.value.author.nickname },
      { item: "创建时间", text: polygenData.value.created_at },
      { item: "文件大小", text: `${polygenData.value.file.size}字节` },
      { item: "模型尺寸", text: printVector3(dataInfo.value.size) },
      { item: "模型中心点", text: printVector3(dataInfo.value.center) },
    ];
  } else {
    return [];
  }
});

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
        inputValue: polygenData.value.name,
        inputErrorMessage: "请填写相应名称",
      }
    );

    loading.value = true;

    await createVerseFromResource("Polygen", value, polygenData.value);

    ElMessage.success("你创建了新的场景: " + value);

    setTimeout(() => {
      router.push("/meta-verse/index");
    }, 300);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("创建失败: " + error);
    } else {
      ElMessage.info("取消输入");
    }
  } finally {
    loading.value = false;
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

    await deletePolygen(polygenData.value.id);

    ElMessage.success("删除成功!");
    router.push("/ResourceAdmin/polygen/index");
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
        inputValue: polygenData.value.name,
      }
    );

    await putPolygen(polygenData.value.id, { name: value });

    polygenData.value.name = value;

    ElMessage.success("新的模型名称: " + value);
  } catch {
    ElMessage.info("取消输入");
  }
};

const updatePolygen = async (imageId: number, info: any) => {
  try {
    const response = await putPolygen(polygenData.value.id, {
      image_id: imageId,
      info: JSON.stringify(info),
    });

    polygenData.value.image_id = response.data.image_id;
    polygenData.value.info = response.data.info;

    expire.value = false;
  } catch (error) {
    console.error(error);
  }
};

const saveFile = async (
  md5: string,
  extension: string,
  info: any,
  file: any,
  handler: any
) => {
  const data = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: store.fileUrl(md5, extension, handler, "screenshot/polygen"),
  };

  const response = await postFile(data);
  updatePolygen(response.data.id!, info);
};

const loaded = async (info: any) => {
  if (prepare.value) {
    expire.value = false;
    return;
  }

  try {
    const blob = await screenshot();
    blob.name = polygenData.value.name;
    blob.extension = ".jpg";
    const file = blob;
    const md5 = await store.fileMD5(file);
    const handler = await store.publicHandler();

    const has = await store.fileHas(
      md5,
      file.extension,
      handler,
      "screenshot/polygen"
    );

    if (!has) {
      await store.fileUpload(
        md5,
        file.extension,
        file,
        () => { },
        handler,
        "screenshot/polygen"
      );
    }

    await saveFile(md5, file.extension, info, file, handler);
  } catch (error) {
    console.error(error);
  }
};

const screenshot = () => {
  return (ref("three").value as any).screenshot();
};

onMounted(async () => {
  expire.value = true;
  const response = await getPolygen(id.value);
  polygenData.value = (response as any).data;
});
</script>

<style lang="scss" scoped>
@import "@/styles/view-style.scss";
</style>
