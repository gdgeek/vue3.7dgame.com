<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <div>
          <b>
            <font-awesome-icon icon="edit"></font-awesome-icon>
            我的创作
          </b>
          :
        </div>
      </template>
      <div class="box-item">
        <el-descriptions
          v-if="creationData"
          label-class-name="info-content-label"
          :column="2"
          :size="'mini'"
          border
        >
          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                :to="'/polygen/index'"
              >
                <font-awesome-icon class="icon" icon="cube"></font-awesome-icon>
                模型
              </router-link>
            </template>
            {{ creationData.polygenCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                :to="'/picture/index'"
              >
                <font-awesome-icon
                  class="icon"
                  icon="file-image"
                ></font-awesome-icon>
                图片
              </router-link>
            </template>
            {{ creationData.pictureCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link class="info-content-label-link" :to="'/video/index'">
                <font-awesome-icon
                  class="icon"
                  icon="file-video"
                ></font-awesome-icon>
                视频
              </router-link>
            </template>
            {{ creationData.videoCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                :to="'/meta-verse/index'"
              >
                <font-awesome-icon
                  class="icon"
                  icon="adjust"
                ></font-awesome-icon>
                宇宙
              </router-link>
            </template>
            {{ creationData.verseCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                :to="'/home/creator'"
              >
                <font-awesome-icon
                  class="icon"
                  icon="address-card"
                ></font-awesome-icon>
                发布
              </router-link>
            </template>
            {{ creationData.postCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                :to="'/home/creator'"
              >
                <font-awesome-icon
                  class="icon"
                  icon="fa-solid fa-thumbs-up"
                ></font-awesome-icon>
                点赞
              </router-link>
            </template>
            {{ creationData.likeCount }}
          </el-descriptions-item>
        </el-descriptions>

        <aside style=" float: right;margin-top: 10px; margin-bottom: 15px">
          <el-button type="primary" plain size="mini" @click="gotoCreator">
            <i class="el-icon-edit"></i>
            进入
          </el-button>
        </aside>
      </div>
    </el-card>
    <br />
  </div>
</template>

<script setup lang="ts">
import { getUserCreationAPI } from "@/api/v1/user";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { userCreationData } from "@/typings/api_v1/user";

const router = useRouter();
const creationData = ref<userCreationData>();

const getUserCreation = async () => {
  const res = await getUserCreationAPI();
  creationData.value = res.data;
};

onMounted(() => {
  getUserCreation();
});

const gotoCreator = () => {
  router.push("/home/creator");
};

// export default {
//   name: "MrPPUserCreater",
//   data() {
//     return {
//       creation: null,
//     };
//   },
//   async created() {
//     const self = this;
//     const r = await getUserCreation();
//     self.creation = r.data;
//   },
//   methods: {
//     gotoCreator() {
//       this.$router.push({ path: "/home/creator" });
//     },
//   },
// };
</script>

<style lang="scss" scoped>
.icon {
  width: 10px;
}

.el-col {
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 400;
  color: #282a2b;
}

.info-title {
  height: 39px;
  font-weight: 700;
  line-height: 39px;
  color: #666;
  border-bottom: 1px solid #e2e5ec;
}

.info-content-label {
  width: 70px;
}

.info-content-label-link:hover {
  color: #40a0ffd0;
  text-decoration: underline;
}

.info-content-label-link {
  color: #409eff;
}
</style>
