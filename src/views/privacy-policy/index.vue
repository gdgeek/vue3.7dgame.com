<template>
  <div class="privacy-policy">
    <!-- 添加顶部选项卡导航 -->
    <el-tabs
      v-model="activeTab"
      class="policy-tabs"
      type="border-card"
      @tab-click="handleTabClick"
    >
      <el-tab-pane label="隐私政策" name="privacy"></el-tab-pane>
      <el-tab-pane label="服务条款" name="terms"></el-tab-pane>
    </el-tabs>

    <!-- 隐私政策内容 -->
    <el-card v-if="activeTab === 'privacy'" class="policy-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h1>隐私政策</h1>
          <div class="header-meta">
            <span class="version">版本: 1.2.0</span>
            <span class="update-time">生效日期: 2025年4月16日</span>
          </div>
        </div>
      </template>

      <div class="policy-content">
        <section class="introduction">
          <h2>引言</h2>
          <p>
            欢迎使用由上海不加班网络科技有限公司（以下简称"我们"）开发的混合现实编程与游戏平台。本平台提供沉浸式的混合现实体验、游戏开发工具和可视化编程环境，支持Rokid等AR设备，让用户能够轻松创建和分享3D内容。我们深知在提供这些服务的过程中，个人信息对您的重要性，并会采取业界领先的技术手段和管理措施保护您的个人信息安全。
          </p>
          <p>
            本隐私政策详细说明了我们如何收集、使用、存储和保护您的信息，以及您享有的相关权利。这些信息对于提供3D渲染、多人协作、内容分享等功能至关重要。请您仔细阅读并理解本政策的全部内容。
          </p>
        </section>

        <section class="info-collection">
          <h2>1. 信息收集</h2>
          <el-collapse v-model="activeCollection" class="custom-collapse">
            <el-collapse-item title="1.1 账户信息" name="1">
              <div class="right-content">
                <p>
                  为了提供个性化服务和确保账户安全，我们收集的账户信息包括：
                </p>
                <ul>
                  <li>
                    <strong>基本账户信息</strong>
                    <p>用于身份识别和登录：</p>
                    <ul>
                      <li>用户名和密码</li>
                      <li>电子邮箱地址</li>
                      <li>手机号码(可选)</li>
                      <li>账户创建时间</li>
                      <li>账户登录记录</li>
                    </ul>
                  </li>
                  <li>
                    <strong>个人资料信息</strong>
                    <p>用于社交互动和作品展示：</p>
                    <ul>
                      <li>昵称和头像</li>
                      <li>个人简介</li>
                      <li>创作者标签</li>
                      <li>技能等级和创作成就</li>
                    </ul>
                  </li>
                  <li>
                    <strong>认证信息</strong>
                    <p>用于特定功能和权限：</p>
                    <ul>
                      <li>实名认证信息(可选)</li>
                      <li>专业认证资质(可选)</li>
                      <li>组织机构信息(可选)</li>
                      <li>付款方式信息(可选，用于内容付费和道具购买)</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.2 系统使用数据" name="2">
              <div class="right-content">
                <p>为了优化用户体验和系统性能，我们收集的系统数据包括：</p>
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
                      <li>AR眼镜型号和固件版本（如适用）</li>
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
                      <li>多人游戏会话连接状态</li>
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
                      <li>游戏运行指标</li>
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
                      <li>QQ登录(中国大陆用户)</li>
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
                <p>
                  为了实现混合现实功能和空间交互，我们需要访问以下传感器数据：
                </p>
                <ul>
                  <li>
                    <strong>摄像头数据</strong>
                    <p>用于混合现实场景渲染和空间识别：</p>
                    <ul>
                      <li>RGB摄像头实时视频流</li>
                      <li>深度摄像头数据(如有)</li>
                      <li>环境光传感器数据</li>
                      <li>相机参数(焦距、光圈等)</li>
                      <li>Rokid眼镜视角和跟踪数据</li>
                      <li>人脸特征点和轮廓数据</li>
                    </ul>
                    <p>使用说明：</p>
                    <ul>
                      <li>仅在混合现实功能开启时采集</li>
                      <li>数据实时处理，不存储原始图像</li>
                      <li>可随时通过权限设置关闭</li>
                      <li>用于游戏场景中的虚实融合</li>
                      <li>
                        人脸数据仅用于AR效果中的面部遮罩、位置跟踪和表情识别
                      </li>
                      <li>
                        人脸数据全部在本地设备上实时处理，不会上传至服务器或共享给第三方
                      </li>
                      <li>我们不会保存任何可识别个人身份的人脸数据</li>
                    </ul>
                  </li>
                  <li>
                    <strong>运动传感器数据</strong>
                    <p>用于设备姿态追踪和游戏控制：</p>
                    <ul>
                      <li>陀螺仪：设备旋转角度和角速度</li>
                      <li>加速度计：线性加速度和重力方向</li>
                      <li>磁力计：空间朝向参考</li>
                      <li>惯性测量单元(IMU)融合数据</li>
                      <li>手柄和控制器追踪数据</li>
                    </ul>
                    <p>使用场景：</p>
                    <ul>
                      <li>游戏角色和视角控制</li>
                      <li>手势和动作识别</li>
                      <li>空间交互控制</li>
                      <li>游戏内物理交互</li>
                    </ul>
                  </li>
                  <li>
                    <strong>空间感知数据</strong>
                    <p>用于环境理解和游戏场景适配：</p>
                    <ul>
                      <li>空间点云数据</li>
                      <li>平面检测结果</li>
                      <li>光照估计数据</li>
                      <li>空间网格模型</li>
                      <li>房间布局识别</li>
                    </ul>
                    <p>数据处理：</p>
                    <ul>
                      <li>本地实时处理</li>
                      <li>仅保存处理结果</li>
                      <li>支持空间数据清除</li>
                      <li>用于游戏场景的智能适配</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.5 3D内容与创作数据" name="5">
              <div class="right-content">
                <p>为支持3D游戏创作和内容管理，我们会处理以下数据：</p>
                <ul>
                  <li>
                    <strong>3D资源数据</strong>
                    <p>支持的文件格式和内容：</p>
                    <ul>
                      <li>
                        3D模型：.gltf/.glb, .fbx, .obj, .3ds, .dae, .stl等
                      </li>
                      <li>材质贴图：.png, .jpg, .hdr, .exr, .tga, .ktx2等</li>
                      <li>动画数据：骨骼动画、变形动画、关键帧等</li>
                      <li>场景数据：光照、相机、变换等</li>
                      <li>物理属性：碰撞体、刚体、布料模拟参数等</li>
                      <li>游戏角色和NPC配置</li>
                    </ul>
                    <p>存储策略：</p>
                    <ul>
                      <li>支持本地和云端存储</li>
                      <li>自动版本控制</li>
                      <li>增量同步更新</li>
                      <li>游戏存档备份</li>
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
                      <li>游戏规则和机制配置</li>
                    </ul>
                    <p>脚本代码数据：</p>
                    <ul>
                      <li>Lua/JavaScript等脚本源代码</li>
                      <li>GLSL着色器代码</li>
                      <li>自定义组件配置</li>
                      <li>API调用记录</li>
                      <li>游戏逻辑规则</li>
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
                      <li>游戏测试记录和反馈</li>
                      <li>游戏分发和分享设置</li>
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
                      <li>WebGL性能指标</li>
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
                      <li>崩溃时的场景状态</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.7 儿童个人信息" name="7">
              <div class="right-content">
                <p>我们非常重视对儿童个人信息的保护：</p>
                <ul>
                  <li>
                    <strong>儿童定义</strong>
                    <p>根据相关法律法规：</p>
                    <ul>
                      <li>儿童是指不满14周岁的未成年人</li>
                      <li>青少年是指年满14周岁但不满18周岁的未成年人</li>
                    </ul>
                  </li>
                  <li>
                    <strong>收集限制</strong>
                    <p>相关限制措施：</p>
                    <ul>
                      <li>不主动收集儿童个人信息</li>
                      <li>需要监护人明确同意才能收集和使用</li>
                      <li>对儿童信息收集实行最小化原则</li>
                      <li>提供专门的儿童模式与保护功能</li>
                    </ul>
                  </li>
                  <li>
                    <strong>使用限制</strong>
                    <p>对儿童信息的使用限制：</p>
                    <ul>
                      <li>限制营销内容向儿童推送</li>
                      <li>不会将儿童信息用于商业用途</li>
                      <li>加强对儿童内容的安全审核</li>
                      <li>提供适龄提示和内容筛选</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="info-usage">
          <h2>2. 信息使用</h2>
          <el-collapse v-model="activeUsage" class="custom-collapse">
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
                      <li>双因素认证和安全登录</li>
                      <li>游戏内偏好设置保存</li>
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
                      <li>游戏存档云同步</li>
                      <li>资源库共享和团队协作</li>
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
                      <li>渐进式加载与Level of Detail管理</li>
                      <li>多人游戏网络同步优化</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.2 混合现实功能支持" name="2">
              <div class="right-content">
                <p>为提供高质量的混合现实体验，我们使用数据支持以下功能：</p>
                <ul>
                  <li>
                    <strong>空间定位</strong>
                    <p>核心功能：</p>
                    <ul>
                      <li>实时6DOF位置追踪</li>
                      <li>环境特征点检测和匹配</li>
                      <li>空间锚点保存和恢复</li>
                      <li>多用户空间同步</li>
                      <li>Rokid设备空间定位适配</li>
                      <li>游戏世界与现实空间映射</li>
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
                      <li>场景语义标注</li>
                      <li>游戏内容与真实环境融合</li>
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
                      <li>多人游戏交互同步</li>
                      <li>智能角色互动</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.3 游戏与创作工具功能" name="3">
              <div class="right-content">
                <p>为支持专业的游戏创作需求，我们提供以下工具功能：</p>
                <ul>
                  <li>
                    <strong>3D编辑器</strong>
                    <p>编辑功能：</p>
                    <ul>
                      <li>模型导入和优化处理</li>
                      <li>材质和贴图编辑</li>
                      <li>动画制作和预览</li>
                      <li>场景布局和组合</li>
                      <li>游戏角色设计</li>
                      <li>游戏关卡编辑</li>
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
                      <li>游戏脚本编写</li>
                      <li>人工智能行为设计</li>
                    </ul>
                  </li>
                  <li>
                    <strong>游戏功能</strong>
                    <p>游戏相关：</p>
                    <ul>
                      <li>多人在线游戏支持</li>
                      <li>成就和排行榜系统</li>
                      <li>游戏内社交功能</li>
                      <li>自定义游戏规则配置</li>
                      <li>游戏内道具系统</li>
                      <li>安全游戏体验保障</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.4 服务优化与个性化" name="4">
              <div class="right-content">
                <p>为提供更好的用户体验，我们会进行以下优化：</p>
                <ul>
                  <li>
                    <strong>性能优化</strong>
                    <p>系统优化：</p>
                    <ul>
                      <li>根据使用习惯优化资源加载</li>
                      <li>自适应渲染质量调节</li>
                      <li>智能内存和缓存管理</li>
                      <li>网络传输优化</li>
                      <li>游戏帧率智能控制</li>
                      <li>AR设备性能适配</li>
                    </ul>
                  </li>
                  <li>
                    <strong>个性化推荐</strong>
                    <p>内容推荐：</p>
                    <ul>
                      <li>相关游戏资源推荐</li>
                      <li>教程和文档匹配</li>
                      <li>工具和插件建议</li>
                      <li>协作者推荐</li>
                      <li>游戏内容发现</li>
                      <li>创作灵感建议</li>
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
                      <li>AR眼镜界面优化</li>
                      <li>游戏控制自定义</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="info-protection">
          <h2>3. 信息保护</h2>
          <el-collapse v-model="activeProtection" class="custom-collapse">
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
                      <li>运动数据仅用于交互，不关联个人身份</li>
                    </ul>
                  </li>
                  <li>
                    <strong>人脸数据保护</strong>
                    <p>面部信息保护措施：</p>
                    <ul>
                      <li>人脸特征数据仅在设备本地进行实时处理和分析</li>
                      <li>不会创建或存储个人面部特征数据库或生物特征模板</li>
                      <li>不会将面部数据用于身份识别或认证目的</li>
                      <li>面部数据不会上传至云端或与任何第三方共享</li>
                      <li>用户可以随时通过权限设置停止面部数据的收集</li>
                      <li>我们采用业界领先的数据安全标准保护处理过程</li>
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

            <el-collapse-item title="3.4 禁止行为" name="4">
              <div class="right-content">
                <p>使用我们平台时，严禁以下行为：</p>
                <ul>
                  <li>
                    <strong>内容违规</strong>
                    <p>包括但不限于：</p>
                    <ul>
                      <li>发布或传播违法、色情、暴力、政治敏感内容</li>
                      <li>侵犯他人知识产权、肖像权或隐私权</li>
                      <li>散布虚假信息或进行欺诈活动</li>
                      <li>发布含有歧视、仇恨言论的内容</li>
                    </ul>
                  </li>
                  <li>
                    <strong>技术滥用</strong>
                    <p>包括但不限于：</p>
                    <ul>
                      <li>对平台进行任何形式的攻击或入侵</li>
                      <li>使用自动化工具批量创建内容或账号</li>
                      <li>进行可能导致服务不稳定的高频率API调用</li>
                      <li>提取、抓取平台数据用于未授权目的</li>
                    </ul>
                  </li>
                  <li>
                    <strong>商业滥用</strong>
                    <p>包括但不限于：</p>
                    <ul>
                      <li>未经授权使用平台资源进行商业活动</li>
                      <li>通过平台进行非法商业推广或营销</li>
                      <li>使用平台内容进行未授权的商业开发</li>
                      <li>冒充平台官方或合作伙伴进行活动</li>
                    </ul>
                  </li>
                </ul>
                <p>
                  我们有权对违规内容进行下架、删除，并视情节严重程度对账号进行限制或封禁。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="user-rights">
          <h2>4. 您的权利</h2>
          <el-collapse v-model="activeRights" class="custom-collapse">
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
                  <li>随时申请注销账户</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.5 数据可携带权" name="5">
              <div class="right-content">
                <p>您可以：</p>
                <ul>
                  <li>导出您创建的内容和数据</li>
                  <li>以通用格式获取个人资料</li>
                  <li>将数据转移到其他服务</li>
                </ul>
                <p>实现方式：</p>
                <ul>
                  <li>通过个人中心的数据导出功能</li>
                  <li>通过客服申请数据包</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="cookies">
          <h2>5. Cookie的使用</h2>
          <el-table
            :data="cookieData"
            style="width: 100%"
            stripe
            border
            class="custom-table"
          >
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
          <el-descriptions :column="1" border class="contact-info">
            <el-descriptions-item label="邮箱地址">
              <el-tag size="small" type="primary">contact@bujiaban.com</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              <el-tag size="small" type="success">+86 150-0015-9790</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工作时间">
              <el-tag size="small" type="warning"
                >周一至周五 10:00-18:30</el-tag
              >
            </el-descriptions-item>
            <el-descriptions-item label="响应时间">
              <el-tag size="small" type="info"
                >收到请求后5个工作日内回复</el-tag
              >
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="updates">
          <h2>7. 政策更新</h2>
          <p>
            我们可能会适时更新本隐私政策。当本隐私政策发生重大变更时，我们会在网站显著位置发布通知，并通过站内信或邮件等方式通知您。
          </p>
          <el-timeline class="policy-timeline">
            <el-timeline-item
              v-for="(update, index) in policyUpdates"
              :key="index"
              :timestamp="update.date"
              :type="index === 0 ? 'primary' : 'info'"
              :size="index === 0 ? 'large' : 'normal'"
            >
              {{ update.content }}
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </el-card>

    <!-- 服务条款内容 -->
    <el-card v-else class="policy-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h1>服务条款</h1>
          <div class="header-meta">
            <span class="version">版本: 1.2.0</span>
            <span class="update-time">生效日期: 2024年8月15日</span>
          </div>
        </div>
      </template>

      <div class="policy-content">
        <section class="introduction">
          <h2>引言</h2>
          <p>
            感谢您选择使用上海不加班网络科技有限公司（以下简称"我们"）开发的混合现实编程与游戏平台服务（以下简称"服务"）。本服务条款是您与上海不加班网络科技有限公司之间关于您使用我们服务的法律协议。
          </p>
          <p>
            请您在使用我们的服务前，仔细阅读并充分理解本服务条款的全部内容。一旦您注册、登录、使用或以任何方式表示接受本服务，即表示您已充分理解并同意本条款的全部内容。如果您不同意本服务条款的任何内容，请勿注册或使用我们的服务。
          </p>
        </section>

        <section class="terms-service">
          <h2>1. 服务说明</h2>
          <el-collapse v-model="activeTermsService" class="custom-collapse">
            <el-collapse-item title="1.1 服务内容" name="1">
              <div class="right-content">
                <p>我们提供的混合现实编程与游戏平台服务包括但不限于：</p>
                <ul>
                  <li>混合现实（AR/VR）内容创作工具</li>
                  <li>3D建模与动画编辑</li>
                  <li>可视化编程环境</li>
                  <li>多人实时协作与游戏互动</li>
                  <li>内容分享与发布</li>
                  <li>云端存储与同步</li>
                  <li>AR/VR游戏开发工具</li>
                  <li>交互式虚拟场景构建</li>
                  <li>支持Rokid等AR设备的应用开发</li>
                  <li>在线游戏体验与分享</li>
                </ul>
                <p>
                  我们有权在任何时候修改或中断服务，而无需通知您。我们不对因服务中断给您带来的不便或损失承担责任。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="1.2 服务变更与终止" name="2">
              <div class="right-content">
                <p>我们有权在以下情况下变更或终止服务：</p>
                <ul>
                  <li>根据法律法规或政策要求进行变更或终止</li>
                  <li>产品迭代或技术升级需要变更或调整服务</li>
                  <li>不可抗力导致的服务中断或终止</li>
                  <li>出于安全或其他合理原因需要变更或终止服务</li>
                  <li>平台重大技术调整或业务调整</li>
                  <li>AR/VR设备支持策略调整</li>
                </ul>
                <p>
                  服务变更或终止前，我们将尽可能通过适当方式通知您，并为您提供合理的时间保存和导出您的数据。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="terms-account">
          <h2>2. 账户管理</h2>
          <el-collapse v-model="activeTermsAccount" class="custom-collapse">
            <el-collapse-item title="2.1 账户注册与安全" name="1">
              <div class="right-content">
                <p>您在注册和使用账户时应当遵守以下规定：</p>
                <ul>
                  <li>提供真实、准确、完整的个人资料</li>
                  <li>妥善保管账户名称、密码及其他账户信息</li>
                  <li>不得将账户出借、转让或共享给他人使用</li>
                  <li>发现账户被盗用应立即通知我们</li>
                  <li>遵守健康游戏规则，合理控制游戏时间</li>
                  <li>未成年人使用服务前应获得监护人同意</li>
                </ul>
                <p>
                  您对通过您的账户所进行的所有活动和事件负责。如因您未妥善保管账户信息导致的损失，由您自行承担。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="2.2 账户限制与注销" name="2">
              <div class="right-content">
                <p>在以下情况下，我们有权限制或注销您的账户：</p>
                <ul>
                  <li>提供虚假个人资料</li>
                  <li>违反本服务条款或相关法律法规</li>
                  <li>长期未使用账户</li>
                  <li>账户存在安全风险</li>
                  <li>从事损害平台或其他用户权益的行为</li>
                  <li>账户被用于进行欺诈或其他违法活动</li>
                  <li>恶意利用平台漏洞或技术缺陷</li>
                  <li>创建或分享不适当的游戏内容</li>
                  <li>干扰其他用户的游戏体验</li>
                </ul>
                <p>
                  账户注销后，您的个人资料和数据将按照我们的隐私政策进行处理。注销流程通常需要5-15个工作日完成，在此期间您仍可取消注销申请。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="terms-content">
          <h2>3. 内容规范</h2>
          <el-collapse v-model="activeTermsContent" class="custom-collapse">
            <el-collapse-item title="3.1 用户创作内容" name="1">
              <div class="right-content">
                <p>您通过我们的服务创作、上传、分享的内容应当遵守以下规定：</p>
                <ul>
                  <li>不得侵犯他人知识产权、肖像权、隐私权等合法权益</li>
                  <li>不得包含色情、暴力、歧视、诽谤等违法或不良信息</li>
                  <li>不得包含政治敏感、煽动民族仇恨等内容</li>
                  <li>不得包含病毒、恶意代码等有害程序</li>
                  <li>不得进行商业广告宣传（除非获得我们的授权）</li>
                  <li>游戏内容应适合目标年龄段用户</li>
                  <li>不得创建导致AR设备使用者产生身体不适的内容</li>
                  <li>不得设计可能导致用户在现实环境中产生危险的游戏机制</li>
                </ul>
                <p>
                  我们有权对违反上述规定的内容进行删除，并视情况对相关账户进行处理。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="3.2 知识产权" name="2">
              <div class="right-content">
                <p>关于知识产权的规定如下：</p>
                <ul>
                  <li>
                    我们的服务、软件及其中的所有权利（包括但不限于著作权、商标权、专利权等）均归我们所有
                  </li>
                  <li>
                    您创作的内容的知识产权归您所有，但您授予我们全球性、免费、非独占、可转授权的许可，以便我们存储、使用、传输、展示和分发您的内容
                  </li>
                  <li>
                    您保证对您上传的内容拥有合法权利，不会侵犯任何第三方的合法权益
                  </li>
                  <li>
                    如您的内容侵犯他人权益，您将承担全部法律责任，并赔偿因此给我们造成的损失
                  </li>
                  <li>
                    您同意不会对我们的服务、软件进行反向工程、反编译或试图提取源代码
                  </li>
                  <li>
                    您通过平台创作的游戏内容，在使用我们的SDK或API进行商业化时，可能需要额外的商业授权
                  </li>
                  <li>
                    对于平台提供的游戏模板、素材和工具，您仅获得在平台内使用的权利，不得单独提取用于其他商业目的
                  </li>
                  <li>
                    在游戏设计中使用AI生成内容时，需遵守相关的使用条款和版权规定
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="terms-liability">
          <h2>4. 免责声明</h2>
          <el-collapse v-model="activeTermsLiability" class="custom-collapse">
            <el-collapse-item title="4.1 服务保证与限制" name="1">
              <div class="right-content">
                <p>关于我们的服务，您需了解以下事项：</p>
                <ul>
                  <li>
                    我们将尽最大努力确保服务的安全性和稳定性，但不能保证服务完全不会中断或没有错误
                  </li>
                  <li>
                    我们不对因网络故障、系统维护、升级等原因导致的服务中断承担责任
                  </li>
                  <li>
                    我们不对因您的设备、网络环境等原因导致的服务体验问题承担责任
                  </li>
                  <li>
                    我们不保证服务满足您的所有需求，也不保证服务的准确性和及时性
                  </li>
                  <li>我们不对AR/VR设备使用过程中可能产生的身体不适承担责任</li>
                  <li>
                    我们不对用户在使用AR功能时因注意力分散导致的意外承担责任
                  </li>
                  <li>
                    我们不对第三方创建的游戏可能产生的任何争议或纠纷承担责任
                  </li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="4.2 损失责任限制" name="2">
              <div class="right-content">
                <p>在法律允许的最大范围内：</p>
                <ul>
                  <li>
                    我们不对您使用我们服务过程中的间接损失、特殊损失、附带损失或惩罚性损害赔偿承担责任
                  </li>
                  <li>
                    我们对您使用服务造成的直接损失的赔偿责任，以您在损失发生前12个月内为服务支付的费用为上限
                  </li>
                  <li>
                    对于通过我们的服务获取的任何第三方服务或内容，我们不承担任何责任
                  </li>
                  <li>
                    我们不对用户创建的游戏可能产生的任何争议或纠纷承担责任
                  </li>
                  <li>
                    我们不对因使用AR/VR设备可能产生的眩晕、头痛等不适症状承担责任
                  </li>
                  <li>
                    我们建议用户在使用AR/VR功能时保持安全环境，避免在危险场所使用
                  </li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <section class="terms-disputes">
          <h2>5. 争议解决</h2>
          <div class="right-content">
            <p>
              本服务条款的解释、效力及争议解决均适用中华人民共和国大陆地区法律（不包括冲突法规则）。
            </p>
            <p>
              您与我们之间的任何争议应友好协商解决。协商不成的，任何一方均有权将争议提交至上海市徐汇区人民法院诉讼解决。
            </p>
            <p>我们提供多种争议解决渠道，包括：</p>
            <ul>
              <li>在线客服反馈</li>
              <li>邮件投诉处理</li>
              <li>社区管理员介入</li>
              <li>法律途径解决</li>
            </ul>
          </div>
        </section>

        <section class="terms-other">
          <h2>6. 其他条款</h2>
          <div class="right-content">
            <ul>
              <li>本服务条款构成您与我们之间关于使用服务的完整协议</li>
              <li>
                本服务条款的任何条款被认定为无效或不可执行，不影响其他条款的效力
              </li>
              <li>
                我们未行使或执行本服务条款中的任何权利或规定，不构成对该权利或规定的放弃
              </li>
              <li>
                我们有权随时修改本服务条款，修改后的条款将在网站上公布，并自公布之日起生效
              </li>
              <li>如条款内容与中国大陆地区法律相抵触，则以法律规定为准</li>
              <li>本条款的标题仅为方便阅读，不影响对条款内容的理解和解释</li>
              <li>服务协议以中文版本为准，其他语言版本仅供参考</li>
            </ul>
          </div>
        </section>

        <section class="contact">
          <h2>7. 联系我们</h2>
          <el-descriptions :column="1" border class="contact-info">
            <el-descriptions-item label="邮箱地址">
              <el-tag size="small" type="primary">contact@bujiaban.com</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              <el-tag size="small" type="success">+86 150-0015-9790</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工作时间">
              <el-tag size="small" type="warning"
                >周一至周五 10:00-18:30</el-tag
              >
            </el-descriptions-item>
            <el-descriptions-item label="响应时间">
              <el-tag size="small" type="info"
                >收到请求后5个工作日内回复</el-tag
              >
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

defineOptions({
  name: "PrivacyPolicy",
  inheritAttrs: false,
});

const route = useRoute();
const router = useRouter();

// 选项卡状态控制
const activeTab = ref("privacy");

// 各部分的展开面板状态
const activeCollection = ref(["1"]);
const activeUsage = ref(["1"]);
const activeProtection = ref(["1"]);
const activeRights = ref(["1"]);

// 服务条款各部分的展开状态
const activeTermsService = ref(["1"]);
const activeTermsAccount = ref(["1"]);
const activeTermsContent = ref(["1"]);
const activeTermsLiability = ref(["1"]);

// 处理URL参数，自动切换到相应的选项卡
onMounted(() => {
  if (route.query.tab === "terms") {
    activeTab.value = "terms";
  } else {
    activeTab.value = "privacy";
  }
});

// 处理选项卡切换，更新URL参数
const handleTabClick = () => {
  router.replace({
    path: route.path,
    query: { tab: activeTab.value },
  });
};

const cookieData = ref([
  {
    type: "必要Cookie",
    purpose: "维持核心功能运行，包括用户认证、游戏状态保持、编辑器配置等",
    duration: "会话期间",
  },
  {
    type: "功能Cookie",
    purpose:
      "存储用户偏好，如界面布局、3D视图设置、编程环境配置、语言选择、游戏设置等",
    duration: "1年",
  },
  {
    type: "性能Cookie",
    purpose: "优化3D渲染、游戏场景加载、资源缓存等性能相关配置",
    duration: "30天",
  },
  {
    type: "分析Cookie",
    purpose: "收集匿名使用数据，用于功能改进和性能优化",
    duration: "30天",
  },
  {
    type: "协作Cookie",
    purpose: "支持多人游戏和实时协作功能，存储会话信息和临时数据",
    duration: "会话期间",
  },
  {
    type: "AR会话Cookie",
    purpose: "存储混合现实会话状态，空间锚点和交互数据",
    duration: "会话期间",
  },
  {
    type: "游戏记录Cookie",
    purpose: "保存游戏进度、成就和个性化游戏体验数据",
    duration: "180天",
  },
]);

// 政策更新历史
const policyUpdates = ref([
  {
    date: "2025-04-16",
    content:
      "隐私政策1.2.0版本发布，更新混合现实游戏平台功能及Rokid设备支持相关内容",
  },
  {
    date: "2025-01-10",
    content: "增加游戏内容创作与分享的隐私保护规定",
  },
  {
    date: "2024-11-05",
    content:
      "隐私政策1.0.0版本发布，全面覆盖混合现实功能、3D创作工具和游戏开发的隐私保护规范",
  },
]);
</script>

<style lang="scss" scoped>
.privacy-policy {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;

  @media screen and (max-width: 768px) {
    padding: 15px;
    overflow-x: hidden;
    width: 100%;
  }

  .policy-tabs {
    margin-bottom: 30px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;

    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }

    :deep(.el-tabs__nav) {
      width: 100%;
      display: flex;
    }

    :deep(.el-tabs__item) {
      flex: 1;
      text-align: center;
      font-size: 16px;
      font-weight: 500;
      height: 50px;
      line-height: 50px;
      transition: all 0.3s;

      &.is-active {
        font-weight: 600;
        color: #409eff;
      }

      &:hover {
        color: #409eff;
      }
    }
  }

  .policy-card {
    margin-bottom: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    :deep(.el-card__header) {
      padding: 25px 20px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
      border-bottom: 1px solid #ebeef5;
    }

    :deep(.el-card__body) {
      padding: 30px;

      @media screen and (max-width: 768px) {
        padding: 15px 10px;
      }
    }

    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;

      h1 {
        margin: 0;
        padding: 0;
        font-size: 30px;
        font-weight: 600;
        color: #333;
        letter-spacing: 0.5px;
      }

      .header-meta {
        font-size: 15px;
        color: #666;
        margin-top: 8px;
        display: flex;
        gap: 20px;

        .version,
        .update-time {
          display: inline-flex;
          align-items: center;

          &::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #409eff;
            border-radius: 50%;
            margin-right: 8px;
          }
        }

        .update-time::before {
          background-color: #67c23a;
        }
      }
    }

    .policy-content {
      section {
        margin-bottom: 40px;
        animation: fadeIn 0.5s ease-in-out;

        h2 {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #ebeef5;
          color: #333;
          position: relative;

          &::after {
            content: "";
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 60px;
            height: 2px;
            background-color: #409eff;
          }
        }

        p {
          margin-bottom: 18px;
          line-height: 1.8;
          color: #444;
          text-align: justify;
          font-size: 15px;
        }

        ul {
          padding-left: 5px;

          li {
            margin-bottom: 10px;
            position: relative;
            padding-left: 20px;
            line-height: 1.6;
            font-size: 15px;

            &::before {
              content: "•";
              color: #409eff;
              position: absolute;
              left: 0;
              font-size: 18px;
            }
          }
        }

        .custom-collapse {
          :deep(.el-collapse-item__header) {
            font-size: 16px;
            font-weight: 500;
            padding: 15px;
            background-color: #f5f7fa;
            border-radius: 4px;
            margin-bottom: 2px;
            transition: all 0.3s;

            &.is-active {
              background-color: #ecf5ff;
              color: #409eff;
            }

            &:hover {
              background-color: #ecf5ff;
            }
          }

          :deep(.el-collapse-item__arrow) {
            margin-right: 8px;
            transition: transform 0.3s;
          }

          :deep(.el-collapse-item__wrap) {
            background-color: transparent;
            border: none;
          }

          :deep(.el-collapse-item__content) {
            padding: 5px 0;
          }
        }

        .right-content {
          padding: 20px;
          background-color: #fff;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
          border: 1px solid #ebeef5;

          ul {
            padding-left: 5px;

            li {
              margin-bottom: 20px;
              position: relative;
              padding-left: 20px;

              &::before {
                content: "•";
                color: #409eff;
                position: absolute;
                left: 0;
                font-size: 18px;
              }

              strong {
                color: #333;
                font-weight: 600;
                font-size: 16px;
                display: block;
                margin-bottom: 8px;
              }

              p {
                margin: 10px 0;
                color: #555;
                line-height: 1.6;
              }

              ul {
                margin-top: 10px;
                padding-left: 5px;

                li {
                  margin-bottom: 8px;
                  color: #555;
                  list-style-type: none;
                  position: relative;
                  padding-left: 18px;

                  &::before {
                    content: "◦";
                    color: #67c23a;
                    position: absolute;
                    left: 0;
                    font-size: 16px;
                  }
                }
              }
            }
          }
        }

        &.user-rights,
        &.terms-disputes,
        &.terms-other {
          .right-content {
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
          }
        }

        &.contact {
          .contact-info {
            margin-top: 20px;
            border-radius: 8px;
            overflow: hidden;

            :deep(.el-descriptions__header) {
              display: none;
            }

            :deep(.el-descriptions__body) {
              background-color: #fff;
            }

            :deep(.el-descriptions__label) {
              width: 120px;
              font-weight: 500;
              background-color: #f5f7fa;
            }

            :deep(.el-descriptions__content) {
              padding: 15px 20px;
            }

            :deep(.el-tag) {
              padding: 6px 10px;
              border-radius: 4px;
              font-size: 14px;
            }
          }
        }

        &.updates {
          .policy-timeline {
            margin-top: 30px;
            padding-left: 20px;

            :deep(.el-timeline-item__wrapper) {
              padding-left: 20px;
            }

            :deep(.el-timeline-item__timestamp) {
              font-size: 14px;
              color: #409eff;
              font-weight: 500;
            }

            :deep(.el-timeline-item__content) {
              font-size: 15px;
              color: #333;
              line-height: 1.6;
              padding: 10px 15px;
              background-color: #f9f9f9;
              border-radius: 6px;
              border-left: 3px solid #409eff;
            }

            :deep(.el-timeline-item__node--normal) {
              left: -2px;
              width: 14px;
              height: 14px;
            }

            :deep(.el-timeline-item__node--large) {
              left: -4px;
              width: 18px;
              height: 18px;
            }
          }
        }

        &.cookies {
          .custom-table {
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #ebeef5;
            box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);

            :deep(th) {
              background-color: #f5f7fa;
              color: #333;
              font-weight: 600;
              padding: 15px;
            }

            :deep(td) {
              padding: 15px;
              color: #444;
            }

            :deep(.el-table__row:hover) td {
              background-color: #ecf5ff;
            }
          }
        }
      }
    }
  }
}

// 响应式适配
@media screen and (max-width: 768px) {
  .privacy-policy {
    padding: 15px;

    .policy-card {
      .card-header {
        h1 {
          font-size: 22px;
        }

        .header-meta {
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }
      }

      .policy-content {
        section {
          h2 {
            font-size: 18px;
          }

          p,
          ul li {
            font-size: 14px;
          }

          .right-content {
            padding: 15px;

            ul li strong {
              font-size: 15px;
            }
          }
        }
      }
    }
  }
}

.cookies {
  .custom-table {
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
          padding: 10px 8px;
        }

        .cell {
          white-space: normal;
          word-break: break-all;
          font-size: 13px;
        }
      }
    }
  }
}

.contact {
  .contact-info {
    :deep(.el-descriptions) {
      @media screen and (max-width: 768px) {
        width: 100%;

        .el-descriptions__body {
          padding: 0;
        }

        .el-descriptions-item__label {
          width: 100px;
          min-width: 100px;
          padding: 12px 8px;
          font-size: 14px;
        }

        .el-descriptions-item__content {
          padding: 12px 8px;
        }

        .el-tag {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          padding: 3px 6px;
        }
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
