export default {
  // 路由国际化
  route: {
    dashboard: "首页",
    personalCenter: {
      title: "个人中心",
      myHomepage: "我的主页",
      document: "正文",
      category: "分类",
      processOfCreation: "创作历程",
    },
    settings: {
      title: "设置",
      accountSetting: "账号设置",
      personalData: "个人资料",
      userPresentation: "用户展示",
    },
    resourceManagement: {
      title: "资源管理",
      voxelManagement: {
        title: "体素管理",
        voxelList: "体素列表",
        voxelUpload: "体素上传",
        voxelProcessing: "体素处理",
      },
      polygenManagement: {
        title: "模型管理",
        polygenList: "模型列表",
        polygenUpload: "模型上传",
        polygenProcessing: "模型处理",
      },
      pictureManagement: {
        title: "图片管理",
        pictureList: "图片列表",
        pictureUpload: "图片上传",
        pictureProcessing: "图片处理",
      },
      videoManagement: {
        title: "视频管理",
        videoList: "视频列表",
        videoUpload: "视频上传",
        videoProcessing: "视频处理",
      },
      audioManagement: {
        title: "音频管理",
        audioList: "音频列表",
        audioUpload: "音频上传",
        audioProcessing: "音频处理",
      },
    },
    meta: {
      title: "组件",
      metaList: "组件列表",
      systemDefault: "系统预设",
      edit: "编辑",
      scriptEditor: "脚本编辑",
      sceneEditor: "场景编辑",
    },
    ai: {
      title: "AI模型",
      list: "列表",
      generation: "AI生成",
    },
    project: {
      title: "工程",
      selfGenerated: "自己创造",
      systemRecommendation: "系统推荐",
      shareWithFriends: "朋友分享",
      viewTitle: "【工程】",
      scriptEditor: "脚本编辑",
      sceneEditor: "场景编辑",
    },
    manager: {
      title: "管理",
      userManagement: "用户管理",
    },
    game: {
      title: "游戏",
      gameIndex: "游戏配置",
      gameMap: "地图配置",
    },
    logout: {
      title: "退出",
    },
  },
  // 登录页面国际化
  login: {
    appleLoginFail: "苹果登录失败",
    title: "混合现实编程平台",
    register: "平台注册/登录",
    h1: "欢迎！",
    h4: "准备好出发了么？",
    loginTitle: "登录账号",
    username: "用户名",
    password: "密码",
    login: "登录平台",
    download: "下载相关程序",
    rules: {
      username: {
        message1: "请输入用户名",
        message2: "用户名称长度应大于4小于20",
        message3: "用户名仅支持字母、数字、下划线、@、.",
      },
      password: {
        message1: "请输入密码",
        message2: "密码长度应该大于6小于20",
        ///^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
        message3: "密码必须包含大小写字母、数字、特殊字符",
      },
      repassword: {
        message1: "请再次输入密码",
        message2: "两次输入的密码不一致",
      },
    },
    success: "登录成功",
    error: "表单检验未通过",
    createAccount: "创建账号",
    repassword: "确认密码",
    create: "创建",
    linkAccount: "登录账号!",
    logout: {
      message1: "确定注销并退出系统吗？",
      message2: "提示",
      confirm: "确定",
      cancel: "取消",
      title: "正在登出",
      text: "向服务器注销此次登录",
    },
  },
  // 主页国际化
  homepage: {
    dashboard: "首页",
    news: "新闻",
    relatedDownload: "相关下载",
    caseCourse: "案例教程",
    greeting: {
      morning: "早上好，",
      noon: "中午好，",
      afternoon: "下午好，",
      evening: "晚上好，",
    },
    myCreation: {
      title: "我的创作",
      myPolygen: "模型",
      myPicture: "图片",
      myVideo: "视频",
      myProject: "工程",
      myPublish: "发布",
      myLike: "点赞",
      enter: "进入",
      Iliked: "我点赞的",
    },
    edit: {
      title: "编辑个人资料",
      personalData: "个人资料",
      personalDataStatement: "用户昵称、头像、基本信息修改",
      return: "返回个人中心",
      userNickname: "用户昵称",
      userNicknameStatement: "让MrPP社区的其它用户更容易认识您。",
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
          message1: "请输入新密码",
          message2: "新密码长度应该大于6",
          error1: "请输入密码",
          error2: "新密码不能和旧密码一致！",
        },
        check: {
          message: "请输入校验密码",
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
    },
  },
  // 体素管理国际化
  voxel: {
    uploadVoxel: "上传体素",
    initializeVoxelData: "初始化体素数据",
    viewVoxel: "查看体素",
    prompt: {
      message1: "请输入新名称",
      message2: "修改体素名称",
      confirm: "确认",
      cancel: "取消",
      success: "新的体素名称: ",
      info: "取消输入",
    },
    confirm: {
      message1: "此操作将永久删除该文件, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    uploadFile: "选择体素（.vox文件），并上传",
    view: {
      title: "体素名称：",
      titleStatement: "用此体素创建【工程】",
      info: {
        title: "体素信息",
        label1: "条目",
        label2: "内容",
        item1: "体素名称",
        item2: "创建者",
        item3: "创建时间",
        item4: "文件大小",
        size: "字节",
        item5: "模型尺寸",
        item6: "模型中心点",
        item7: "体素数量",
        name: "改名",
        delete: "删除",
      },
      update: "等待更新",
      prompt: {
        message1: "用此体素创建【工程】",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        inputError: "请填写相应名称",
        success: "你创建了新的场景: ",
        error: "创建失败: ",
        info: "取消输入",
      },
      confirm: {
        message1: "此操作将永久删除该文件, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      namePrompt: {
        message1: "请输入新名称",
        message2: "修改体素名称",
        confirm: "确认",
        cancel: "取消",
        success: "新的体素名称: ",
        info: "取消输入",
      },
    },
  },
  // 模型管理国际化
  polygen: {
    uploadPolygen: "上传模型",
    initializePolygenData: "初始化模型数据",
    viewPolygen: "查看模型",
    prompt: {
      message1: "请输入新名称",
      message2: "修改模型名称",
      confirm: "确认",
      cancel: "取消",
      success: "新的模型名称: ",
      info: "取消输入",
    },
    confirm: {
      message1: "此操作将永久删除该文件, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    uploadFile: "选择模型（.glb文件），并上传",
    view: {
      title: "模型名称：",
      titleStatement: "用此模型创建【工程】",
      info: {
        title: "模型信息",
        label1: "条目",
        label2: "内容",
        item1: "模型名称",
        item2: "创建者",
        item3: "创建时间",
        item4: "文件大小",
        size: "字节",
        item5: "模型尺寸",
        item6: "模型中心",
        name: "改名",
        delete: "删除",
      },
      prompt: {
        message1: "用此模型创建【工程】",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        inputError: "请填写相应名称",
        success: "你创建了新的场景: ",
        error: "创建失败: ",
        info: "取消输入",
      },
      confirm: {
        message1: "此操作将永久删除该文件, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      namePrompt: {
        message1: "请输入新名称",
        message2: "修改模型名称",
        confirm: "确认",
        cancel: "取消",
        success: "新的模型名称: ",
        info: "取消输入",
      },
    },
  },
  // 图片管理国际化
  picture: {
    uploadPicture: "上传图片",
    initializePictureData: "初始化图片数据",
    viewPicture: "查看图片",
    prompt: {
      message1: "请输入新名称",
      message2: "修改图片名称",
      confirm: "确认",
      cancel: "取消",
      success: "新的图片名称: ",
      info: "取消输入",
    },
    confirm: {
      message1: "此操作将永久删除该文件, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    uploadFile: "选择图片并上传",
    view: {
      title: "图片名称：",
      loadingText: "正在预处理",
      info: {
        title: "图片信息",
        label1: "条目",
        label2: "内容",
        item1: "图片名称",
        item2: "创建者",
        item3: "创建时间",
        item4: "文件大小",
        size: "字节",
        item5: "图片尺寸",
        name: "改名",
        delete: "删除",
      },
      confirm: {
        message1: "此操作将永久删除该文件, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      namePrompt: {
        message1: "请输入新名称",
        message2: "修改图片名称",
        confirm: "确认",
        cancel: "取消",
        success: "新的图片名称: ",
        info: "取消输入",
      },
    },
  },
  // 视频管理国际化
  video: {
    uploadVideo: "上传视频",
    initializeVideoData: "初始化视频数据",
    viewVideo: "查看视频",
    prompt: {
      message1: "请输入新名称",
      message2: "修改视频名称",
      confirm: "确认",
      cancel: "取消",
      success: "新的视频名称: ",
      info: "取消输入",
    },
    confirm: {
      message1: "此操作将永久删除该文件, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    uploadFile: "选择视频，并上传",
    view: {
      title: "视频名称：",
      info: {
        title: "视频信息",
        label1: "条目",
        label2: "内容",
        item1: "视频名称",
        item2: "创建者",
        item3: "创建时间",
        item4: "文件大小",
        size: "字节",
        item5: "视频尺寸",
        name: "改名",
        delete: "删除",
      },
      confirm: {
        message1: "此操作将永久删除该文件, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      namePrompt: {
        message1: "请输入新名称",
        message2: "修改视频名称",
        confirm: "确认",
        cancel: "取消",
        success: "新的视频名称: ",
        info: "取消输入",
      },
    },
  },
  // 音频管理国际化
  audio: {
    uploadAudio: "上传音频",
    initializeAudioData: "初始化音频数据",
    viewAudio: "查看音频",
    prompt: {
      message1: "请输入新名称",
      message2: "修改音频名称",
      confirm: "确认",
      cancel: "取消",
      success: "新的音频名称: ",
      info: "取消输入",
    },
    confirm: {
      message1: "此操作将永久删除该文件, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    uploadFile: "选择音频，并上传",
    view: {
      title: "音频名称：",
      info: {
        title: "音频信息",
        label1: "条目",
        label2: "内容",
        item1: "音频名称",
        item2: "创建者",
        item3: "创建时间",
        item4: "文件大小",
        size: "字节",
        name: "改名",
        delete: "删除",
      },
      confirm: {
        message1: "此操作将永久删除该文件, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      namePrompt: {
        message1: "请输入新名称",
        message2: "修改音频名称",
        confirm: "确认",
        cancel: "取消",
        success: "新的音频名称: ",
        info: "取消输入",
      },
    },
  },
  // 文件上传国际化
  upload: {
    title: "选择文件",
    declared: "请选择对应格式的文件进行上传操作",
    item1: {
      title: "预先处理",
      failed: "md5计算失败",
      declared: "通过计算得到文件的 md5 编码",
    },
    item2: {
      title: "上传文件",
      failed: "文件上传失败",
      declared: "文件正在发送至服务器",
    },
    item3: {
      title: "保存信息",
      failed: "数据库储存失败",
      declared: "文件数据存储在数据库中",
    },
  },
  // 组件国际化
  meta: {
    title: "创建【组件】",
    edit: "编辑",
    delete: "删除",
    confirm: {
      message1: "此操作将永久删除该【组件】, 是否继续?",
      message2: "提示",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "已取消删除",
    },
    prompt: {
      message1: "请输入组件名称",
      message2: "提示(3-20个字符)",
      confirm: "确认",
      cancel: "取消",
      inputValidator: {
        item1: "组件名称不能为空",
        item2: "组件名称不能小于3个字符",
        item3: "组件名称不能大于20个字符",
      },
      success: "组件名称是: ",
      info: "取消输入",
    },
    metaEdit: {
      title: "【组件】名称：",
      form: {
        title: "名称",
        picture: "图片",
        input: "输入事件",
        output: "输出事件",
        data: "数据",
        info: "信息",
      },
      eventEdit: "事件编辑",
      contentEdit: "内容编辑",
      save: "信息保存",
      metaInfo: "【组件】信息",
      rules: {
        message1: "请输入名称",
        message2: "长度在 2 到 20 个字符",
      },
      success: "保存成功",
    },
    scene: {
      error: "没有编辑器",
      info: "没有保存权限！",
      success: "场景保存成功~",
    },
    script: {
      title: "脚本",
      save: "保存",
      error1: "没有组件信息",
      error2: "没有编辑权限",
      error3: "没有编辑器",
      success: "保存成功",
      info: "没有修改",
    },
    eventDialog: {
      title: "事件管理窗口",
      output: "输出事件",
      input: "输入事件",
      cancel: "取 消",
      confirm: "确 定",
    },
    ResourceDialog: {
      label1: "绑定资源",
      label2: "我的资源",
      title: "选择资源",
      cancelSelect: "取消选择",
      select: "选择",
      doUnbind: "取消绑定",
      bind: "绑定",
      empty: "清 空",
      cancel: "取 消",
      confirm1: {
        message1: "是否解除资源绑定?",
        message2: "解除绑定",
        confirm: "确认",
        cancel: "取消",
        success: "解绑成功！",
        info: "已取消",
      },
      confirm2: {
        message1: "是否将资源绑定到场景?",
        message2: "绑定资源",
        confirm: "确认",
        cancel: "取消",
        success: "绑定成功！",
        confirm2: {
          message1: "是否直接确认设置资源?",
          message2: "确认资源",
          confirm: "确认",
          cancel: "取消",
          success: "设置成功！",
        },
      },
      info: "已取消",
    },
  },
  // AI部分国际化
  ai: {
    create: "创建",
    show: "查看",
    delete: "删除",
    generate: "生成",
    confirm: {
      message1: "此操作将永久删除该文件。您想继续吗？",
      message2: "警告",
      confirm: "确认",
      cancel: "取消",
      success: "删除成功！",
      info: "删除已取消",
    },
    generation: {
      title: "通过 AI (Rodin) 创建模型：",
      form: {
        image: "图像",
        select: "选择",
        prompt: "提示",
        quality: {
          title: "质量",
          value1: "高",
          value2: "中",
          value3: "低",
          value4: "极低",
        },
        message: "长度应为 4 到 50 个字符",
        error: "请输入提示或选择图像",
        submit: "生成",
      },
    },
  },
  // 工程部分国际化
  verse: {
    page: {
      dialogTitle: "创建！【工程】",
      dialogSubmit: "创 建",
      title: "创建【工程】",
      form: {
        picture: "封面图片",
        name: "名称",
        description: "内容说明",
        course: "绑定教程",
        cancel: "取 消",
        dialogTitle: "选择文件",
        dialogSubmit: "确定",
        rules: {
          message1: "请输入活动名称",
          message2: "长度在 3 到 64 个字符",
        },
        error: "表单验证失败",
      },
      list: {
        enter: "进入",
        infoTable: "内容说明：",
        infoContent: {
          author: "作者",
          learn: "学习",
          blank: "默认链接",
          description: "说明",
          share: "共享ID",
        },
        releaseConfirm: {
          message1: "确定发布该工程吗？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "发布成功",
          info: "已取消",
        },
        restrainConfirm: {
          message1: "确定下线该工程吗？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "下线成功",
          info: "已取消",
        },
        toolbar: {
          dialogTitle: "修改数据",
          dialogSubmit: "确定",
          confirm: {
            message1: "此操作将永久删除该【工程】，是否继续?",
            message2: "提示",
            confirm: "确认",
            cancel: "取消",
            success: "删除成功！",
            info: "已取消删除",
          },
          success: "修改成功!",
          changeError: "修改失败！",
          qrcode: {
            cancel: "取 消",
            dialogTitle1: "请用设备扫描二维码，进入",
            dialogTitle2: "请用设备扫描二维码，进入场景。",
          },
        },
      },
    },
    view: {
      header: "修改信息",
      title: "【工程】名称：",
      form: {
        label1: "多语言",
        label2: "名字",
        label3: "介绍",
        placeholder1: "请选择语言",
        placeholder2: "请输入名称",
        placeholder3: "请输入介绍",
        submit: "提交",
        delete: "删除",
        rules: {
          message1: "请输入语言",
          message2: "请输入名称",
          message3: "长度在 2 到 50 个字符",
          message4: "请输入介绍",
        },
      },
      edit: "编辑【工程】",
      eye: "查看【工程】",
      info: "【工程】信息",
      verseOpen: "开放【工程】",
      verseClose: "关闭【工程】",
      success1: "修改成功",
      success2: "提交成功",
      success3: "删除成功",
      success4: "分享成功",
      success5: "停止共享",
      error1: "提交失败",
      error2: "表单验证失败",
      messageTitle: "【工程】名称：",
      scene: "场景",
      share: {
        header1: "共享给其他用户",
        header2: "修改共享信息",
        form: {
          label1: "用户名",
          label2: "相关信息",
          label3: "编辑权限",
          placeholder: "请输入用户名",
          ruleMessage: "用户名不能为空",
          label4: "可编辑",
          confirm: "确 认",
          cancel: "取 消",
        },
        title1: "【工程】共享",
        title2: "共享给好友",
        confirm: {
          message1: "是否确认关闭共享？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "关闭成功！",
          info: "已取消关闭",
        },
      },
      message: {
        header: "修改内容",
        loading: "载入...",
        update: "修改内容",
        delete: "删除帖子",
        like: "赞同",
        edit: "编辑于",
        message1: "已撤销",
        message2: "已点赞",
        confirm: {
          message1: "是否确定删除？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "删除成功！",
          info: "已取消删除",
        },
      },
      reply: {
        timestamp: "现在就回复",
        title: "回复",
        publish: "发布于",
        rules: {
          message1: "请填写内容",
          message2: "长度至少10个字符",
        },
        confirm: {
          message1: "是否确定删除？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "删除成功！",
          info: "已取消删除",
        },
        success: "回复成功",
      },
      messageForm: {
        form: {
          label1: "标题",
          label2: "内容",
          rules: {
            title: {
              message1: "请输入标题",
              message2: "长度在 3 到 100 个字符",
            },
            body: {
              message1: "请输入内容",
              message2: "长度至少10个字符",
            },
          },
        },
        submit: "提交",
        reset: "重置",
        success: "发帖成功",
      },
      metaDialog: {
        title: "选择组件",
        select: "选择",
        create: "新 建",
        cancel: "取 消",
        input1: "请输入Model名称",
        input2: "请输入组件名称",
        prompt: {
          message: "提示",
          confirm: "确定",
          cancel: "取消",
          info: "取消输入",
        },
      },
      prefabDialog: {
        title: "选择预设数据",
        select: "选择",
        cancel: "取消",
        input: "请输入Model名称",
        prompt: {
          message: "提示",
          confirm: "确定",
          cancel: "取消",
          info: "取消输入",
        },
        knight: {
          title: "输入数据",
          save: "保存",
          cancel: "取消",
          warn: "点击了取消",
          typeTitle: "类型",
          nameTitle: "物品名称",
        },
      },
      sceneEditor: {
        error1: "没有编辑器",
        info1: "添加预设",
        info2: "添加模块",
        info3: "没有保存权限",
        success: "场景保存成功",
      },
      script: {
        title: "脚本",
        save: "保存脚本",
        error1: "没有信息",
        error2: "没有编辑权限",
        error3: "没有编辑器",
        success: "保存成功",
        info: "没有修改",
        edit: "逻辑编辑",
        code: "代码查看",
      },
    },
  },
  // 管理部分国际化
  manager: {
    title: "添加用户",
    creator: {
      form: {
        label1: "用户名",
        label2: "密码",
        label3: "确认密码",
        message1: "请输入用户名称",
        message2: "用户名称长度应该大于5",
        message3: "用户名请避免使用中文",
        message4: "请输入密码",
        message5: "密码长度应该大于6",
        message6: "请输入校验密码",
        error1: "请输入密码",
        error2: "请再次输入密码",
        error3: "两次输入的密码不一致",
        error4: "表单校验失败",
        cancel: "取 消",
        submit: "注册账号",
      },
    },
    list: {
      label: "权限:",
      cancel: "删除",
      roles: {
        root: "根用户",
        admin: "超级管理员",
        manager: "管理员",
        user: "用户",
      },
      confirm: {
        message1: "此操作将永久删除该用户, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功！",
        info: "已取消删除",
      },
      success: "权限更新成功！",
      error: "权限更新失败！",
    },
  },
  // 游戏部分国际化
  game: {
    index: {
      title: "创建【关卡】",
      delete: "删除",
      form: {
        label1: "顺序",
        label2: "工程id",
        label3: "工程名",
        label4: "操作",
        placeholder: "请输入排序",
        confirm: {
          message1: "修改排序？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "删除成功",
          info: "已取消修改",
        },
      },
      success: "添加成功",
      confirm: {
        message1: "此操作将永久删除该【关卡】, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功",
        info: "已取消删除",
      },
    },
    map: {
      title1: "第",
      title2: " 地图",
      addGuide: "增加关卡",
      addMap: "增加地图",
      removeMap: "减少地图",
      delete: "删除",
      form: {
        label1: "顺序",
        label2: "工程id",
        label3: "工程名",
        label4: "操作",
        placeholder: "请输入排序",
        confirm: {
          message1: "修改排序？",
          message2: "提示",
          confirm: "确认",
          cancel: "取消",
          success: "删除成功",
          info: "已取消修改",
        },
      },
      success: "添加成功",
      confirm1: {
        message1: "创建地图",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "创建成功",
        info: "已取消创建",
      },
      confirm2: {
        message1: "删除地图",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功",
        info: "已取消删除",
      },
      confirm3: {
        message1: "此操作将永久删除该【关卡】, 是否继续?",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        success: "删除成功",
        info: "已取消删除",
      },
    },
    verseDialog: {
      title: "选择【工程】",
      select: "选择",
      create: "新 建",
      cancel: "取 消",
      prompt: {
        message1: "请输入组件名称",
        message2: "提示",
        confirm: "确认",
        cancel: "取消",
        info: "取消输入",
      },
    },
  },
  // MrppHeader国际化
  MrppHeader: {
    sortByName: "名称排序",
    sortByTime: "时间排序",
    search: "搜索名称",
  },
  // tags国际化
  tags: {
    refresh: "刷新",
    close: "关闭",
    closeOthers: "关闭其他",
    closeLeft: "关闭左侧",
    closeRight: "关闭右侧",
    closeAll: "关闭全部",
  },

  // 导航栏国际化
  navbar: {
    dashboard: "首页",
    logout: "注销登出",
    AccountSetting: "账号设置",
    personalCenter: "个人中心",
    helpSupport: "帮助支持",
  },
  sizeSelect: {
    tooltip: "布局大小",
    default: "默认",
    large: "大型",
    small: "小型",
    message: {
      success: "切换布局大小成功！",
    },
  },
  // 复制
  copy: {
    title: "复制",
    success: "代码已复制到剪贴板",
    error: "复制失败",
  },
  langSelect: {
    message: {
      success: "切换语言成功！",
    },
  },
  settings: {
    project: "项目配置",
    theme: "主题设置",
    interface: "界面设置",
    navigation: "导航设置",
    themeColor: "主题颜色",
    tagsView: "开启 Tags-View",
    fixedHeader: "固定 Header",
    sidebarLogo: "侧边栏 Logo",
    watermark: "开启水印",
  },
  layoutSelect: {
    left: "左侧模式",
    top: "顶部模式",
    mix: "混合模式",
  },
};
