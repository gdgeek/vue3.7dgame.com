// homepage translations for ja-JP
export default {
  homepage: {
    greeting: {
      morning: "おはようございます、",
      noon: "こんにちは、",
      afternoon: "午後の挨拶、",
      evening: "こんばんは、",
    },
    header: {
      subtitle: "ARの無限の可能性を探求し、創造の旅を始めましょう。",
    },
    announcements: {
      title: "お知らせ",
    },
    myCreation: {
      title: "私の作品",
      myPolygen: "モデル",
      myPicture: "画像",
      myVideo: "ビデオ",
      myProject: "场景",
      myPublish: "公開",
      myLike: "いいね",
      enter: "入る",
    },
    quickStart: {
      title: "クイックスタート",
      upload: {
        title: "素材をアップロード",
        desc: "3Dモデルやマルチメディアファイルを個人ライブラリに取り込みます。",
        action: "今すぐアップロード",
      },
      edit: {
        title: "エンティティ編集",
        desc: "インタラクティブなコンポーネントと挙動スクリプトを管理します。",
        action: "今すぐ編集",
      },
      create: {
        title: "シーン作成",
        desc: "没入感のある新しいARインタラクティブ体験をゼロから構築します。",
        action: "今すぐ作成",
      },
    },
    edit: {
      personalData: "個人データ",
      personalDataStatement: "ユーザー名、アバター、基本情報の変更",
      return: "個人センターに戻る",
      userNickname: "ユーザー名",
      userNicknameStatement:
        "MrPPコミュニティの他のユーザーがあなたを認識しやすくします。",
      nickname: "ニックネーム",
      confirm: "確認",
      avatar: "アバター",
      avatarStatement: "最大サイズ 2 MB。JPG、GIF、PNG。",
      basicInformation: "基本情報",
      basicInformationStatement:
        "基本情報を入力して、より楽しいパーソナライズされた体験を得てください。",
      gender: "性別",
      man: "男性",
      woman: "女性",
      industry: "業界",
      industryStatement: "業界を選択してください",
      placeOfAbode: "居住地",
      individualResume: "個人の履歴書",
      individualResumeStatement: "個人情報の簡単な紹介",
      save: "保存",
      // メール認証
      emailVerification: "メール認証",
      emailVerificationStatement:
        "アカウントのセキュリティを確保するためにメールアドレスを確認してください",
      email: "メールアドレス",
      emailPlaceholder: "メールアドレスを入力してください",
      verificationCode: "認証コード",
      codePlaceholder: "6桁のコードを入力してください",
      sendCode: "コードを送信",
      verifyEmail: "メールを確認",
      accountLocked:
        "アカウントがロックされています。{time}秒後に再試行してください",
      avatarCropping: {
        title: "アバターのトリミング",
        leftRotation: "左回転",
        rightRotation: "右回転",
        enlarge: "拡大",
        shrink: "縮小",
        cancel: "キャンセル",
        confirm: "確認",
        error1:
          "アップロードされたアバター画像はJPG/PNG/BMP/GIF形式である必要があります！",
        error2:
          "アップロードされたアバター画像のサイズは2MBを超えてはなりません！",
        error3: "有効なファイルを選択してください！",
        error4: "ファイル処理中にエラーが発生しました",
        success: "アバターの変更に成功しました",
      },
      rules: {
        nickname: {
          message1: "ユーザー名を入力してください",
          message2: "ニックネームは2文字以上にしてください",
          error1: "ニックネームを空にすることはできません",
          error2:
            "ニックネームは中国語、アルファベット、数字、アンダースコアのみをサポートしています",
          error3: "ニックネームの更新に失敗しました",
          error4: "フォーム検証に失敗しました",
          success: "ニックネームの更新に成功しました",
        },
        industry: {
          message: "業界を選択してください",
          label1: "テクノロジー、情報技術",
          label2: "経済、金融",
          label3: "教育、医療",
          label4: "エネルギー、製造業",
          label5: "農業、林業、漁業、畜産",
          label6: "サービス業",
          label7: "その他の業界",
        },
        selectedOptions: {
          message: "居住地を選択してください",
        },
        textarea: {
          message1: "個人の紹介を入力してください",
          message2: "個人の紹介は10文字以上である必要があります",
        },
        success: "情報の更新に成功しました",
        error1: "情報の更新に失敗しました",
        error2: "フォーム検証に失敗しました",
        email: {
          required: "メールアドレスを入力してください",
          invalid: "メールアドレスの形式が正しくありません",
        },
        code: {
          required: "認証コードを入力してください",
          invalid: "認証コードは6桁の数字である必要があります",
        },
      },
    },
    account: {
      title: "アカウント設定",
      titleStatement: "アカウント内容の詳細設定と変更",
      label1: "メール",
      rules1: {
        message1: "メールアドレスを入力してください",
        message2: "正しいメールアドレスを入力してください",
      },
      placeholder: "メールアドレスをバインド",
      bind: "バインド",
      rebind: "再バインド",
      label2: "アカウントパスワード",
      change: "パスワードの変更",
      recover: "パスワードを回復",
      label3: "古いパスワード",
      label4: "新しいパスワード",
      label5: "パスワードの確認",
      confirm: "変更を確認",
      rules2: {
        old: {
          message1: "古いパスワードを入力してください",
          message2: "古いパスワードは6文字以上である必要があります",
          error1: "古いパスワードを空にすることはできません",
          error2: "新しいパスワードは古いパスワードと同じにできません！",
        },
        new: {
          error2: "新しいパスワードは古いパスワードと同じにできません！",
        },
        check: {
          message1: "確認用パスワードを入力してください",
          error1: "もう一度パスワードを入力してください",
          error2: "2回入力したパスワードが一致しません",
        },
      },
      validate1: {
        success: "パスワードの変更に成功しました",
        error1: "パスワードの変更に失敗しました",
        error2: "フォーム検証に失敗しました",
      },
      validate2: {
        success: "バインド成功",
        error1: "バインド失敗",
        error2: "フォーム検証に失敗しました",
      },
    },
  },
};
