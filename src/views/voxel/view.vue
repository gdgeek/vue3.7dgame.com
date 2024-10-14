<template>
  <div v-loading="loading" class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">{{ $t("voxel.view.title") }}</b>
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
            &nbsp;{{ $t("voxel.view.titleStatement") }}
          </el-button>
        </el-card>
        <br />
      </el-col>
      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <b>{{ $t("voxel.view.info.title") }}</b
            >:
          </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column
                prop="item"
                :label="$t('voxel.view.info.label1')"
              ></el-table-column>
              <el-table-column
                prop="text"
                :label="$t('voxel.view.info.label2')"
              ></el-table-column>
            </el-table>
            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="success" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  {{ $t("voxel.view.info.name") }}
                </el-button>
                <el-button type="danger" size="small" @click="deleteWindow">
                  <i class="el-icon-delete"></i>
                  {{ $t("voxel.view.info.delete") }}
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
import { convertToLocalTime } from "@/utils/dataChange";

const loading = ref(false);
let voxelData = ref<any>(null);
const percentage = ref(0);
const expire = ref(false);
const store = useFileStore().store;
const route = useRoute();
const router = useRouter();
const id = computed(() => route.query.id as string);
const { t } = useI18n();

const prepare = computed(
  () => voxelData.value != null && voxelData.value.info !== null
);

const tableData = computed(() => {
  if (voxelData.value != null && prepare.value) {
    const info = JSON.parse(voxelData.value.info);

    return [
      { item: t("voxel.view.info.item1"), text: voxelData.value.name },
      {
        item: t("voxel.view.info.item2"),
        text: voxelData.value.author.nickname,
      },
      {
        item: t("voxel.view.info.item3"),
        text: convertToLocalTime(voxelData.value.created_at),
      },
      {
        item: t("voxel.view.info.item4"),
        text: voxelData.value.file.size + t("voxel.view.info.size"),
      },
      { item: t("voxel.view.info.item5"), text: printVector3(info.size) },
      { item: t("voxel.view.info.item6"), text: printVector3(info.center) },
      { item: t("voxel.view.info.item7"), text: info.count },
    ];
  } else {
    return [];
  }
});
const three = ref<InstanceType<typeof Voxel> | null>(null);
const dataInfo = computed(() =>
  prepare.value ? JSON.parse(voxelData.value.info) : null
);

const meshSize = computed(() =>
  prepare.value ? dataInfo.value.size : t("voxel.view.update")
);

const meshCenter = computed(() =>
  prepare.value ? dataInfo.value.center : t("voxel.view.update")
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

const progress = (progress: number) => {
  percentage.value = progress;
};

const createVerse = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("voxel.view.prompt.message1"),
      t("voxel.view.prompt.message2"),
      {
        confirmButtonText: t("voxel.view.prompt.confirm"),
        cancelButtonText: t("voxel.view.prompt.cancel"),
        inputValue: voxelData.value.name,
        inputErrorMessage: t("voxel.view.prompt.inputError"),
      }
    );

    if (value) {
      loading.value = true;
      try {
        const result = await createVerseFromResource(
          "Voxel",
          value,
          voxelData.value
        );

        ElMessage.success(t("voxel.view.prompt.success") + value);
        setTimeout(() => {
          router.push({
            path: "/verse/view",
            query: { id: result.verse.id },
          });
        }, 300);
      } catch (error) {
        ElMessage.error(t("voxel.view.prompt.error") + error);
      } finally {
        loading.value = false;
      }
    } else {
      ElMessage.info(t("voxel.view.prompt.info"));
    }
  } catch {
    ElMessage.info(t("voxel.view.prompt.info"));
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("voxel.view.confirm.message1"),
      t("voxel.view.confirm.message2"),
      {
        confirmButtonText: t("voxel.view.confirm.confirm"),
        cancelButtonText: t("voxel.view.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    await deleteVoxel(voxelData.value.id);
    ElMessage.success(t("voxel.view.confirm.success"));
    router.push("/resource/voxel/index");
  } catch {
    ElMessage.info(t("voxel.view.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("voxel.view.namePrompt.message1"),
      t("voxel.view.namePrompt.message2"),
      {
        confirmButtonText: t("voxel.view.namePrompt.confirm"),
        cancelButtonText: t("voxel.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: voxelData.value.name,
      }
    );

    if (value) {
      await named(voxelData.value.id, value);
      ElMessage.success(t("voxel.view.namePrompt.success") + value);
    } else {
      ElMessage.info(t("voxel.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("voxel.view.namePrompt.info"));
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

  const blob: Blob | undefined = await three.value?.screenshot();

  if (blob) {
    const file: File = new File([blob], voxelData.value.name, {
      type: "image/jpeg",
      lastModified: new Date().getTime(), // 设定最后修改时间
    });
    const extension = ".jpg";
    const md5 = await store.fileMD5(file);
    const handler = await store.publicHandler();
    const has = await store.fileHas(
      md5,
      extension,
      handler,
      "screenshot/voxel"
    );

    if (!has) {
      await store.fileUpload(
        md5,
        extension,
        file,
        () => {},
        handler,
        "screenshot/voxel"
      );
    }
    await saveFile(md5, extension, info, file, handler);
  }
};

onMounted(() => {
  loadVoxelData();
});
</script>

<style lang="scss" scoped>
@import "@/styles/view-style.scss";
</style>
