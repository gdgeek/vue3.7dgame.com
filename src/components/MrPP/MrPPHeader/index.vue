<template>
  <div>
    <el-card class="box-card">
      <el-row :gutter="0">
        <el-col :xs="16" :sm="16" :md="16" :lg="16" :xl="16">
          <slot></slot>
          &nbsp;
          <el-button-group v-if="sorted !== ''" :inline="true">
            <el-button
              v-if="sorted_name"
              size="small"
              type="success"
              label="名称排序"
              icon="ChatDotSquare"
              @click="sort(sortByName)"
            >
              <span class="hidden-sm-and-down">名称排序</span>
              <i v-if="sorted_up" class="el-icon-arrow-up"></i>
              <i v-else class="el-icon-arrow-down"></i>
            </el-button>
            <el-button
              v-else
              size="small"
              type="info"
              label="名称排序"
              icon="ChatDotSquare"
              @click="sort(sortByName)"
            >
              <span class="hidden-sm-and-down">名称排序</span>
            </el-button>
            <el-button
              v-if="sorted_created_at"
              size="small"
              type="success"
              icon="Clock"
              label="时间排序"
              @click="sort(sortByTime)"
            >
              <span class="hidden-sm-and-down">时间排序</span>
              <i v-if="sorted_up" class="el-icon-arrow-up"></i>
              <i v-else class="el-icon-arrow-down"></i>
            </el-button>
            <el-button
              v-else
              size="small"
              type="info"
              label="时间排序"
              icon="Clock"
              @click="sort(sortByTime)"
            >
              <span class="hidden-sm-and-down">时间排序</span>
            </el-button>
          </el-button-group>
        </el-col>
        <el-col :xs="8" :sm="8" :md="8" :lg="8" :xl="8">
          <el-input
            v-model="input"
            size="small"
            placeholder="搜索名称"
            class="input-with-select"
            @keyup.enter="keyDown"
          >
            <template #append>
              <el-button
                icon="Search"
                size="small"
                class="search"
                @click="search"
              ></el-button>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  sorted: {
    type: String,
    required: true,
  },
  searched: {
    type: String,
    required: true,
  },
  sortByName: {
    type: String,
    default: "name",
  },
  sortByTime: {
    type: String,
    default: "created_at",
  },
});

const emits = defineEmits(["search", "sort"]);

const input = ref("");

const sorted_created_at = computed(() =>
  props.sorted.includes(props.sortByTime)
);
const sorted_name = computed(() => props.sorted.includes(props.sortByName));
const sorted_up = computed(() => !props.sorted.startsWith("-"));

const search = () => {
  emits("search", input.value);
  input.value = "";
};

const sort = (value: string) => {
  emits("sort", (value === props.sorted ? "-" : "") + value);
};

const keyDown = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    search();
  }
};
</script>

<style scoped>
.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
  color: #666;
}

.search:hover {
  background-color: #409eff !important;
}
</style>
