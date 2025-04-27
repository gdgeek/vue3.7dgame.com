<template>
  <div>
    <el-card>
      <template #header>
        <div class="clearfix">
          <b>开放场景给项目（管理员专用）</b>
        </div>
      </template>
      <el-button v-if="true" style="width: 100%" type="primary" size="small">
        <font-awesome-icon icon="eye"></font-awesome-icon>
        &nbsp;{{ $t("verse.view.verseOpen") }}
      </el-button>
      <el-button v-else type="primary" size="small">
        <font-awesome-icon icon="eye-slash"></font-awesome-icon>
        &nbsp;{{ $t("verse.view.verseClose") }}
      </el-button>
    </el-card>
    <br />
    <el-card>
      <template #header>
        <div class="clearfix">
          <b>生成共享码（24小时）</b>
        </div>
      </template>
      <el-button type="primary" style="width: 100%" size="small">
        <font-awesome-icon icon="eye-slash"></font-awesome-icon>
        &nbsp; 生成共享码
      </el-button>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { useAbility } from "@casl/vue";
const ability = useAbility();
const can = ability.can.bind(ability);
</script>
