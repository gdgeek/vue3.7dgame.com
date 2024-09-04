<template>
  <!-- <div> -->

  <el-card style="width: 100%">
    <waterfall
      v-if="viewCards.length > 0"
      :width="320"
      :gutter="10"
      :hasAroundGutter="false"
      :breakpoints="{
        640: { rowPerView: 1 },
      }"
      :list="viewCards"
      :column-count="3"
      :backgroundColor="'rgba(255, 255, 255, .05)'"
    >
      <template #default="{ item }">
        <el-card style="width: 300px" class="box-card">
          <template #header>
            <div>
              <el-card shadow="hover" :body-style="{ padding: '0px' }">
                <template #header>
                  <span class="mrpp-title">
                    <b class="card-title" nowrap>{{ item.name }}</b>
                  </span>
                </template>
                <router-link :to="'/verse/view?id=' + item.id">
                  <img
                    v-if="item.image === null"
                    src="@/assets/image/none.png"
                    style="width: 100%; height: 270px; object-fit: contain"
                  />
                  <LazyImg
                    v-else
                    :url="item.image.url"
                    style="width: 100%; height: 270px"
                    fit="contain"
                  ></LazyImg>
                </router-link>
              </el-card>
              <InfoContent
                :info="JSON.parse(item.info!)"
                :author="item.author!"
              ></InfoContent>
            </div>
          </template>
          <div class="clearfix">
            <router-link :to="'/verse/view?id=' + item.id">
              <el-button type="primary" size="small">{{
                $t("verse.page.list.enter")
              }}</el-button>
            </router-link>
            <VerseToolbar
              :verse="item!"
              @deleted="deleted"
              @changed="changed"
            ></VerseToolbar>
          </div>
          <div class="bottom clearfix"></div>
        </el-card>
        <br />
      </template>
    </waterfall>
  </el-card>
</template>

<script setup lang="ts">
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import { VerseData } from "@/api/v1/verse";
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const props = defineProps<{ items: VerseData[] }>();
const emit = defineEmits<{ (e: "refresh"): void }>();

const { t } = useI18n();

const newItems = ref<VerseData[]>([]);

watch(
  () => props.items,
  (updatedItems: any) => {
    newItems.value = updatedItems;
    console.log("New items:", updatedItems);
  },
  { immediate: true }
);

const refresh = () => {
  emit("refresh");
};

const changed = async () => {
  refresh();
};

const deleted = async () => {
  refresh();
};

const infoTable = (item: VerseData) => {
  const table = [];
  const info = JSON.parse(item.info!);
  if (info) {
    table.push({
      value: t("verse.page.list.infoTable") + info.description,
    });
  }
  return table;
};

type ViewCard = {
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

// 瀑布流数据类型转换
const transformToViewCard = (items: VerseData[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.image?.url,
      id: item.id ? item.id.toString() : undefined,
      name: item.name,
      info: item.info,
      uuid: item.uuid,
      image: item.image,
      author: item.author,
      editable: item.editable,
    };
  });
};

const viewCards = computed(() => {
  console.log("items", newItems.value);
  const cards = transformToViewCard(newItems.value);
  console.log("viewCards", cards);
  return cards;
});
/*
const breakpoints = ref({
  1600: {
    //当屏幕宽度小于等于1600
    rowPerView: 4, // 一行4图
  },
  1200: {
    //当屏幕宽度小于等于1350
    rowPerView: 3, // 一行3图
  },
  800: {
    //当屏幕宽度小于等于900
    rowPerView: 2, // 一行2图
  },
  600: {
    //当屏幕宽度小于等于450
    rowPerView: 1, // 一行1图
  },
});*/
</script>

<style scoped></style>
