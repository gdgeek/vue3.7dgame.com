<template>
  <div>
    <el-form ref="formRef" :rules="rules" :model="form" label-width="80px">
      <el-form-item label="多语言" prop="language">
        <el-select
          @change="handleChange"
          v-model="form.language"
          filterable
          allow-create
          default-first-option
          placeholder="请选择语言"
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
      <el-form-item label="名字" prop="name">
        <el-input
          placeholder="请输入名称"
          suffix-icon="el-icon-more-outline"
          v-model="form.name"
        >
        </el-input>
      </el-form-item>
      <el-form-item label="介绍">
        <el-input
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="请输入介绍"
          v-model="form.description"
        >
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button-group>
          <el-button
            size="mini"
            type="primary"
            icon="el-icon-check"
            @click="submitForm('form')"
            >提交</el-button
          >
          <el-button
            size="mini"
            type="primary"
            icon="el-icon-delete"
            @click="remove()"
            >删除</el-button
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

const multilanguage = ref(props.languages);
const formRef = ref<FormInstance>();
const form = ref<FormModel>({
  language: "",
  name: "",
  description: "",
});

const rules = ref({
  name: [
    { required: true, message: "请输入名称", trigger: "blur" },
    { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
  ],
  language: [
    { required: true, message: "请输入语言", trigger: "blur" },
    { min: 2, max: 10, message: "长度在 2 到 10 个字符", trigger: "blur" },
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
      await refresh();
    } catch (error) {
      console.error(error);
    }
  }
};

const submitForm = async (formName: string) => {
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
      } else {
        await postMultilanguageVerse({
          verse_id: props.verseId,
          language: form.value.language,
          name: form.value.name,
          description: form.value.description,
        });
      }
      await refresh();
    } catch (error) {
      console.error(error);
    }
  } else {
    console.error("error submit!!");
  }
};

onMounted(() => {
  reload();
});
</script>
