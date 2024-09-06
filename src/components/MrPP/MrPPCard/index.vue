<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <el-card shadow="hover" :body-style="{ padding: '0px' }">
          <template #header>
            <span class="mrpp-title">
              <b class="card-title" nowrap>{{ item.name }}</b>
            </span>
          </template>

          <LazyImg
            v-if="!item.image"
            src="@/assets/image/none.png"
            style="width: 100%; height: 300px; object-fit: contain"
          ></LazyImg>
          <LazyImg
            v-else
            style="width: 100%; height: 300px"
            fit="contain"
            :url="item.image.url"
            lazy
          ></LazyImg>
        </el-card>

        <slot name="info"></slot>
      </template>
      <div class="clearfix">
        <slot name="enter">入口</slot>

        <el-button-group style="float: right" :inline="true">
          <el-button
            type="danger"
            size="small"
            icon="Delete"
            @click="deleted"
          ></el-button>
          &nbsp;
        </el-button-group>
      </div>
      <div class="bottom clearfix"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
const props = defineProps({
  item: {
    type: Object as PropType<{ name: string; image: { url: string } | null }>,
    required: true,
  },
});

const emits = defineEmits(["named", "deleted"]);

const named = () => {
  emits("named", props.item);
};

const deleted = () => {
  emits("deleted", props.item);
};
</script>

<style scoped>
.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
}
.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
