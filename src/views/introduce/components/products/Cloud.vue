<template>
  <!-- 产品中心 -->
  <section class="sandtable-section">
    <br />
    <div align="center">
      <h1 class="font-text section-title-size section-title-dark title-lighter">
        产品中心
      </h1>
      <p class="font-text f-text-color">
        提供demo展示、私有云部署等产品，更方便，更安全
      </p>
      <p class="section-underline-blue" />
    </div>
    <div style="padding: 10px 1% 20px">
      <el-row :gutter="40">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12" align="center">
          <div style="width: 100%; min-height: 420px; padding: 20px 4% 0">
            <div class="img-wrapper">
              <img src="/media/bg/cloudbgc2.jpg" class="section-radius img-wrapper-cloud" />
            </div>
            <p style="padding-top: 10px; text-align: left" class="f-text-color font-text">
              私有云(Private
              Clouds)是为⼀个客户单独使⽤⽽构建的，因⽽提供对数据、安全性和服务质量的最有效控制。该公司拥有基础设施，并可以控制在此基础设施上部署应⽤程序的⽅式。私有云可部署在企业数据中⼼的防⽕墙内，也可以将它们部署在⼀个安全的主机托管场所，私有云的核⼼属性是专有资源。
            </p>
          </div>
        </el-col>
        <!-- content部分 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <div class="clould-section-content">
            <div class="content-flexbox">
              <img src="/media/icon/cloud1.png" align="absmiddle" alt="" height="60px" style="margin-right: 20px" />
              <div>
                <b class="font-text" style="color: #33353d">本地部署</b>
                <br />
                <span class="f-text-color font-text">
                  本项⽬提提供私有云部署，服务器提供在校内⽹络中的安装配置，让⽤户在安全的内部环境使⽤。所有资源和
                  数据库都部署在本地局域⽹服务器上。所有内容提供 Docker
                  容器⽅便部署。
                </span>
              </div>
            </div>
            <div class="content-flexbox">
              <img src="/media/icon/cloud2.png" align="absmiddle" alt="" height="60px" style="margin-right: 20px" />
              <div>
                <b class="font-text" style="color: #33353d">资源管理</b>
                <br />
                <span class="f-text-color font-text">
                  后台提供三维模型/图⽚/视频资源的上传查看和相应管理。系统前段管理基于Vue前段引擎。
                </span>
              </div>
            </div>
            <div class="content-flexbox">
              <img src="/media/icon/cloud3.png" align="absmiddle" alt="" height="60px" style="margin-right: 20px" />
              <div>
                <b class="font-text" style="color: #33353d">模型优化</b>
                <br />
                <span class="f-text-color">
                  ⽀持多种三维模型格式，包括FBX，GLB，GLTF，IGES，STL等模型的管理，并在后台提供三维模型必要的压
                  缩优化操作，系统后台⾃动转换图形格式并压缩。
                </span>
              </div>
            </div>
            <div class="content-flexbox">
              <img src="/media/icon/cloud4.png" align="absmiddle" alt="" height="60px" style="margin-right: 20px" />
              <div>
                <b class="font-text" style="color: #33353d">可视化场景编辑</b>
                <br />
                <span class="f-text-color">
                  后台提供可视化的场景编辑⼯具，可以通过拖拽链接节点来构造新的场景。提供若⼲节点便于场景构建。
                </span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    <div align="center" style="padding: 2% 0 3%">
      <div class="font-text product-button" @click="goto('/introduce/list-product')">
        价格详情
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import '@/assets/font/font.css'

const router = useRouter()

// 路由跳转方法
const goto = (path: string): void => {
  router.push(path)
}
</script>

<style lang="scss" scoped>
@use "@/styles/screenstyle.scss";
@use "@/styles/sandtable.scss";

.clould-section-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 480px;
  // background-color: pink;
}

.content-flexbox {
  display: flex;
  align-items: center;
  margin: 4% 0;
}

.testcolor {
  color: #4da5b3;
}

.img-wrapper {
  overflow: hidden;
  border-radius: 4px;
  height: 370px;
}

// img特效及过滤效果
.img-wrapper img {
  height: 370px;
  -webkit-transition: 0.3s linear;
  transition: 0.3s linear;
}

.img-wrapper img:hover {
  -webkit-filter: sepia(30%);
  filter: sepia(30%);
  transform: scale(1.1);
}

.img-wrapper-cloud {
  width: 100%;
  object-fit: cover;
}

.product-button {
  font-size: 20px;
  line-height: 50px;
  text-align: center;
  font-weight: 400;
  border-radius: 8px;
  color: #fff;
  width: 160px;
  height: 50px;
  background: rgb(72, 96, 240);
  background: linear-gradient(90deg,
      rgba(72, 96, 240, 1) 0%,
      rgba(146, 100, 223, 1) 50%,
      rgba(216, 106, 156, 1) 100%);
}

.product-button:hover {
  cursor: pointer;
  opacity: 0.8;
}
</style>
