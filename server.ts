import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use memory storage for multer
  const upload = multer({ storage: multer.memoryStorage() });

  // Add body parser for JSON (if needed)
  app.use(express.json());

  // API Route for uploading to Google Drive
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID } = process.env;

      if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
        throw new Error("Google Drive credentials not configured on the server.");
      }

      // Configure Google Auth
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
          // Replace escaped newlines with actual newlines
          private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      const drive = google.drive({ version: "v3", auth });

      // Convert buffer to stream for Google Drive API
      const bufferStream = new Readable();
      bufferStream.push(req.file.buffer);
      bufferStream.push(null);

      // Upload file to Drive
      const fileMetadata = {
        name: req.file.originalname,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      };
      
      const media = {
        mimeType: req.file.mimetype,
        body: bufferStream,
      };

      const fileResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink",
      });

      const fileId = fileResponse.data.id;
      
      // Attempt to set permissions to anyone with link can view
      try {
        await drive.permissions.create({
          fileId: fileId!,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
      } catch (permError) {
        console.warn("Failed to set public permissions, link may require login:", permError);
      }

      res.json({
        status: "success",
        fileId: fileResponse.data.id,
        webViewLink: fileResponse.data.webViewLink,
        webContentLink: fileResponse.data.webContentLink,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        error: "Failed to upload to Google Drive", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Vite middleware for development or Serve static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support React Router HTML5 history mode
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
