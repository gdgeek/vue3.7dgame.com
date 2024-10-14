<template>
  <div v-loading="loading" class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">{{ $t("polygen.view.title") }}</b>
            <span v-if="polygenData">{{ polygenData.name }}</span>
          </template>
          <div v-loading="false" class="box-item">
            <polygen
              v-if="polygenData"
              ref="three"
              :file="polygenData.file"
              @loaded="loaded"
              @progress="progress"
            >
            </polygen>
          </div>
          <el-progress :percentage="percentage"></el-progress>
        </el-card>
        <br />

        <el-card v-loading="expire" class="box-card">
          <el-button
            style="width: 100%"
            type="primary"
            size="small"
            @click="createVerse"
          >
            <font-awesome-icon icon="plus"></font-awesome-icon>
            &nbsp;{{ $t("polygen.view.titleStatement") }}
          </el-button>
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <b>{{ $t("polygen.view.info.title") }}</b> :
          </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column
                prop="item"
                :label="$t('polygen.view.info.label1')"
              ></el-table-column>
              <el-table-column
                prop="text"
                :label="$t('polygen.view.info.label2')"
              ></el-table-column>
            </el-table>

            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  {{ $t("polygen.view.info.name") }}
                </el-button>
                <el-button type="primary" size="small" @click="deleteWindow">
                  <i class="el-icon-delete"></i>
                  {{ $t("polygen.view.info.delete") }}
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
import Polygen from "@/components/Polygen.vue";
import { getPolygen, putPolygen, deletePolygen } from "@/api/resources/index";
import { createVerseFromResource } from "@/api/v1/meta-verse";
import { postFile } from "@/api/v1/files";
import { printVector3 } from "@/assets/js/helper";
import { useFileStore } from "@/store/modules/config";
import { convertToLocalTime } from "@/utils/dataChange";

const loading = ref(false);
const polygenData = ref<any>(null);
const expire = ref(true);
const percentage = ref(0);
const route = useRoute();
const router = useRouter();
const store = useFileStore().store;
const { t } = useI18n();

const three = ref<InstanceType<typeof Polygen> | null>(null);
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
      { item: t("polygen.view.info.item1"), text: polygenData.value.name },
      {
        item: t("polygen.view.info.item2"),
        text: polygenData.value.author.nickname,
      },
      {
        item: t("polygen.view.info.item3"),
        text: convertToLocalTime(polygenData.value.created_at),
      },
      {
        item: t("polygen.view.info.item4"),
        text: `${polygenData.value.file.size}` + t("polygen.view.info.size"),
      },
      {
        item: t("polygen.view.info.item5"),
        text: printVector3(dataInfo.value.size),
      },
      {
        item: t("polygen.view.info.item6"),
        text: printVector3(dataInfo.value.center),
      },
    ];
  } else {
    return [];
  }
});

const progress = (progress: number) => {
  percentage.value = progress;
};

const createVerse = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("polygen.view.prompt.message1"),
      t("polygen.view.prompt.message2"),
      {
        confirmButtonText: t("polygen.view.prompt.confirm"),
        cancelButtonText: t("polygen.view.prompt.cancel"),
        inputValue: polygenData.value.name,
        inputErrorMessage: t("polygen.view.prompt.inputError"),
      }
    );

    loading.value = true;

    const result = await createVerseFromResource(
      "Polygen",
      value,
      polygenData.value
    );
    console.error(result);
    ElMessage.success(t("polygen.view.prompt.success") + value);

    setTimeout(() => {
      router.push({
        path: "/verse/view",
        query: { id: result.verse.id },
      });
    }, 300);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(t("polygen.view.prompt.error") + error);
    } else {
      ElMessage.info(t("polygen.view.prompt.info"));
    }
  } finally {
    loading.value = false;
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("polygen.view.confirm.message1"),
      t("polygen.view.confirm.message2"),
      {
        confirmButtonText: t("polygen.view.confirm.confirm"),
        cancelButtonText: t("polygen.view.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    await deletePolygen(polygenData.value.id);

    ElMessage.success(t("polygen.view.confirm.success"));
    router.push("/resource/polygen/index");
  } catch {
    ElMessage.info(t("polygen.view.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("polygen.view.namePrompt.message1"),
      t("polygen.view.namePrompt.message2"),
      {
        confirmButtonText: t("polygen.view.namePrompt.confirm"),
        cancelButtonText: t("polygen.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: polygenData.value.name,
      }
    );

    await putPolygen(polygenData.value.id, { name: value });

    polygenData.value.name = value;

    ElMessage.success(t("polygen.view.namePrompt.success") + value);
  } catch {
    ElMessage.info(t("polygen.view.namePrompt.info"));
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
    const blob: Blob | undefined = await three.value?.screenshot();

    if (blob) {
      const file: File = new File([blob], polygenData.value.name, {
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
        "screenshot/polygen"
      );

      if (!has) {
        await store.fileUpload(
          md5,
          extension,
          file,
          () => {},
          handler,
          "screenshot/polygen"
        );
      }
      await saveFile(md5, extension, info, file, handler);
    }
  } catch (error) {
    console.error(error);
  }
};

const screenshot = () => {
  return three.value!.screenshot();
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
