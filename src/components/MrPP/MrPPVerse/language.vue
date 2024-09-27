<template>
  <div>
    <el-form ref="formRef" :rules="rules" :model="form" label-width="auto">
      <el-form-item :label="$t('verse.view.form.label1')" prop="language">
        <el-select
          @change="handleChange"
          v-model="form.language"
          filterable
          allow-create
          default-first-option
          :placeholder="$t('verse.view.form.placeholder1')"
          style="width: 25%"
        >
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('verse.view.form.label2')" prop="name">
        <el-input
          :placeholder="$t('verse.view.form.placeholder2')"
          suffix-icon="el-icon-more-outline"
          v-model="form.name"
        >
        </el-input>
      </el-form-item>
      <el-form-item :label="$t('verse.view.form.label3')">
        <el-input
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          :placeholder="$t('verse.view.form.placeholder3')"
          v-model="form.description"
        >
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button-group>
          <el-button size="small" type="primary" @click="submitForm"
            ><el-icon style="margin-right: 5px"><Check></Check></el-icon
            >{{ $t("verse.view.form.submit") }}</el-button
          >
          <el-button size="small" type="danger" @click="remove"
            ><el-icon style="margin-right: 5px"><Delete></Delete></el-icon
            >{{ $t("verse.view.form.delete") }}</el-button
          >
        </el-button-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { getVerse } from "@/api/v1/verse";
import {
  postMultilanguageVerse,
  putMultilanguageVerse,
  deleteMultilanguageVerse,
} from "@/api/v1/multilanguage-verse";
import { FormInstance } from "element-plus";

interface LanguageOption {
  value: string;
  label: string;
}

interface FormModel {
  language: string;
  name: string;
  description: string;
}

interface LanguageProps {
  languages: Array<{
    language: string;
    name: string;
    description: string;
    id?: number;
  }>;
  verseId: number;
}

const props = defineProps<LanguageProps>();
const { t } = useI18n();
const multilanguage = ref(props.languages);
const formRef = ref<FormInstance>();
const form = ref<FormModel>({
  language: "",
  name: "",
  description: "",
});

const rules = ref({
  language: [
    {
      required: true,
      message: t("verse.view.form.rules.message1"),
      trigger: "blur",
    },
    { min: 2, max: 10, message: "长度在 2 到 10 个字符", trigger: "blur" },
  ],
  name: [
    {
      required: true,
      message: t("verse.view.form.rules.message2"),
      trigger: "blur",
    },
    {
      min: 2,
      max: 50,
      message: t("verse.view.form.rules.message3"),
      trigger: "blur",
    },
  ],
  description: [
    {
      required: false,
      message: t("verse.view.form.rules.message4"),
      trigger: "blur",
    },
  ],
});

const options = ref<LanguageOption[]>([]);

const refresh = async () => {
  const res = await getVerse(props.verseId, "languages");
  multilanguage.value = res.data.languages;
  reload();
};

const reload = () => {
  if (multilanguage.value.length !== 0) {
    options.value = multilanguage.value.map((item) => ({
      value: item.language,
      label: item.language,
    }));

    if (
      !form.value.language ||
      !multilanguage.value.find((item) => item.language === form.value.language)
    ) {
      form.value.language = multilanguage.value[0].language;
    }
    handleChange(form.value.language);
  }
};

const handleChange = (value: string) => {
  const selectedLanguage = multilanguage.value.find(
    (item) => item.language === value
  );
  if (selectedLanguage) {
    form.value.name = selectedLanguage.name;
    form.value.description = selectedLanguage.description;
  } else {
    form.value.name = "";
    form.value.description = "";
  }
};

const remove = async () => {
  const languageToRemove = multilanguage.value.find(
    (item) => item.language === form.value.language
  );
  if (languageToRemove && languageToRemove.id) {
    try {
      await deleteMultilanguageVerse(languageToRemove.id);
      formRef.value?.resetFields();
      form.value.name = "";
      form.value.description = "";
      await refresh();
      ElMessage.success(t("verse.view.success3"));
    } catch (error) {
      console.error(error);
    }
  }
};

const submitForm = async () => {
  const valid = await formRef.value!.validate();
  if (valid) {
    const language = multilanguage.value.find(
      (item) => item.language === form.value.language
    );
    try {
      if (language && language.id) {
        await putMultilanguageVerse(language.id, {
          name: form.value.name,
          description: form.value.description,
        });
        ElMessage.success(t("verse.view.success1"));
      } else {
        await postMultilanguageVerse({
          verse_id: props.verseId,
          language: form.value.language,
          name: form.value.name,
          description: form.value.description,
        });
        ElMessage.success(t("verse.view.success2"));
      }
      await refresh();
    } catch (error) {
      console.error(error);
      ElMessage.error(t("verse.view.error1"));
    }
  } else {
    console.error("error submit!!");
    ElMessage.error(t("verse.view.error2"));
  }
};

onMounted(() => {
  refresh();
  reload();
});
</script>
