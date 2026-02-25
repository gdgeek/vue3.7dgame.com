// verse translations for zh-TW
export default {
  verse: {
    create: {
      defaultName: "新場景"
    },
    listPage: {
      myScenes: "我的場景",
      searchScenes: "搜尋場景...",
      sceneName: "場景名稱",
      author: "作者",
      modifiedDate: "修改日期",
      detailTitle: "場景詳情",
      enterEditor: "進入編輯器",
      viewDetail: "查看詳情",
      rename: "重新命名",
      delete: "刪除",
      deleteScene: "刪除場景",
      sceneIntro: "場景簡介",
      sceneIntroPlaceholder: "請輸入場景簡介（可選）",
      sceneTags: "場景標籤",
      noTags: "暫無標籤",
      addTag: "新增標籤...",
      visibility: "可見性",
      public: "公開",
      private: "私有",
      type: "類型",
      scene: "場景",
      createdTime: "建立時間",
      selectImageFile: "請選擇圖片文件",
      imageTooLarge: "圖片大小不能超過 5MB",
      importSuccess: "場景匯入成功",
      descriptionUpdated: "簡介已更新",
      descriptionUpdateFailed: "更新簡介失敗",
      tagAdded: "標籤已新增",
      tagAddFailed: "新增標籤失敗",
      tagRemoved: "標籤已移除",
      tagRemoveFailed: "移除標籤失敗",
      visibilityUpdateFailed: "更新可見性失敗",
      editorTitle: "場景【{name}】",
      copyPromptMessage: "請輸入新場景名稱",
      copyPromptTitle: "複製場景",
      copySuccess: "複製成功：",
      copySuffix: " - 副本",
      renameSuccess: "重新命名成功：",
      deleteConfirmMessage: "確定要刪除此場景嗎？",
      deleteConfirmTitle: "刪除場景",
      cancelInfo: "已取消",
      unnamed: "未命名"
    },
    publicPage: {
      examplesTitle: "場景示例",
      examplesSubtitle:
        "從我們精心設計的示例開始，快速啟動您的下一個 AR 專案。",
      searchExamples: "搜尋示例...",
      viewExample: "查看此示例",
      noDescription: "暫無簡介",
      allCategory: "全部",
      updatedTime: "修改時間"
    },
    page: {
      dialogTitle: "創建！【場景】",
      dialogSubmit: "創 建",
      title: "創建【場景】",
      form: {
        picture: "封面圖片",
        name: "名稱",
        description: "內容說明",
        course: "綁定教程",
        cancel: "取 消",
        dialogTitle: "選擇文件",
        dialogSubmit: "確定",
        rules: {
          message1: "請輸入活動名稱",
          message2: "長度在 3 到 64 個字符"
        },
        error: "表單驗證失敗"
      },
      list: {
        enter: "進入",
        infoTable: "內容說明：",
        infoContent: {
          author: "作者",
          learn: "學習",
          blank: "默認鏈接",
          description: "說明",
          share: "共享ID"
        },
        releaseConfirm: {
          message1: "確定發布該場景嗎？",
          message2: "提示",
          confirm: "確認",
          cancel: "取消",
          success: "發布成功",
          info: "已取消"
        },
        restrainConfirm: {
          message1: "確定下線該場景嗎？",
          message2: "提示",
          confirm: "確認",
          cancel: "取消",
          success: "下線成功",
          info: "已取消"
        },
        toolbar: {
          dialogTitle: "修改數據",
          dialogSubmit: "確定",
          confirm: {
            message1: "此操作將永久刪除該【場景】，是否繼續?",
            message2: "提示",
            confirm: "確認",
            cancel: "取消",
            success: "刪除成功！",
            info: "已取消刪除"
          },
          success: "修改成功!",
          changeError: "修改失敗！",
          qrcode: {
            cancel: "取 消",
            dialogTitle1: "請用設備掃描二維碼，進入",
            dialogTitle2: "請用設備掃描二維碼，進入場景。"
          }
        }
      }
    },
    view: {
      header: "修改信息",
      title: "【場景】名稱：",
      form: {
        label1: "多語言",
        label2: "名字",
        label3: "介紹",
        placeholder1: "請選擇語言",
        placeholder2: "請輸入名稱",
        placeholder3: "請輸入介紹",
        submit: "提交",
        delete: "刪除",
        rules: {
          message1: "請輸入語言",
          message2: "長度在 2 到 10 個字符",
          message3: "請輸入名稱",
          message4: "長度在 2 到 50 個字符",
          message5: "請輸入介紹"
        }
      },
      edit: "編輯【場景】",
      eye: "查看【場景】",
      info: "【場景】信息",
      verseOpen: "開放【場景】",
      verseClose: "關閉【場景】",
      success1: "修改成功",
      success2: "提交成功",
      success3: "刪除成功",
      success4: "分享成功",
      success5: "停止共享",
      error1: "提交失敗",
      error2: "表單驗證失敗",
      error3: "預製體 Schema 格式無效",
      messageTitle: "【場景】名稱：",
      scene: "場景",
      tags: {
        confirmRemove: {
          message: "確認刪除標籤?",
          title: "給場景刪除標籤",
          confirm: "確認",
          cancel: "取消",
          success: "刪除標籤成功",
          error: "取消刪除標籤"
        },
        confirmAdd: {
          message: "確認增加標籤?",
          title: "給場景增加標籤",
          confirm: "確認",
          cancel: "取消",
          success: "增加標籤成功",
          error: "取消增加標籤"
        }
      },
      share: {
        header1: "共享給其他用戶",
        header2: "修改共享信息",
        form: {
          label1: "用戶名",
          label2: "相關信息",
          label3: "編輯權限",
          placeholder: "請輸入用戶名",
          ruleMessage: "用戶名不能為空",
          label4: "可編輯",
          confirm: "確 認",
          cancel: "取 消"
        },
        title1: "【場景】共享",
        title2: "共享給好友",
        confirm: {
          message1: "是否確認關閉共享？",
          message2: "提示",
          confirm: "確認",
          cancel: "取消",
          success: "關閉成功！",
          info: "已取消關閉"
        }
      },
      message: {
        header: "修改內容",
        loading: "載入...",
        update: "修改內容",
        delete: "刪除帖子",
        like: "贊同",
        edit: "編輯於",
        message1: "已撤銷",
        message2: "已點贊",
        confirm: {
          message1: "是否確定刪除？",
          message2: "提示",
          confirm: "確認",
          cancel: "取消",
          success: "刪除成功！",
          info: "已取消刪除"
        }
      },
      reply: {
        timestamp: "現在就回復",
        title: "回復",
        publish: "發布於",
        confirm: {
          message1: "是否確定刪除？",
          message2: "提示",
          confirm: "確認",
          cancel: "取消",
          success: "刪除成功！",
          info: "已取消刪除"
        },
        success: "回復成功"
      },
      messageForm: {
        form: {
          label1: "標題",
          label2: "內容",
          rules: {
            title: {
              message1: "請輸入標題",
              message2: "長度在 3 到 100 個字符"
            }
          }
        },
        submit: "提交",
        reset: "重置",
        success: "發帖成功"
      },
      metaDialog: {
        title: "選擇實體",
        select: "選擇",
        create: "新 建",
        cancel: "取 消",
        input1: "請輸入Model名稱",
        input2: "請輸入實體名稱",
        prompt: {
          message: "提示",
          confirm: "確定",
          cancel: "取消",
          info: "取消輸入"
        }
      },
      prefabDialog: {
        title: "選擇預設數據",
        select: "選擇",
        cancel: "取消",
        input: "請輸入Model名稱",
        prompt: {
          message: "提示",
          confirm: "確定",
          cancel: "取消",
          info: "取消輸入"
        },
        knight: {
          title: "輸入數據",
          save: "保存",
          cancel: "取消",
          warn: "點擊了取消",
          typeTitle: "類型",
          nameTitle: "物品名稱"
        }
      },
      sceneEditor: {
        error1: "沒有場景編輯器",
        info3: "沒有保存權限",
        saveAndPublishConfirm: "保存成功，是否發布？",
        publishScene: "發布場景",
        confirm: "確認",
        cancel: "取消",
        publishSuccess: "發布成功",
        publishCanceled: "取消發布",
        noProjectToPublish: "沒有可發布的項目",
        noPublishPermission: "沒有發布權限",
        saveCompleted: "儲存完成",
        noChanges: "項目沒有改變",
        coverUploadError: "上傳封面圖片錯誤：未找到圖片數據",
        handlerError: "獲取文件處理器失敗",
        coverUploadSuccess: "封面圖片上傳成功",
        coverUploadFailed: "封面圖片上傳失敗"
      },
      script: {
        title: "腳本",
        save: "保存",
        error1: "沒有信息",
        error2: "沒有編輯權限",
        error3: "沒有腳本編輯器",
        success: "保存成功",
        info: "沒有修改",
        edit: "邏輯編輯",
        code: "代碼查看",
        leave: {
          message1: "發現有未保存的修改，是否保存",
          message2: "提示",
          confirm: "是",
          cancel: "否",
          success: "保存成功",
          error: "保存失敗",
          info: "已放棄對未保存的更改"
        }
      },
      public: {
        open: "公開",
        private: "私有",
        addSuccess: "已設為公開",
        removeSuccess: "已設為私有",
        error: "操作失敗"
      },
      image: {
        updateSuccess: "圖片更新成功",
        updateError: "圖片更新失敗"
      }
    }
  }
};
