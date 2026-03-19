// 主页国际化
export default {
  homepage: {
    greeting: {
      morning: "早上好，",
      noon: "中午好，",
      afternoon: "下午好，",
      evening: "晚上好，",
    },
    header: {
      subtitle: "探索 AR 的无限可能，开启您的创意之旅。",
    },
    announcements: {
      title: "平台整体介绍",
    },
    overview: {
      nav: {
        home: "主页",
        resources: "素材库",
        entities: "实体",
        scenes: "场景",
        management: "管理中心",
      },
      hero: {
        eyebrow: "XR UGC PLATFORM",
        title: "一站式 XR 内容创作与发布平台",
        description:
          "平台围绕“资源管理、实体封装、场景搭建、交互逻辑、作品发布”构建完整创作链路，帮助团队在同一套系统中完成内容生产、编辑调试和最终交付。",
        actions: {
          resources: "查看素材库",
          entities: "查看实体",
          scenes: "查看场景",
        },
        preview: {
          main: {
            label: "主平台",
            title: "资源与项目管理",
          },
          build: {
            label: "内容搭建模块",
            title: "空间与展示编排",
          },
          interaction: {
            label: "交互配置模块",
            title: "逻辑与行为设置",
          },
          footer: "资源、场景、交互逻辑与发布统一衔接",
        },
      },
      sections: {
        structure: {
          kicker: "平台结构",
          title: "平台由 3 个核心部分组成",
        },
        capabilities: {
          kicker: "核心能力",
          title: "从素材到作品交付的完整链路",
        },
        workflow: {
          kicker: "工作方式",
          title: "平台中的内容如何流转",
        },
        value: {
          kicker: "产品价值",
          title: "这套平台适合哪些业务场景",
        },
        collaboration: {
          kicker: "模块协同",
          title: "平台各部分如何协同工作",
        },
      },
      structure: {
        platform: {
          title: "主平台",
          desc: "负责账号、资源、实体、场景和发布流程的统一管理，是整个平台的业务入口。",
          tag: "统一管理中心",
        },
        builder: {
          title: "内容搭建模块",
          desc: "负责三维空间内容搭建、对象摆放和展示结构编排，承接平台中的内容组装工作。",
          tag: "展示编排能力",
        },
        interaction: {
          title: "交互配置模块",
          desc: "负责可视化逻辑配置和行为编排，为内容补充交互体验与流程控制。",
          tag: "互动能力配置",
        },
      },
      capabilities: {
        resource: {
          title: "资源管理",
          desc: "统一管理模型、图片、视频、音频、粒子等内容素材。",
        },
        entity: {
          title: "实体封装",
          desc: "把素材整理为可复用内容单元，方便在多个场景中重复使用。",
        },
        building: {
          title: "内容搭建",
          desc: "通过内容搭建模块完成空间布局、对象摆放与展示编排。",
        },
        interaction: {
          title: "交互逻辑",
          desc: "通过可视化方式配置点击、动画、流程与对象联动等互动效果。",
        },
        delivery: {
          title: "发布交付",
          desc: "统一进行保存、发布与展示管理，形成面向终端的作品输出。",
        },
      },
      workflow: {
        step1: {
          title: "上传资源",
          desc: "将模型或多媒体内容导入平台资源库。",
        },
        step2: {
          title: "创建实体",
          desc: "将资源组织为可复用的内容单元，沉淀统一能力。",
        },
        step3: {
          title: "编辑场景",
          desc: "把实体加入场景，并完成空间布局和展示编排。",
        },
        step4: {
          title: "配置逻辑",
          desc: "为实体或场景增加互动行为与流程控制。",
        },
        step5: {
          title: "保存发布",
          desc: "确认内容状态后输出可展示、可分享的最终作品。",
        },
      },
      value: {
        scenariosTitle: "适用场景",
        advantagesTitle: "平台优势",
        scenarios: {
          education: {
            title: "教育培训",
            desc: "适合创客教育、XR 教学内容搭建和互动式课程展示。",
          },
          branding: {
            title: "品牌展示",
            desc: "适合产品展示、活动传播、品牌空间和营销互动内容制作。",
          },
          exhibition: {
            title: "数字展陈",
            desc: "适合数字展馆、文旅展示、展厅导览和沉浸式内容表达。",
          },
          delivery: {
            title: "项目交付",
            desc: "适合团队协同完成 XR 内容项目，并统一管理资源与发布结果。",
          },
        },
        advantages: {
          item1:
            "主平台、内容搭建模块、交互配置模块协同工作，减少工具切换成本。",
          item2: "支持从素材管理到作品发布的完整闭环，便于内容团队统一协作。",
          item3: "通过实体复用机制，提高项目复用率和后续维护效率。",
          item4: "可视化逻辑配置降低交互设置门槛，适合非纯技术团队使用。",
          item5: "平台结构清晰，适合对外介绍、客户演示和后续项目扩展。",
        },
      },
      collaboration: {
        build: {
          title: "内容搭建模块",
          desc: "主平台负责项目和数据管理，内容搭建模块负责空间布局、对象摆放和展示结构整理。",
        },
        interaction: {
          title: "交互配置模块",
          desc: "交互配置模块用于设置点击、动画、流程与对象联动等行为，帮助内容从静态展示升级为可互动体验。",
        },
      },
    },
    myCreation: {
      title: "我的创作",
      myPolygen: "模型",
      myPicture: "图片",
      myVideo: "视频",
      myProject: "场景",
      myPublish: "发布",
      myLike: "点赞",
      enter: "进入",
    },
    quickStart: {
      title: "快速开始",
      upload: {
        title: "上传素材",
        desc: "导入 3D 模型或多媒体文件到您的个人库中。",
        action: "立即上传",
      },
      edit: {
        title: "编辑实体",
        desc: "管理交互式组件和行为脚本，赋予 AR 资产生命力。",
        action: "立即编辑",
      },
      create: {
        title: "创建场景",
        desc: "从零开始构建一个全新的沉浸式 AR 互动体验。",
        action: "立即创建",
      },
    },
    concepts: {
      title: "创作流程",
      subtitle:
        "先理解关系再开始编辑：资源是素材，实体是可复用能力单元，场景负责组织实体并形成体验。",
      flow: {
        step1: "第一步",
        step2: "第二步",
        step3: "第三步",
        step4: "第四步",
        resource: "资源上传",
        entity: "实体编辑",
        scene: "场景编辑",
        publish: "场景发布",
      },
      rule: "场景只能添加实体，不能直接添加资源。",
      entityEditor: {
        badge: "你正在编辑：实体",
        title: "实体编辑器作用范围",
        desc: "编辑实体结构、资源组合和实体脚本。这里定义的是实体本身能力，复用到多个场景时保持一致。",
      },
      sceneEditor: {
        badge: "你正在编辑：场景",
        title: "场景编辑器作用范围",
        desc: "编辑场景编排、实体摆放与场景脚本。这里定义的是场景级行为，只对当前场景生效。",
      },
    },
    edit: {
      personalData: "个人资料",
      personalDataStatement: "用户昵称、头像、基本信息修改",
      return: "返回个人中心",
      userNickname: "用户昵称",
      userNicknameStatement: "让社区的其它用户更容易认识您。",
      nickname: "昵称",
      confirm: "确认",
      avatar: "头像",
      avatarStatement: "最大尺寸 2 MB。JPG、GIF、PNG。",
      basicInformation: "基本信息",
      basicInformationStatement:
        "请填写你的基本信息，以获得更有乐趣的个性化交互和体验。",
      gender: "性别",
      man: "男",
      woman: "女",
      industry: "行业",
      industryStatement: "请选择您的行业区域",
      placeOfAbode: "居住地",
      individualResume: "个人简介",
      individualResumeStatement: "个人信息的简要介绍",
      save: "保存",
      // 邮箱验证
      emailVerification: "邮箱验证",
      emailVerificationStatement: "验证您的邮箱地址以确保账户安全",
      email: "邮箱地址",
      emailPlaceholder: "请输入邮箱地址",
      verificationCode: "验证码",
      codePlaceholder: "请输入6位验证码",
      sendCode: "发送验证码",
      retryAfterSeconds: "{seconds}秒后重试",
      sendOldEmailCode: "发送旧邮箱验证码",
      currentEmail: "当前邮箱",
      verificationStatus: "验证状态",
      verified: "已验证",
      unverified: "未验证",
      changeEmailOrBind: "改绑邮箱",
      bindNewEmail: "绑定新邮箱",
      directUnbind: "直接解绑",
      unbindEmailBtn: "解绑邮箱",
      nextStep: "下一步",
      changeAuthLeft: "改绑授权剩余 {seconds} 秒",
      verifyOldEmailFirst: "请先验证旧邮箱，获取改绑授权。",
      oldEmailCode: "旧邮箱验证码",
      enterSixDigitCode: "请输入6位验证码",
      confirmChangeEmail: "确认改绑",
      verifyBeforeUnbind: "解绑前需要验证旧邮箱。",
      confirmUnbind: "确认解绑",
      unbindDirectNoVerify: "当前邮箱未验证，可直接解绑，无需验证码。",
      confirmDirectUnbind: "确认直接解绑",
      bindDirectNoVerify:
        "当前邮箱未验证，可直接绑定新邮箱，无需旧邮箱二次确认。",
      verifyEmail: "验证邮箱",
      accountLocked: "账户已被锁定，请 {time} 秒后再试",
      avatarCropping: {
        title: "头像裁剪",
        leftRotation: "左旋转",
        rightRotation: "右旋转",
        enlarge: "放大",
        shrink: "缩小",
        cancel: "取消",
        confirm: "确认",
        error1: "上传头像图片只能是 JPG/PNG/BMP/GIF 格式!",
        error2: "上传头像图片大小不能超过 2MB!",
        error3: "请选择有效的文件！",
        error4: "处理文件时出错",
        success: "修改头像成功",
      },
      rules: {
        nickname: {
          message1: "请输入用户昵称",
          message2: "昵称长度应该大于2个字符",
          error1: "昵称不能为空",
          error2: "昵称仅支持中文、字母、数字、下划线",
          error3: "昵称更新失败",
          error4: "表单校验未通过",
          success: "昵称更新成功",
        },
        industry: {
          message: "请选择行业",
          label1: "科技、信息技术",
          label2: "经济、金融",
          label3: "教育、医疗",
          label4: "能源、制造业",
          label5: "农、林、渔、牧",
          label6: "服务业",
          label7: "其他行业",
        },
        selectedOptions: {
          message: "请选择居住地",
        },
        textarea: {
          message1: "请输入个人简介",
          message2: "个人简介应多于10个字符",
        },
        success: "信息更新成功",
        error1: "信息更新失败",
        error2: "表单校验未通过",
        email: {
          required: "请输入邮箱地址",
          invalid: "邮箱格式不正确",
        },
        code: {
          required: "请输入验证码",
          invalid: "验证码必须是6位数字",
        },
      },
    },
    account: {
      title: "账号设置",
      titleStatement: "账号具体内容的配置和修改",
      label1: "邮箱",
      rules1: {
        message1: "请输入邮箱",
        message2: "请输入正确的邮箱地址",
      },
      placeholder: "绑定邮箱",
      bind: "绑定",
      rebind: "重新绑定",
      label2: "账号密码",
      securityEmailTitle: "邮箱安全",
      securityEmailBoundHint: "当前邮箱已绑定，可改绑或解绑。",
      securityEmailUnboundHint: "当前未绑定邮箱，请先完成绑定。",
      securityPasswordTitle: "密码安全",
      securityPasswordHint: "修改或找回密码，提升账号安全性。",
      change: "修改密码",
      recover: "找回密码",
      label3: "旧的密码",
      label4: "新的密码",
      label5: "确认密码",
      confirm: "确认修改",
      rules2: {
        old: {
          message1: "请输入旧密码",
          message2: "旧密码长度应该大于6",
          error1: "旧密码不能为空",
          error2: "新密码不能和旧密码一致！",
        },
        new: {
          error2: "新密码不能和旧密码一致！",
        },
        check: {
          message1: "请输入校验密码",
          error1: "请再次输入密码",
          error2: "两次输入密码不一致",
        },
      },
      validate1: {
        success: "密码修改成功",
        error1: "密码修改失败",
        error2: "表单校验未通过",
      },
      validate2: {
        success: "绑定成功",
        error1: "绑定失败",
        error2: "表单校验未通过",
      },
      emailNotVerifiedWarning: "邮箱未验证，请先完成邮箱验证后再修改密码",
      noEmailBound: "当前账号未绑定邮箱，请先前往邮箱验证页面绑定邮箱",
      emailBoundNotFound: "未获取到绑定邮箱，请刷新后重试",
      changeEmailAction: "改绑邮箱",
      unbindEmailAction: "解绑邮箱",
      bindEmailAction: "绑定邮箱",
    },
  },
};
