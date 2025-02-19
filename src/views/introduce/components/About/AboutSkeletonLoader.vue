<template>
  <div class="skeleton-loader">
    <!-- Banner骨架屏 -->
    <div class="skeleton-banner">
      <div class="skeleton-banner-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
        <div class="skeleton-buttons">
          <div class="skeleton-button"></div>
          <div class="skeleton-button"></div>
        </div>
      </div>
    </div>

    <!-- 业务列表骨架屏 -->
    <div class="skeleton-business">
      <div v-for="i in 3" :key="i" class="skeleton-business-item">
        <div class="skeleton-business-image"></div>
        <div class="skeleton-business-content">
          <div class="skeleton-business-title"></div>
          <div class="skeleton-business-desc"></div>
        </div>
      </div>
    </div>

    <!-- 合作伙伴骨架屏 -->
    <div class="skeleton-partner">
      <div class="skeleton-section-title"></div>
      <div class="skeleton-partner-logos">
        <div v-for="i in 3" :key="i" class="skeleton-logo"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SkeletonLoader'
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

.skeleton-loader {
  width: 100%;
  
  .skeleton-banner {
    width: 100%;
    height: 40vw;
    max-height: 650px;
    background: #f5f5f5;
    position: relative;

    .skeleton-banner-content {
      position: absolute;
      left: 10%;
      top: 50%;
      transform: translateY(-50%);
      width: 40%;

      .skeleton-title {
        @extend .skeleton-gradient;
        height: 48px;
        width: 80%;
        margin-bottom: 20px;
        border-radius: 4px;
      }

      .skeleton-subtitle {
        @extend .skeleton-gradient;
        height: 32px;
        width: 60%;
        margin-bottom: 30px;
        border-radius: 4px;
      }

      .skeleton-buttons {
        display: flex;
        gap: 20px;

        .skeleton-button {
          @extend .skeleton-gradient;
          height: 40px;
          width: 120px;
          border-radius: 4px;
        }
      }
    }
  }

  .skeleton-business {
    padding: 60px 20px;

    .skeleton-business-item {
      display: flex;
      align-items: center;
      gap: 60px;
      margin-bottom: 40px;
      padding: 0 10%;

      &:nth-child(even) {
        flex-direction: row-reverse;
      }

      .skeleton-business-image {
        @extend .skeleton-gradient;
        width: 50%;
        height: 300px;
        border-radius: 8px;
      }

      .skeleton-business-content {
        width: 50%;

        .skeleton-business-title {
          @extend .skeleton-gradient;
          height: 36px;
          width: 60%;
          margin-bottom: 20px;
          border-radius: 4px;
        }

        .skeleton-business-desc {
          @extend .skeleton-gradient;
          height: 100px;
          width: 100%;
          border-radius: 4px;
        }
      }
    }
  }

  .skeleton-partner {
    padding: 40px 20px;
    
    .skeleton-section-title {
      @extend .skeleton-gradient;
      height: 36px;
      width: 200px;
      margin: 0 auto 40px;
      border-radius: 4px;
    }

    .skeleton-partner-logos {
      display: flex;
      justify-content: center;
      gap: 60px;
      padding: 0 20%;

      .skeleton-logo {
        @extend .skeleton-gradient;
        width: 150px;
        height: 60px;
        border-radius: 4px;
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .skeleton-loader {
    .skeleton-banner {
      height: 60vw;

      .skeleton-banner-content {
        width: 80%;
        left: 5%;
      }
    }

    .skeleton-business {
      .skeleton-business-item {
        flex-direction: column !important;
        padding: 0 5%;

        .skeleton-business-image,
        .skeleton-business-content {
          width: 100%;
        }
      }
    }

    .skeleton-partner {
      .skeleton-partner-logos {
        flex-wrap: wrap;
        padding: 0 5%;
        
        .skeleton-logo {
          width: calc(50% - 30px);
        }
      }
    }
  }
}
</style> 