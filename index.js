import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import Application from "./models/Application.js";
import Contact from "./models/Contact.js";
import fs from "fs";
import SibApiV3Sdk from "sib-api-v3-sdk";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;

const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
const app = express();
app.use(express.json());
const upload = multer({ dest: "uploads/" });
app.use(cors({
  origin: [
    // "http://localhost:5173",
    "https://vesqon.com",
    "https://www.vesqon.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
mongoose.connect(process.env.MONGO_URI, {
  family: 4
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// POST endpoint to receive form data
// ==============================
// 🚀 CAREERS API (WITH CV FILE)
// ==============================
app.post("/api/careers", upload.single("cv"), async (req, res) => {
  const { name, email, phone, street, apartment, city, state, zip, country } = req.body;
  const file = req.file;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email are required." });
  }

  try {
    // ✅ Save to MongoDB
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

    // ✅ Prepare attachment
    let attachments = [];

    if (file) {
      const fileContent = fs.readFileSync(file.path, { encoding: "base64" });

      attachments.push({
        content: fileContent,
        name: file.originalname
      });
    }

    // ✅ Send Email
    await tranEmailApi.sendTransacEmail({
      sender: {
        email: "vgweb20@gmail.com", // ⚠️ must be verified in Brevo
        name: "Vesqon"
      },
      to: process.env.EMAIL_TO.split(",").map(e => ({ email: e.trim() })),
      replyTo: { email: email },
      subject: "New Career Application",
      textContent: `
Name: ${name}
Email: ${email}
Phone: ${phone}

Address:
${street}, ${apartment}, ${city}, ${state}, ${zip}, ${country}
`,
      attachments: attachments
    });

    console.log("✅ Career email sent");

   

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

    // ✅ Send Email via Brevo API
    try {
      await tranEmailApi.sendTransacEmail({
        sender: {
          email: "vgweb20@gmail.com",
          name: "Vesqon"
        },
        to: [
          { email: process.env.EMAIL_TO }
        ],
        subject: `Contact Form: ${subject || "No Subject"}`,
        replyTo: { email: email }, 
        textContent: `
Name: ${name}
Email: ${email}

Message:
${message}
`
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