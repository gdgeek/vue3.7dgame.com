<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <div>
          <b>
            <font-awesome-icon icon="edit"></font-awesome-icon>
            {{ $t("homepage.myCreation.title") }}
          </b>
          :
        </div>
      </template>
      <div class="box-item">
        <el-descriptions
          v-if="creation"
          label-class-name="info-content-label"
          :column="2"
          size="small"
          border
        >
          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                to="/resource/polygen/index"
              >
                <font-awesome-icon class="icon" icon="cube"></font-awesome-icon>
                {{ $t("homepage.myCreation.myPolygen") }}
              </router-link>
            </template>
            {{ creation.polygenCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                to="/resource/picture/index"
              >
                <font-awesome-icon
                  class="icon"
                  icon="file-image"
                ></font-awesome-icon>
                {{ $t("homepage.myCreation.myPicture") }}
              </router-link>
            </template>
            {{ creation.pictureCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link
                class="info-content-label-link"
                to="/resource/video/index"
              >
                <font-awesome-icon
                  class="icon"
                  icon="file-video"
                ></font-awesome-icon>
                {{ $t("homepage.myCreation.myVideo") }}
              </router-link>
            </template>
            {{ creation.videoCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link class="info-content-label-link" to="/verse/index">
                <font-awesome-icon
                  class="icon"
                  icon="adjust"
                ></font-awesome-icon>
                {{ $t("homepage.myCreation.myProject") }}
              </router-link>
            </template>
            {{ creation.verseCount }}
          </el-descriptions-item>

          <!-- <el-descriptions-item>
            <template #label>
              <router-link class="info-content-label-link" to="/home/creator">
                <font-awesome-icon
                  class="icon"
                  icon="address-card"
                ></font-awesome-icon>
                {{ $t("homepage.myCreation.myPublish") }}
              </router-link>
            </template>
            {{ creation.postCount }}
          </el-descriptions-item>

          <el-descriptions-item>
            <template #label>
              <router-link class="info-content-label-link" to="/home/creator">
                <font-awesome-icon
                  class="icon"
                  icon="fa-solid fa-thumbs-up"
                ></font-awesome-icon>
                {{ $t("homepage.myCreation.myLike") }}
              </router-link>
            </template>
            {{ creation.likeCount }}
          </el-descriptions-item> -->
        </el-descriptions>

        <!-- <aside style="margin-top: 10px; margin-bottom: 15px; float: right">
          <el-button type="primary" plain size="small" @click="gotoCreator">
            <i class="el-icon-edit"></i>
            {{ $t("homepage.myCreation.enter") }}
          </el-button>
        </aside> -->
      </div>
    </el-card>
    <br />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getUserCreation } from "@/api/v1/user";

interface Creation {
  polygenCount: number;
  pictureCount: number;
  videoCount: number;
  verseCount: number;
  postCount: number;
  likeCount: number;
}

const creation = ref<Creation | null>(null);
const router = useRouter();

const gotoCreator = () => {
  router.push({ path: "/home/creator" });
};

const fetchCreation = async () => {
  try {
    const r = await getUserCreation();
    creation.value = r.data;
  } catch (error) {
    console.error("Error fetching creation data:", error);
  }
};

onMounted(fetchCreation);
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
  color: #666666;
  line-height: 39px;
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
