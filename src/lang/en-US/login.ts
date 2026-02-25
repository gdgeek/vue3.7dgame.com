// login translations for en-US
export default {
  login: {
    register: "Platform Register/Login",
    h1: "Welcome!",
    h4: "Ready to get started?",
    username: "Email",
    password: "Password",
    login: "Login",
    loginCode: "Login Code",
    scanTip: "Please scan the QR code with your phone to log in",
    scanSubTip: "Auto register or login after scanning",
    rules: {
      username: {
        message1: "Please enter your username",
        email: "Please enter a valid email address"
      },
      password: {
        message1: "Please enter your password",
        message2: "Between 12 and 128 characters"
      },
      repassword: {
        message1: "Please enter the password again",
        message2: "The two passwords do not match"
      }
    },
    success: "Login Successful",
    error: "Form Validation Failed",
    createAccount: "Create Account",
    repassword: "Confirm Password",
    create: "Create",
    linkAccount: "Login Account",
    agreementPrefix: "By registering or logging in, you agree to",
    agreementAnd: "and",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    logout: {
      message1: "Are you sure you want to log out and exit the system?",
      message2: "Prompt",
      confirm: "Confirm",
      cancel: "Cancel",
      title: "Logging out",
      text: "Logging out this session from the server"
    },
    back: "Back",
    abandonRegisterConfirm: "Are you sure you want to abandon registration?",
    abandonRegisterTitle: "Warning",
    abandonRegisterConfirmButton: "Confirm",
    abandonRegisterCancelButton: "Continue registration",
    loginResponseMissingToken: "The login response is missing the access_token",
    qrcodeFetchFailed: "Failed to get WeChat QR code, please try again later"
  },
  passwordPolicy: {
    minLength: "At least 12 characters",
    maxLength: "No more than 128 characters",
    uppercase: "Contains uppercase letter (A-Z)",
    lowercase: "Contains lowercase letter (a-z)",
    digit: "Contains digit (0-9)",
    specialChar: "Contains special character (!@#$%^&* etc.)",
    strength: {
      weak: "Weak",
      medium: "Medium",
      strong: "Strong"
    }
  },
  imageSelector: {
    selectImageMethod: "Select Image Method",
    selectFromResource: "Select from Resources",
    selectFromResourceDesc: "Select from uploaded image resources",
    uploadLocal: "Upload Local Image",
    uploadLocalDesc: "Upload a new image file",
    uploadFile: "Upload File"
  }
};
