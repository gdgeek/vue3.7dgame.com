// login translations for ja-JP
export default {
  login: {
    appleLoginFail: "Appleログインに失敗しました",
    title: "bujiaban.com",
    register: "プラットフォーム登録/ログイン",
    h1: "ようこそ！",
    h4: "準備はできましたか？",
    loginTitle: "アカウントにログイン",
    username: "email",
    password: "パスワード",
    login: "ログイン",
    loginCode: "ログインコード",
    scanTip: "携帯電話でQRコードをスキャンしてログインしてください",
    download: "関連プログラムのダウンロード",
    rules: {
      username: {
        message1: "ユーザー名を入力してください",
        message2: "ユーザー名は5文字以上にしてください",
        message3:
          "ユーザー名は、アルファベット、数字、アンダースコア、@、. のみ使用できます。",
        email: "有効な電子メールアドレスを入力してください",
      },
      password: {
        message1: "パスワードを入力してください",
        message2: "パスワードは12〜128文字で入力してください",
        message3:
          "パスワードは大文字・小文字・数字・特殊文字を含む必要があります",
      },
      repassword: {
        message1: "もう一度パスワードを入力してください",
        message2: "2回入力したパスワードが一致しません",
      },
    },
    success: "ログイン成功",
    usernameError: "ユーザー名エラー",
    passwordError: "パスワードエラー",
    error: "フォーム検証に失敗しました",
    createAccount: "アカウントを作成",
    repassword: "パスワードを確認",
    create: "作成",
    linkAccount: "アカウントにログイン",
    logout: {
      message1: "ログアウトしてシステムを終了しますか？",
      message2: "ヒント",
      confirm: "確認",
      cancel: "キャンセル",
      title: "ログアウト中",
      text: "サーバーからこのセッションをログアウトしています",
    },
    back: "戻る",
    loginResponseMissingToken: "ログインレスポンスに access_token がありません",
  },
  passwordPolicy: {
    minLength: "12文字以上",
    maxLength: "128文字以下",
    uppercase: "大文字を含む (A-Z)",
    lowercase: "小文字を含む (a-z)",
    digit: "数字を含む (0-9)",
    specialChar: "特殊文字を含む (!@#$%^&* など)",
    strength: {
      weak: "弱い",
      medium: "普通",
      strong: "強い",
    },
    description:
      "パスワード要件：12文字以上、大文字・小文字・数字・特殊文字を含むこと",
  },
  imageSelector: {
    selectImageMethod: "画像選択方法",
    selectFromResource: "リソースから選択",
    selectFromResourceDesc: "アップロード済みの画像リソースから選択",
    uploadLocal: "ローカル画像をアップロード",
    uploadLocalDesc: "新しい画像ファイルをアップロード",
    uploadFile: "ファイルをアップロード",
  },
};
