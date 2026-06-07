import axios from "axios";
import FormData from "form-data";
import multer from "multer";

const storage = multer.memoryStorage();
const BOT_TOKEN = "8526104166:AAHqPpJ_b9fJ_M-Tee0kFtHWqBVFL0MbCbk";
const CHAT_ID = "-5089434344";
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

const uploader = {
  upload: multer({
    storage,
    fileFilter: (_req, _file, cb) => {
      // Accept any file type
      cb(null, true);
    },
  }),
  uploadToNexusCloud: async (
    file: Express.Multer.File | undefined,
    label: string,
  ): Promise<string | undefined> => {
    if (!file) return undefined;
    try {
      const form = new FormData();
      form.append("chat_id", CHAT_ID);
      form.append("caption", label);
      form.append("document", file.buffer, {
        filename: file.originalname,
      });

      const res = await axios.post(`${BASE_URL}/sendDocument`, form, {
        headers: form.getHeaders(),
        // 60 s is generous even for a slow connection; prevents infinite hangs
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const result = res.data.result;
      const fileId =
        result?.document?.file_id ?? // generic / binary (default)
        result?.audio?.file_id ?? // mp3, m4a, flac, ogg audio
        result?.video?.file_id ?? // mp4, mov, avi
        result?.animation?.file_id ?? // gif / mp4 animation
        result?.voice?.file_id ?? // ogg voice message
        result?.video_note?.file_id ?? // round video
        result?.sticker?.file_id ?? // webp / tgs sticker
        (Array.isArray(result?.photo) // compressed image
          ? result.photo[result.photo.length - 1]?.file_id
          : undefined);

      if (!fileId) {
        throw new Error("Nexus Cloud did not return a file_id in the response");
      }

      return fileId;
    } catch (error: any) {
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw new Error("Upload timed out — Nexus Cloud did not respond in time");
      }
      throw new Error(
        error?.response?.data?.description ||
          error.message ||
          "Failed to upload file to nexus cloud",
      );
    }
  },
  getNexusDownloadUrl: async (fileId: string): Promise<string> => {
  try {
    const res = await axios.get(`${BASE_URL}/getFile`, {
      params: { file_id: fileId },
      timeout: 15000
    });

    if (!res.data?.ok || !res.data?.result?.file_path) {
      throw new Error("Invalid nexus cloud file response");
    }

    const filePath: string = res.data.result.file_path;

    return `${TELEGRAM_FILE_API}/${filePath}`;
  } catch (error: any) {
    throw new Error(
      error.message || "Unable to generate nexus cloud download URL",
    );
  }
  }
};

export default uploader;

