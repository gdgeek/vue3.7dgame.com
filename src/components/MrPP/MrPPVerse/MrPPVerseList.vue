<template>
  <div>
    <waterfall :options="{}">
      <!-- slice Control number of items -->
      <waterfall-item
        v-for="(item, index) in items"
        :key="index"
        style="width: 330px"
      >
        <el-card style="width: 320px" class="box-card">
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
                    v-if="!item.image"
                    src="@/assets/image/none.png"
                    style="width: 100%; height: 270px; object-fit: contain"
                  />
                  <img
                    v-else
                    :src="item.image.url"
                    style="width: 100%; height: 270px"
                    fit="contain"
                    lazy
                  />
                </router-link>
              </el-card>
              <InfoContent :info="JSON.parse(item.info!)"></InfoContent>
            </div>
          </template>
          <div class="clearfix">
            <router-link slot="enter" :to="'/verse/view?id=' + item.id">
              <el-button type="primary" size="mini">进入</el-button>
            </router-link>
            <VerseToolbar
              :verse="item"
              @deleted="deleted"
              @changed="changed"
            ></VerseToolbar>
          </div>
          <div class="bottom clearfix"></div>
        </el-card>
        <br />
      </waterfall-item>
    </waterfall>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import InfoContent from "@/components/InfoContent.vue";
import { VerseData } from "@/api/v1/verse";

const props = defineProps<{ items: VerseData[] }>();
const emit = defineEmits<{ (e: "refresh"): void }>();

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
      value: "内容说明：" + info.description,
    });
  }
  return table;
};
</script>
