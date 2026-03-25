import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import Application from "./models/Application.js";
import Contact from "./models/Contact.js";
dotenv.config();

const app = express();
app.use(express.json());
const upload = multer({ dest: "uploads/" });
// app.use(cors({
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//        "http://localhost:5173",  
//       "https://vesqon.com",
//       "https://www.vesqon.com"
//     ];

//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("CORS not allowed"));
//     }
//   },
//   credentials: true
// }));
app.use(cors()); // ✅ TEMP FIX
mongoose.connect(process.env.MONGO_URI, {
  family: 4
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// POST endpoint to receive form data
app.post("/api/careers", upload.single("cv"), async (req, res) => {

  const { name, email, phone, street, apartment, city, state, zip, country } = req.body;
  const file = req.file;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email are required." });
  }

  try {

    // ⭐ SAVE TO MONGODB
    const newApplication = new Application({
      name,
      email,
      phone,
      street,
      apartment,
      city,
      state,
      zip,
      country,
      cvFile: file ? file.path : null
    });

    await newApplication.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: "New Career Application",
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone}

Address:
${street}, ${apartment}, ${city}, ${state}, ${zip}, ${country}
`,
      attachments: file
        ? [
            {
              filename: file.originalname,
              path: file.path
            }
          ]
        : []
    };

    try {
  await transporter.sendMail(mailOptions);
  console.log("✅ Career email sent");
} catch (emailError) {
  console.error("❌ Career email failed:", emailError);
  return res.status(500).json({ message: "Email sending failed" });
}

    res.json({ message: "Application sent successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong." });
  }

});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    // ✅ Save to MongoDB
    const newContact = new Contact({
      name,
      email,
      subject,
      message,
    });

    await newContact.save();

    // ✅ Send Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: `Contact Form: ${subject || "No Subject"}`,
    text: `
Name: ${name}
Email: ${email}

Message:
${message}
`,
  });

  console.log("✅ Email sent successfully");

} catch (emailError) {
  console.error("❌ Email failed:", emailError);
  return res.status(500).json({ message: "Email sending failed" });
}

    res.status(200).json({ message: "Message sent & saved successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});
app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);