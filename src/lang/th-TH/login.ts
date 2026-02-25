// login translations for th-TH
export default {
  login: {
    register: "ลงทะเบียน/เข้าสู่ระบบแพลตฟอร์ม",
    h1: "ยินดีต้อนรับ!",
    h4: "พร้อมที่จะเริ่มหรือยัง?",
    username: "อีเมล",
    password: "รหัสผ่าน",
    login: "เข้าสู่ระบบ",
    loginCode: "รหัสเข้าสู่ระบบ",
    scanTip: "กรุณาสแกนรหัส QR ด้วยโทรศัพท์มือถือเพื่อเข้าสู่ระบบ",
    scanSubTip:
      "เมื่อสแกนโค้ดสำเร็จ ระบบจะเข้าสู่ระบบอัตโนมัติ หากหมดเวลา สามารถรีเฟรชเพื่อรับโค้ดใหม่",
    rules: {
      username: {
        message1: "กรุณากรอกชื่อผู้ใช้",
        email: "กรุณากรอกที่อยู่อีเมลที่ถูกต้อง"
      },
      password: {
        message1: "กรุณากรอกรหัสผ่าน",
        message2: "รหัสผ่านต้องมีความยาว 12~128 ตัวอักษร"
      },
      repassword: {
        message1: "กรุณากรอกรหัสผ่านอีกครั้ง",
        message2: "รหัสผ่านที่ป้อนสองครั้งไม่ตรงกัน"
      }
    },
    success: "เข้าสู่ระบบสำเร็จ",
    error: "การตรวจสอบแบบฟอร์มไม่ผ่าน",
    createAccount: "สร้างบัญชีใหม่",
    repassword: "ยืนยันรหัสผ่าน",
    create: "สร้าง",
    linkAccount: "ผูกบัญชีที่มีอยู่",
    agreementPrefix: "การสมัครหรือเข้าสู่ระบบถือว่าคุณยอมรับ",
    agreementAnd: "และ",
    termsOfService: "ข้อกำหนดการให้บริการ",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    logout: {
      message1: "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?",
      message2: "แจ้งเตือน",
      confirm: "ตกลง",
      cancel: "ยกเลิก",
      title: "กำลังออกจากระบบ",
      text: "กำลังออกจากระบบจากเซิร์ฟเวอร์"
    },
    back: "กลับ",
    loginResponseMissingToken: "การตอบกลับการเข้าสู่ระบบขาด access_token",
    abandonRegisterConfirm: "ยืนยันที่จะยกเลิกการสมัครหรือไม่?",
    abandonRegisterTitle: "คำเตือน",
    abandonRegisterConfirmButton: "ยืนยัน",
    abandonRegisterCancelButton: "สมัครต่อ",
    qrcodeFetchFailed: "ไม่สามารถรับ QR code ได้ กรุณาลองใหม่อีกครั้ง"
  },
  passwordPolicy: {
    minLength: "อย่างน้อย 12 ตัวอักษร",
    maxLength: "ไม่เกิน 128 ตัวอักษร",
    uppercase: "มีตัวอักษรพิมพ์ใหญ่ (A-Z)",
    lowercase: "มีตัวอักษรพิมพ์เล็ก (a-z)",
    digit: "มีตัวเลข (0-9)",
    specialChar: "มีอักขระพิเศษ (!@#$%^&* เป็นต้น)",
    strength: {
      weak: "อ่อน",
      medium: "ปานกลาง",
      strong: "แข็งแกร่ง"
    }
  },
  imageSelector: {
    selectImageMethod: "เลือกวิธีการเลือกรูปภาพ",
    selectFromResource: "เลือกจากคลังทรัพยากร",
    selectFromResourceDesc: "เลือกจากทรัพยากรรูปภาพที่อัปโหลดแล้ว",
    uploadLocal: "อัปโหลดรูปภาพจากเครื่อง",
    uploadLocalDesc: "อัปโหลดไฟล์รูปภาพใหม่",
    uploadFile: "อัปโหลดไฟล์"
  }
};
