<template>
  <div class="products-skeleton">
    <!-- Banner骨架 -->
    <div class="banner-skeleton">
      <div class="banner-content">
        <div class="title"></div>
        <div class="subtitle"></div>
      </div>
    </div>

    <!-- 应用场景骨架 -->
    <div class="solutions-skeleton">
      <div class="section-header">
        <div class="title"></div>
        <div class="subtitle"></div>
      </div>
      <div class="solutions-grid">
        <div v-for="i in 4" :key="i" class="solution-item">
          <div class="image"></div>
          <div class="content">
            <div class="title"></div>
            <div class="desc"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 产品中心骨架 -->
    <div class="products-section">
      <div class="section-header">
        <div class="title"></div>
        <div class="subtitle"></div>
      </div>
      <div class="products-content">
        <div class="left-content">
          <div class="image"></div>
          <div class="text"></div>
        </div>
        <div class="right-content">
          <div v-for="i in 4" :key="i" class="feature-item">
            <div class="icon"></div>
            <div class="text">
              <div class="title"></div>
              <div class="desc"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ProductsSkeletonLoader'
})
</script>

<style lang="scss" scoped>
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }

  100% {
    background-position: 1000px 0;
  }
}

.skeleton-gradient {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}

.products-skeleton {
  .banner-skeleton {
    width: 100%;
    height: 40vw;
    max-height: 650px;
    background: #f5f5f5;
    position: relative;

    .banner-content {
      position: absolute;
      left: 8%;
      top: 50%;
      transform: translateY(-50%);
      width: 40%;

      .title {
        @extend .skeleton-gradient;
        height: 48px;
        width: 80%;
        margin-bottom: 20px;
        border-radius: 4px;
      }

      .subtitle {
        @extend .skeleton-gradient;
        height: 32px;
        width: 60%;
        border-radius: 4px;
      }
    }
  }

  .section-header {
    text-align: center;
    padding: 40px 0;

    .title {
      @extend .skeleton-gradient;
      height: 36px;
      width: 200px;
      margin: 0 auto 16px;
      border-radius: 4px;
    }

    .subtitle {
      @extend .skeleton-gradient;
      height: 24px;
      width: 300px;
      margin: 0 auto;
      border-radius: 4px;
    }
  }

  .solutions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    padding: 0 5%;

    .solution-item {
      .image {
        @extend .skeleton-gradient;
        width: 100%;
        height: 200px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .content {
        .title {
          @extend .skeleton-gradient;
          height: 24px;
          width: 70%;
          margin-bottom: 12px;
          border-radius: 4px;
        }

        .desc {
          @extend .skeleton-gradient;
          height: 60px;
          width: 100%;
          border-radius: 4px;
        }
      }
    }
  }

  .products-content {
    display: flex;
    padding: 40px 5%;
    gap: 60px;

    .left-content {
      flex: 1;

      .image {
        @extend .skeleton-gradient;
        width: 100%;
        height: 300px;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .text {
        @extend .skeleton-gradient;
        height: 100px;
        width: 100%;
        border-radius: 4px;
      }
    }

    .right-content {
      flex: 1;

      .feature-item {
        display: flex;
        gap: 20px;
        margin-bottom: 30px;

        .icon {
          @extend .skeleton-gradient;
          width: 60px;
          height: 60px;
          border-radius: 4px;
        }

        .text {
          flex: 1;

          .title {
            @extend .skeleton-gradient;
            height: 24px;
            width: 40%;
            margin-bottom: 8px;
            border-radius: 4px;
          }

          .desc {
            @extend .skeleton-gradient;
            height: 40px;
            width: 100%;
            border-radius: 4px;
          }
        }
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .products-skeleton {
    .banner-skeleton {
      height: 60vw;

      .banner-content {
        width: 80%;
        left: 5%;
      }
    }

    .products-content {
      flex-direction: column;
      padding: 20px 5%;
      gap: 30px;
    }
  }
}
</style>