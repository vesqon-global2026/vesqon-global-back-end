import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  street: String,
  apartment: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  cvFile: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Application", applicationSchema);