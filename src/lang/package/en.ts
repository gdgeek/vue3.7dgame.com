export default {
  // 路由国际化
  route: {
    dashboard: "Dashboard",
    personalCenter: {
      title: "PersonalCenter",
      myHomepage: "MyHomepage",
      document: "Document",
      category: "Category",
      processOfCreation: "ProcessOfCreation",
    },
    settings: {
      title: "Settings",
      accountSetting: "AccountSetting",
      personalData: "PersonalData",
      userPresentation: "UserPresentation",
    },
    resourceManagement: {
      title: "ResourceManagement",
      voxelManagement: {
        title: "VoxelManagement",
        voxelList: "VoxelList",
        voxelUpload: "VoxelUpload",
        voxelProcessing: "VoxelProcessing",
      },
      polygenManagement: {
        title: "PolygenManagement",
        polygenList: "PolygenList",
        polygenUpload: "PolygenUpload",
        polygenProcessing: "PolygenProcessing",
      },
      pictureManagement: {
        title: "PictureManagement",
        pictureList: "PictureList",
        pictureUpload: "PictureUpload",
        pictureProcessing: "PictureProcessing",
      },
      videoManagement: {
        title: "VideoManagement",
        videoList: "VideoList",
        videoUpload: "VideoUpload",
        videoProcessing: "VideoProcessing",
      },
      audioManagement: {
        title: "AudioManagement",
        audioList: "AudioList",
        audioUpload: "AudioUpload",
        audioProcessing: "AudioProcessing",
      },
    },
    meta: {
      title: "Meta",
      metaList: "MetaList",
      systemDefault: "SystemDefault",
      edit: "Edit",
      scriptEditor: "ScriptEditor",
      sceneEditor: "SceneEditor",
    },
    universe: {
      title: "Universe",
      selfGenerated: "SelfGenerated",
      systemRecommendation: "SystemRecommendation",
      shareWithFriends: "ShareWithFriends",
      viewTitle: "【Universe】",
      scriptEditor: "ScriptEditor",
      sceneEditor: "SceneEditor",
    },
    manager: {
      title: "Management",
      userManagement: "UserManagement",
    },
  },
  // 登录页面国际化
  login: {
    username: "Username",
    password: "Password",
    login: "Login",
    captchaCode: "Verify Code",
    capsLock: "Caps Lock is On",
    message: {
      username: {
        required: "Please enter Username",
      },
      password: {
        required: "Please enter Password",
        min: "The password can not be less than 6 digits",
      },
      captchaCode: {
        required: "Please enter Verify Code",
      },
    },
  },
  // 主页国际化
  homepage: {
    dashboard: "Dashboard",
    news: "News",
    relatedDownload: "RelatedDownload",
    caseCourse: "CaseCourse",
    myCreation: {
      title: "MyCreation",
      myPolygen: "Polygen",
      myPicture: "Picture",
      myVideo: "Video",
      myUniverse: "Universe",
      myPublish: "Publish",
      myLike: "Like",
      enter: "Enter",
      Iliked: "I Liked",
    },
    edit: {
      title: "EditPersonalData",
      personalData: "PersonalData",
      personalDataStatement:
        "Modify the user nickname, profile picture, and basic information",
      return: "Back to personal center",
      userNickname: "UserNickname",
      userNicknameStatement:
        "Make you more accessible to the rest of the MrPP community.",
      nickname: "Nickname",
      confirm: "Confirm",
      avatar: "Avatar",
      avatarStatement: "Maximum size 2 MB. JPG, GIF, PNG.",
      basicInformation: "BasicInformation",
      basicInformationStatement:
        "Please fill in your basic information for a more fun personalized interaction and experience.",
      gender: "gender",
      man: "Man",
      woman: "Woman",
      industry: "Industry",
      industryStatement: "Please select your industry region",
      placeOfAbode: "PlaceOfResidence",
      individualResume: "PersonalProfile",
      individualResumeStatement: "A brief introduction of personal information",
      save: "Save",
      avatarCropping: {
        title: "AvatarCropping",
        leftRotation: "LeftRotation",
        rightRotation: "RightRotation",
        enlarge: "Enlarge",
        shrink: "Shrink",
        cancel: "Cancel",
        confirm: "Confirm",
        error1: "Avatar images can only be in JPG/PNG/BMP/GIF format!",
        error2: "Avatar image size cannot exceed 2MB!",
        error3: "Please select a valid file!",
        error4: "Error processing the file",
        success: "Avatar updated successfully",
      },
      rules: {
        nickname: {
          message1: "Please enter a user nickname",
          message2: "The nickname length should be greater than 2 characters",
          error1: "The nickname cannot be empty",
          error2:
            "The nickname only supports Chinese characters, letters, numbers, and underscores",
          error3: "Nickname update failed",
          error4: "Form validation failed",
          success: "Nickname updated successfully",
        },
        industry: {
          message: "Please select an industry",
          label1: "Technology, Information Technology",
          label2: "Economics, Finance",
          label3: "Education, Healthcare",
          label4: "Energy, Manufacturing",
          label5: "Agriculture, Forestry, Fishing, Animal Husbandry",
          label6: "Services industry",
          label7: "Other industries",
        },
        selectedOptions: {
          message: "Please select a place of residence",
        },
        textarea: {
          message1: "Please enter a personal profile",
          message2: "The personal profile should be more than 10 characters",
        },
        success: "Information updated successfully",
        error1: "Information update failed",
        error2: "Form validation failed",
      },
    },
  },
  // 体素管理国际化
  voxel: {
    uploadVoxel: "UploadVoxel",
    initializeVoxelData: "InitializeVoxelData",
    viewVoxel: "ViewVoxel",
  },
  // 导航栏国际化
  navbar: {
    dashboard: "Dashboard",
    logout: "Logout",
    AccountSetting: "Account Setting",
    personalCenter: "Personal Center",
    helpSupport: "Help & Support",
  },
  sizeSelect: {
    tooltip: "Layout Size",
    default: "Default",
    large: "Large",
    small: "Small",
    message: {
      success: "Switch Layout Size Successful!",
    },
  },
  langSelect: {
    message: {
      success: "Switch Language Successful!",
    },
  },
  settings: {
    project: "Project Settings",
    theme: "Theme",
    interface: "Interface",
    navigation: "Navigation",
    themeColor: "Theme Color",
    tagsView: "Tags View",
    fixedHeader: "Fixed Header",
    sidebarLogo: "Sidebar Logo",
    watermark: "Watermark",
  },
};
