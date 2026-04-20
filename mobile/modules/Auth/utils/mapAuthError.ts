export const mapAuthError = (error: any): string => {
  const message = error?.response?.data?.message;

  if (!message) return "حدث خطأ غير متوقع، حاول مرة أخرى";

  if (message.includes("already sent")) {
    return "تم إرسال رمز التحقق مسبقاً، تحقق من هاتفك 📱";
  }

  if (message.includes("OTP limit reached")) {
    const match = message.match(/(\d+)\s*hour/);
    const hours = match ? match[1] : "";
    return hours
      ? `لقد طلبت الرمز كثيراً، حاول بعد ${hours} ساعة ⏳`
      : "لقد طلبت الرمز كثيراً، حاول لاحقاً ⏳";
  }

  if (message.includes("already") || message.includes("exists")) {
    return "رقم الجوال مسجل مسبقاً";
  }

  if (message.includes("invalid") || message.includes("wrong")) {
    return "رمز التحقق غير صحيح";
  }

  if (message.includes("expired")) {
    return "انتهت صلاحية رمز التحقق، اطلب رمز جديد";
  }

  if (message.includes("not found") || message.includes("not exist")) {
    return "المستخدم غير موجود، تحقق من الرقم";
  }

  if (message.includes("blocked") || message.includes("suspended")) {
    return "هذا الرقم محظور، تواصل مع الدعم";
  }

  if (message.includes("network") || message.includes("server")) {
    return "تعذّر الاتصال بالخادم، تحقق من الإنترنت";
  }

  if (message.includes("too many") || message.includes("attempts")) {
    return "محاولات كثيرة، انتظر قليلاً وحاول مجدداً ⚠️";
  }

  return message;
};
