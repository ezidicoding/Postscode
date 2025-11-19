const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 3000;

// تعديل البريد السري لمدونتك
const BLOGGER_EMAIL = "send.shamo.post2025@blogger.com";

// إعدادات SMTP (مثال Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "send.shamo@gmail.com", // بريدك لإرسال الرسائل
    pass: "Shamo+2002+2002"     // كلمة مرور التطبيق Gmail (App Password)
  }
});

// تفعيل استقبال بيانات POST من النموذج
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// استضافة ملفات HTML من مجلد public
app.use(express.static("public"));

// استقبال الطلب من النموذج
app.post("/submit", (req, res) => {
  const { title, author, content } = req.body;

  const mailOptions = {
    from: `"${author || "زائر"}" <YOUR_GMAIL@gmail.com>`,
    to: BLOGGER_EMAIL,
    subject: `مقال جديد: ${title}`,
    text: `العنوان: ${title}\nالكاتب: ${author || "زائر"}\n\n${content}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.send("<h3>حدث خطأ أثناء الإرسال. حاول مرة أخرى.</h3>");
    }
    // إعادة توجيه المستخدم بعد الإرسال
    res.redirect("https://eclrsg.blogspot.com/?m=1");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
