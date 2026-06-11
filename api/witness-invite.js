// api/witness-invite.js

const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  try {
    const { name, contact, code, note } = req.body;

    if (!contact || !code) {
      return res.status(400).json({ error: "Missing data" });
    }

    // ✅ EMAIL TRANSPORT
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const message = `
You have been requested to provide a witness statement.

Name: ${name}

Verification Code: ${code}

Instructions:
Reply with your statement and include the code above.

${note || ""}
`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contact,
      subject: "Witness Statement Request",
      text: message
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Email failed" });
  }
};
