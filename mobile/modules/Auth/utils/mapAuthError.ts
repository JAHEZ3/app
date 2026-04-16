export const mapAuthError = (error: any): string => {
  const message = error?.response?.data?.message;

  if (!message) return "حدث خطأ غير متوقع، حاول مرة أخرى";

  // 🔒 OTP already sent
  if (message.includes("already sent")) {
    return "تم إرسال رمز التحقق مسبقاً، تحقق من هاتفك 📱";
  }

  // ⏳ OTP limit reached
  if (message.includes("OTP limit reached")) {
    const match = message.match(/(\d+)\s*hour/);
    const hours = match ? match[1] : "";
    return hours
      ? `لقد طلبت الرمز كثيراً، حاول بعد ${hours} ساعة ⏳`
      : "لقد طلبت الرمز كثيراً، حاول لاحقاً ⏳";
  }

  // 📵 phone already registered
  if (message.includes("already") || message.includes("exists")) {
    return "رقم الجوال مسجل مسبقاً";
  }

  // 🔢 invalid OTP
  if (message.includes("invalid") || message.includes("wrong")) {
    return "رمز التحقق غير صحيح";
  }

  // ⌛ expired OTP
  if (message.includes("expired")) {
    return "انتهت صلاحية رمز التحقق، اطلب رمز جديد";
  }

  // 🚫 user not found
  if (message.includes("not found") || message.includes("not exist")) {
    return "المستخدم غير موجود، تحقق من الرقم";
  }

  // 📵 phone blocked / suspended
  if (message.includes("blocked") || message.includes("suspended")) {
    return "هذا الرقم محظور، تواصل مع الدعم";
  }

  // 🌐 network / server
  if (message.includes("network") || message.includes("server")) {
    return "تعذّر الاتصال بالخادم، تحقق من الإنترنت";
  }

  // ⚠️ too many attempts
  if (message.includes("too many") || message.includes("attempts")) {
    return "محاولات كثيرة، انتظر قليلاً وحاول مجدداً ⚠️";
  }

  return message;
};
