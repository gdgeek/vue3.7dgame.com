<template>
  <div class="privacy-policy">
    <el-card class="policy-card">
      <template #header>
        <div class="card-header">
          <h1>隐私政策</h1>
          <div class="header-meta">
            <span class="version">版本: 1.0.0</span>
            <span class="update-time">生效日期: 2025年1月1日</span>
          </div>
        </div>
      </template>

      <div class="policy-content">
        <section class="introduction">
          <h2>引言</h2>
          <p>
            欢迎使用我们的AR创作与游戏平台。本平台致力于为用户提供沉浸式的AR体验、专业的3D创作工具和直观的可视化编程环境。我们深知在提供这些服务的过程中,个人信息对您的重要性,并会采取业界领先的技术手段和管理措施保护您的个人信息安全。
          </p>
          <p>
            本隐私政策详细说明了我们如何收集、使用、存储和保护您的信息,以及您享有的相关权利。这些信息对于提供AR渲染、空间定位、实时协作等功能至关重要。请您仔细阅读并理解本政策的全部内容。
          </p>
        </section>

        <section class="info-collection">
          <h2>1. 信息收集</h2>
          <el-collapse v-model="activeCollection">
            <el-collapse-item title="1.1 账户信息" name="1">
              <div class="right-content">
                <p>为了提供个性化服务和确保账户安全,我们收集的账户信息包括：</p>
                <ul>
                  <li>
                    <strong>基本账户信息</strong>
                    <p>用于身份识别和登录：</p>
                    <ul>
                      <li>用户名和密码</li>
                      <li>电子邮箱地址</li>
                      <li>手机号码(可选)</li>
                      <li>账户创建时间</li>
                    </ul>
                  </li>
                  <li>
                    <strong>个人资料信息</strong>
                    <p>用于社交互动和作品展示：</p>
                    <ul>
                      <li>昵称和头像</li>
                      <li>个人简介</li>
                      <li>创作者标签</li>
                      <li>技能等级</li>
                    </ul>
                  </li>
                  <li>
                    <strong>认证信息</strong>
                    <p>用于特定功能和权���：</p>
                    <ul>
                      <li>实名认证信息(可选)</li>
                      <li>专业认证资质(可选)</li>
                      <li>组织机构信息(可选)</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.2 系统使用数据" name="2">
              <div class="right-content">
                <p>为了优化用户体验和系统性能,我们收集的系统数据包括：</p>
                <ul>
                  <li>
                    <strong>设备信息</strong>
                    <p>用于兼容性适配：</p>
                    <ul>
                      <li>设备型号和操作系统</li>
                      <li>浏览器类型和版本</li>
                      <li>屏幕分辨率和刷新率</li>
                      <li>GPU型号和性能参数</li>
                      <li>可用内存和存储空间</li>
                    </ul>
                  </li>
                  <li>
                    <strong>网络信息</strong>
                    <p>用于连接质量优化：</p>
                    <ul>
                      <li>IP地址和地理位置</li>
                      <li>网络类型和信号强度</li>
                      <li>连接延迟和带宽</li>
                      <li>WebRTC相关参数</li>
                    </ul>
                  </li>
                  <li>
                    <strong>运行日志</strong>
                    <p>用于问题诊断和优化：</p>
                    <ul>
                      <li>系统运行状态</li>
                      <li>错误和崩溃报告</li>
                      <li>性能监控数据</li>
                      <li>操作行为记录</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.3 第三方登录信息" name="3">
              <div class="right-content">
                <p>为了提供便捷的登录方式,我们支持以下第三方登录：</p>
                <ul>
                  <li>
                    <strong>社交平台登录</strong>
                    <p>支持的平台：</p>
                    <ul>
                      <li>Apple ID登录</li>
                      <li>Google账号登录</li>
                      <li>Facebook账号登录</li>
                      <li>微信登录(中国大陆用户)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>授权范围</strong>
                    <p>第三方登录需要的权限：</p>
                    <ul>
                      <li>基本用户信息(必需)</li>
                      <li>头像和昵称(必需)</li>
                      <li>电子邮箱(可选)</li>
                      <li>好友列表(可选)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>数据同步</strong>
                    <p>可选的数据同步功能：</p>
                    <ul>
                      <li>云存储集成</li>
                      <li>社交关系导入</li>
                      <li>偏好设置同步</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.4 设备传感器数据" name="4">
              <div class="right-content">
                <p>为了实现AR/VR功能和空间交互,我们需要访问以下传感器数据：</p>
                <ul>
                  <li>
                    <strong>摄像头数据</strong>
                    <p>用于AR场景渲染和空间识别：</p>
                    <ul>
                      <li>RGB摄像头实时视频流</li>
                      <li>深度摄像头数据(如有)</li>
                      <li>环境光传感器数据</li>
                      <li>相机参数(焦距、光圈等)</li>
                    </ul>
                    <p>使用说明：</p>
                    <ul>
                      <li>仅在AR功能开启时采集</li>
                      <li>数据实时处理,不存储原始图像</li>
                      <li>可随时通过权限设置关闭</li>
                    </ul>
                  </li>
                  <li>
                    <strong>运动传感器数据</strong>
                    <p>用于设备姿态追踪和手势识别：</p>
                    <ul>
                      <li>陀螺仪：设备旋转角度和角速度</li>
                      <li>加速度计：线性加速度和重力方向</li>
                      <li>磁力计：空间朝向参考</li>
                      <li>惯性测量单元(IMU)融合数据</li>
                    </ul>
                    <p>使用场景：</p>
                    <ul>
                      <li>AR内容空间定位</li>
                      <li>手势和动作识别</li>
                      <li>空间交互控制</li>
                    </ul>
                  </li>
                  <li>
                    <strong>空间感知数据</strong>
                    <p>用于环境理解和场景重建：</p>
                    <ul>
                      <li>空间点云数据</li>
                      <li>平面检测结果</li>
                      <li>光照估计数据</li>
                      <li>空间网格模型</li>
                    </ul>
                    <p>数据处理：</p>
                    <ul>
                      <li>本地实时处理</li>
                      <li>仅保存处理结果</li>
                      <li>支持空间数据清除</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.5 3D内容与创作数据" name="5">
              <div class="right-content">
                <p>为支持3D创作和内容管理,我们会处理以下数据：</p>
                <ul>
                  <li>
                    <strong>3D资源数据</strong>
                    <p>支持的文件格式和内容：</p>
                    <ul>
                      <li>3D模型：.gltf/.glb, .fbx, .obj, .3ds等</li>
                      <li>材质贴图：.png, .jpg, .hdr, .exr等</li>
                      <li>动画数据：骨骼动画、变形动画、关键帧等</li>
                      <li>场景数据：光照、相机、变换等</li>
                    </ul>
                    <p>存储策略：</p>
                    <ul>
                      <li>支持本地和云端存储</li>
                      <li>自动版本控制</li>
                      <li>增量同步更新</li>
                    </ul>
                  </li>
                  <li>
                    <strong>编程与交互数据</strong>
                    <p>可视化编程数据：</p>
                    <ul>
                      <li>Blockly代码块配置</li>
                      <li>自定义函数和变量</li>
                      <li>事件处理逻辑</li>
                      <li>调试和运行日志</li>
                    </ul>
                    <p>脚本代码数据：</p>
                    <ul>
                      <li>Lua/JavaScript等脚本源代码</li>
                      <li>GLSL着色器代码</li>
                      <li>自定义组件配置</li>
                      <li>API调用记录</li>
                    </ul>
                  </li>
                  <li>
                    <strong>项目管理数据</strong>
                    <p>项目相关信息：</p>
                    <ul>
                      <li>项目配置和元数据</li>
                      <li>版本控制信息</li>
                      <li>协作记录</li>
                      <li>发布设置</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.6 使用分析数据" name="6">
              <div class="right-content">
                <p>为了改进产品体验和性能,我们收集以下分析数据：</p>
                <ul>
                  <li>
                    <strong>性能指标数据</strong>
                    <p>系统性能监控：</p>
                    <ul>
                      <li>帧率(FPS)和渲染时间</li>
                      <li>内存使用和GC情况</li>
                      <li>资源加载时间和缓存命中率</li>
                      <li>网络请求延迟和带宽使用</li>
                    </ul>
                    <p>设备负载监控：</p>
                    <ul>
                      <li>CPU和GPU使用率</li>
                      <li>电池消耗情况</li>
                      <li>温度变化趋势</li>
                    </ul>
                  </li>
                  <li>
                    <strong>用户行为数据</strong>
                    <p>功能使用统计：</p>
                    <ul>
                      <li>功能调用频率和时长</li>
                      <li>操作路径和流程</li>
                      <li>偏好设置选择</li>
                      <li>常用工具记录</li>
                    </ul>
                    <p>交互行为分析：</p>
                    <ul>
                      <li>界面点击和手势操作</li>
                      <li>视角移动和缩放</li>
                      <li>编辑操作序列</li>
                    </ul>
                  </li>
                  <li>
                    <strong>异常诊断数据</strong>
                    <p>错误日志记录：</p>
                    <ul>
                      <li>崩溃和异常堆栈</li>
                      <li>资源加载失败</li>
                      <li>API调用错误</li>
                      <li>性能瓶颈警告</li>
                    </ul>
                    <p>诊断信息收集：</p>
                    <ul>
                      <li>问题复现步骤</li>
                      <li>环境配置信息</li>
                      <li>相关操作日志</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="info-usage">
          <h2>2. 信息使用</h2>
          <el-collapse v-model="activeUsage">
            <el-collapse-item title="2.1 基础功能服务" name="1">
              <div class="right-content">
                <p>我们使用收集的信息提供以下基础服务：</p>
                <ul>
                  <li>
                    <strong>账户管理</strong>
                    <p>基本功能：</p>
                    <ul>
                      <li>用户身份验证和登录授权</li>
                      <li>个人资料管理和设置</li>
                      <li>账户安全监控和风险预警</li>
                      <li>多设备登录状态同步</li>
                    </ul>
                  </li>
                  <li>
                    <strong>内容存储</strong>
                    <p>存储服务：</p>
                    <ul>
                      <li>3D模型和资源文件存储</li>
                      <li>项目文件备份和同步</li>
                      <li>版本历史记录保存</li>
                      <li>资源智能压缩和优化</li>
                    </ul>
                  </li>
                  <li>
                    <strong>系统优化</strong>
                    <p>性能优化：</p>
                    <ul>
                      <li>根据设备性能自动调节渲染质量</li>
                      <li>智能资源预加载和缓存</li>
                      <li>网络连接质量自适应</li>
                      <li>后台进程优化管理</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.2 AR功能支持" name="2">
              <div class="right-content">
                <p>为提供高质量的AR体验,我们使用数据支持以下功能：</p>
                <ul>
                  <li>
                    <strong>空间定位</strong>
                    <p>核心功能：</p>
                    <ul>
                      <li>实时6DOF位置追踪</li>
                      <li>环境特征点检测和匹配</li>
                      <li>空间锚点保存和恢复</li>
                      <li>多用户空间同步</li>
                    </ul>
                  </li>
                  <li>
                    <strong>场景理解</strong>
                    <p>环境感知：</p>
                    <ul>
                      <li>平面和物体检测</li>
                      <li>光照估计和阴影计算</li>
                      <li>空间网格重建</li>
                      <li>遮挡关系处理</li>
                    </ul>
                  </li>
                  <li>
                    <strong>交互响应</strong>
                    <p>交互功能：</p>
                    <ul>
                      <li>手势识别和追踪</li>
                      <li>虚实物体碰撞检测</li>
                      <li>空间音频定位</li>
                      <li>触觉反馈协同</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.3 创作工具功能" name="3">
              <div class="right-content">
                <p>为支持专业的创作需求,我们提供以下工具功能：</p>
                <ul>
                  <li>
                    <strong>3D编辑器</strong>
                    <p>编辑功能：</p>
                    <ul>
                      <li>模型导入和优化处理</li>
                      <li>材质和贴图编辑</li>
                      <li>动画制作和预览</li>
                      <li>场景布局和组合</li>
                    </ul>
                  </li>
                  <li>
                    <strong>可视化编程</strong>
                    <p>开发工具：</p>
                    <ul>
                      <li>Blockly代码块编程</li>
                      <li>逻辑流程可视化</li>
                      <li>实时预览和调试</li>
                      <li>代码导出和部署</li>
                    </ul>
                  </li>
                  <li>
                    <strong>协作功能</strong>
                    <p>团队协作：</p>
                    <ul>
                      <li>多人实时编辑</li>
                      <li>版本控制和合并</li>
                      <li>评论和反馈</li>
                      <li>权限管理和审核</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.4 服务优化与个性化" name="4">
              <div class="right-content">
                <p>为提供更好的用户体验,我们会进行以下优化：</p>
                <ul>
                  <li>
                    <strong>性能优化</strong>
                    <p>系统优化：</p>
                    <ul>
                      <li>根据使用习惯优化资源加载</li>
                      <li>自适应渲染质量调节</li>
                      <li>智能内存和缓存管理</li>
                      <li>网络传输优化</li>
                    </ul>
                  </li>
                  <li>
                    <strong>个性化推荐</strong>
                    <p>内容推荐：</p>
                    <ul>
                      <li>相关模型和资源推荐</li>
                      <li>教程和文档匹配</li>
                      <li>工具和插件建议</li>
                      <li>协作者推荐</li>
                    </ul>
                  </li>
                  <li>
                    <strong>界面适配</strong>
                    <p>交互优化：</p>
                    <ul>
                      <li>自定义快捷键和工具栏</li>
                      <li>常用功能快速访问</li>
                      <li>工作区布局记忆</li>
                      <li>多语言支持</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="info-protection">
          <h2>3. 信息保护</h2>
          <el-collapse v-model="activeProtection">
            <el-collapse-item title="3.1 技术措施" name="1">
              <div class="right-content">
                <p>采取的技术保护措施：</p>
                <ul>
                  <li>传输加密：使用SSL/TLS加密传输</li>
                  <li>存储加密：敏感数据加密存储</li>
                  <li>访问控制：严格的权限管理机制</li>
                  <li>安全审计：定期的安全评估和漏洞扫描</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="3.2 管理措施" name="2">
              <div class="right-content">
                <p>管理层面的保护措施：</p>
                <ul>
                  <li>内部管理制度：建立完善的信息安全管理体系</li>
                  <li>人员管理：定期的安全培训和考核</li>
                  <li>应急响应：建立安全事件应急预案</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="3.3 特殊数据保护" name="3">
              <div class="right-content">
                <ul>
                  <li>
                    <strong>实时数据保护</strong>
                    <p>传感器数据保护：</p>
                    <ul>
                      <li>摄像头数据仅在内存中实时处理,不进行持久化存储</li>
                      <li>传感器数据经过脱敏处理后用于功能实现</li>
                      <li>位置数据提供精度调节选项</li>
                    </ul>
                  </li>
                  <li>
                    <strong>创作内容保护</strong>
                    <p>创作数据保护：</p>
                    <ul>
                      <li>提供端到端加密存储</li>
                      <li>支持细粒度访问权限控制</li>
                      <li>自动版本备份机制</li>
                      <li>数据导出和迁移选项</li>
                    </ul>
                  </li>
                  <li>
                    <strong>协作数据保护</strong>
                    <p>协作场景保护：</p>
                    <ul>
                      <li>基于角色的权限管理</li>
                      <li>操作日志完整记录</li>
                      <li>敏感数据脱敏展示</li>
                      <li>协作会话加密传输</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="user-rights">
          <h2>4. 您的权利</h2>
          <el-collapse v-model="activeRights">
            <el-collapse-item title="4.1 信息访问权" name="1">
              <div class="right-content">
                <p>您有权：</p>
                <ul>
                  <li>查询、访问您的个人信息</li>
                  <li>了解个人信息的处理状态</li>
                  <li>获取个人信息副本</li>
                </ul>
                <p>访问方式：</p>
                <ul>
                  <li>登录账户查看个人中心</li>
                  <li>联系客服申请信息副本</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.2 信息更正权" name="2">
              <div class="right-content">
                <p>您可以：</p>
                <ul>
                  <li>修改账户基本信息</li>
                  <li>更新个人资料</li>
                  <li>要求更正不准确的信息</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.3 信息删除权" name="3">
              <div class="right-content">
                <p>以下情况您可以申请删除信息：</p>
                <ul>
                  <li>处理目的已实现或不再需要</li>
                  <li>我们停止服务或运营</li>
                  <li>您撤回同意</li>
                  <li>违反法律法规或约定</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.4 撤回授权同意权" name="4">
              <div class="right-content">
                <p>您可以：</p>
                <ul>
                  <li>撤回订阅同意</li>
                  <li>取消第三方账号关联</li>
                  <li>关闭特定功能授权</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="cookies">
          <h2>5. Cookie的使用</h2>
          <el-table :data="cookieData" style="width: 100%">
            <el-table-column
              prop="type"
              label="Cookie类型"
              width="180"
            ></el-table-column>
            <el-table-column prop="purpose" label="使用目的"></el-table-column>
            <el-table-column
              prop="duration"
              label="保存时间"
              width="180"
            ></el-table-column>
          </el-table>
        </section>

        <section class="contact">
          <h2>6. 联系我们</h2>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="邮箱地址">
              <el-tag size="small">bujiabangongzuoshi@yeah.net</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              <el-tag size="small">+86 150-0015-9790</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工作时间">
              <el-tag size="small">周一至周五 10:00-18:30</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="响应时间">
              <el-tag size="small">收到请求后5个工作日内回复</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="updates">
          <h2>7. 政策更新</h2>
          <p>
            我们可能会适时更新本隐私政策。当本隐私政策发生重大变更时，我们会在网站显著位置发布通知，并通过站内信或邮件等方式通知您。
          </p>
          <el-timeline>
            <el-timeline-item
              v-for="(update, index) in policyUpdates"
              :key="index"
              :timestamp="update.date"
              :type="index === 0 ? 'primary' : 'info'"
            >
              {{ update.content }}
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineOptions({
  name: "PrivacyPolicy",
  inheritAttrs: false,
});

// 各部分的展开面板状态
const activeCollection = ref(["1"]);
const activeUsage = ref(["1"]);
const activeProtection = ref(["1"]);
const activeRights = ref(["1"]);

const cookieData = ref([
  {
    type: "必要Cookie",
    purpose: "维持核心功能运行,包括用户认证、场景状态保持、编辑器配置等",
    duration: "会话期间",
  },
  {
    type: "功能Cookie",
    purpose: "存储用户偏好,如界面布局、3D视图设置、编程环境配置、语言选择等",
    duration: "1年",
  },
  {
    type: "性能Cookie",
    purpose: "优化AR渲染、3D场景加载、资源缓存等性能相关配置",
    duration: "30天",
  },
  {
    type: "分析Cookie",
    purpose: "收集匿名使用数据,用于功能改进和性能优化",
    duration: "30天",
  },
  {
    type: "协作Cookie",
    purpose: "支持多人实时协作功能,存储会话信息和临时数据",
    duration: "会话期间",
  },
]);

// 政策更新历史
const policyUpdates = ref([
  {
    date: "2024-12-05",
    content:
      "隐私政策1.0.0版本发布,全面覆盖AR/VR功能、3D创作工具、实时协作等核心功能的隐私保护规范",
  },
  {
    date: "2024-10-15",
    content: "增加设备传感器数据采集说明和保护措施",
  },
  {
    date: "2024-09-01",
    content: "新增创作内容知识产权保护条款",
  },
  {
    date: "2024-08-01",
    content: "初始版本制定",
  },
]);
</script>

<style lang="scss" scoped>
.privacy-policy {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;

  @media screen and (max-width: 768px) {
    padding: 10px;
    overflow-x: hidden;
    width: 100%;
  }

  .policy-card {
    @media screen and (max-width: 768px) {
      :deep(.el-card__body) {
        padding: 10px 5px;
      }
    }

    .policy-content {
      padding: 20px 0;

      section {
        margin-bottom: 40px;
        padding: 0 16px;

        &:last-child {
          margin-bottom: 20px;
        }

        h2 {
          font-size: 22px;
          color: #303133;
          margin: 24px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ebeef5;
        }

        h3 {
          font-size: 18px;
          color: #303133;
          margin: 20px 0 12px;
        }

        p {
          color: #606266;
          line-height: 1.8;
          margin-bottom: 16px;
          text-align: justify;
        }

        ul {
          padding-left: 20px;
          margin-bottom: 16px;

          li {
            color: #606266;
            line-height: 1.8;
            margin-bottom: 8px;
            position: relative;

            &::before {
              content: "•";
              color: #409eff;
              position: absolute;
              left: -15px;
            }
          }
        }

        &.introduction {
          p {
            font-size: 16px;
            line-height: 2;
          }
        }

        &.user-rights {
          .right-content {
            padding: 16px;
            background-color: #f8f9fa;
            border-radius: 4px;
          }
        }

        &.contact {
          :deep(.el-descriptions) {
            margin-top: 16px;
          }
        }

        &.updates {
          :deep(.el-timeline) {
            margin-top: 24px;
            padding-left: 16px;
          }
        }
      }
    }
  }
}

// 响应式适配
@media screen and (max-width: 768px) {
  .privacy-policy {
    padding: 10px;

    .policy-card {
      .card-header {
        h1 {
          font-size: 20px;
        }

        .header-meta {
          flex-direction: column;
          gap: 5px;
        }
      }

      .policy-content {
        padding: 10px 0;

        section {
          margin-bottom: 24px;
          padding: 0 8px;

          h2 {
            font-size: 18px;
            margin: 16px 0 12px;
          }

          h3 {
            font-size: 16px;
            margin: 14px 0 10px;
          }

          p,
          ul li {
            font-size: 14px;
          }
        }
      }
    }
  }
}

.cookies {
  :deep(.el-table) {
    @media screen and (max-width: 768px) {
      width: 100% !important;

      .el-table__header-wrapper,
      .el-table__body-wrapper {
        width: 100%;
      }

      .el-table-column--mini {
        min-width: auto;
      }

      .el-table__cell {
        padding: 8px 5px;
      }

      .cell {
        white-space: normal;
        word-break: break-all;
      }
    }
  }
}

.contact {
  :deep(.el-descriptions) {
    @media screen and (max-width: 768px) {
      width: 100%;

      .el-descriptions__body {
        padding: 8px 5px;
      }

      .el-descriptions-item__label {
        width: auto;
        min-width: auto;
        padding: 8px 5px;
      }

      .el-descriptions-item__content {
        padding: 8px 5px;
      }

      .el-tag {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.right-content {
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;

  p {
    margin-bottom: 12px;
    color: #606266;
  }

  ul {
    padding-left: 20px;
    margin-bottom: 16px;

    li {
      margin-bottom: 8px;
      position: relative;

      &::before {
        content: "•";
        color: #409eff;
        position: absolute;
        left: -15px;
      }

      strong {
        color: #303133;
        font-weight: 500;
      }

      ul {
        margin-top: 8px;
        margin-bottom: 8px;
        padding-left: 20px;

        li {
          margin-bottom: 4px;
          color: #606266;

          &::before {
            content: "◦";
            color: #909399;
          }
        }
      }
    }
  }
}
</style>
