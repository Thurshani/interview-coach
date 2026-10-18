import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { fork } from "node:child_process";

export const resumeRouter = Router();

export const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter(_req, file, callback) {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.has(extension)) {
      callback(
        new Error(
          "Use PDF, DOCX, DOC, or TXT files.",
        ),
      );

      return;
    }

    callback(null, true);
  },
}).single("resume");

let activeParsers = 0;

export function extractResume(
  buffer,
  extension,
) {
  return new Promise((resolve, reject) => {
    const reader = fork(
      new URL(
        "./resume-worker.js",
        import.meta.url,
      ),
      [],
      {
        execArgv: [
          "--max-old-space-size=128",
        ],

        stdio: [
          "ignore",
          "ignore",
          "ignore",
          "ipc",
        ],

        env: {
          ...process.env,
          GEMINI_API_KEY: "",
          DB_PASSWORD: "",
        },
      },
    );

    let finished = false;

    const timer = setTimeout(() => {
      finish(
        new Error(
          "Reading the resume took too long. Try another file or paste the resume text.",
        ),
      );
    }, 20000);

    function finish(error, text) {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);
      reader.kill();

      if (error) {
        reject(error);
        return;
      }

      resolve(text);
    }

    reader.on("message", (result) => {
      // Ignore messages that are not resume results.
      if (
        !result ||
        result.type !== "resume-result"
      ) {
        return;
      }

      if (result.error) {
        finish(
          new Error(
            String(result.error),
          ),
        );

        return;
      }

      if (
        typeof result.text !== "string" ||
        !result.text.trim()
      ) {
        finish(
          new Error(
            "No readable text was returned by the resume parser.",
          ),
        );

        return;
      }

      if (result.text.length > 20000) {
        finish(
          new Error(
            "Resume exceeds 20,000 characters. Use a shorter resume.",
          ),
        );

        return;
      }

      console.log(
        "Resume parsed successfully:",
        result.text.length,
        "characters",
      );

      finish(null, result.text);
    });

    reader.once("error", (error) => {
      console.error(
        "Resume reader error:",
        error.message,
      );

      finish(
        new Error(
          "Could not start the resume reader. Please try again.",
        ),
      );
    });

    reader.once(
      "exit",
      (code, signal) => {
        if (finished) {
          return;
        }

        console.error(
          "Resume reader stopped:",
          {
            code,
            signal,
          },
        );

        finish(
          new Error(
            "The document reader stopped while reading this file. Try another file or paste the resume text.",
          ),
        );
      },
    );

    reader.send(
      {
        extension,
        buffer: buffer.toString("base64"),
      },
      (error) => {
        if (!error) {
          return;
        }

        finish(
          new Error(
            "Could not send the file to the resume reader. Please try again.",
          ),
        );
      },
    );
  });
}

resumeRouter.post(
  "/extract",

  (_req, res, next) => {
    if (activeParsers >= 2) {
      res.status(503).json({
        message:
          "Resume reader is busy. Please try again shortly.",
      });

      return;
    }

    activeParsers += 1;

    let released = false;

    res.locals.releaseParser = () => {
      if (released) {
        return;
      }

      released = true;
      activeParsers -= 1;
    };

    next();
  },

  (req, res) => {
    upload(req, res, async (uploadError) => {
      try {
        if (uploadError) {
          let message =
            uploadError.message;

          if (
            uploadError.code ===
            "LIMIT_FILE_SIZE"
          ) {
            message =
              "File must be 5 MB or smaller.";
          } else if (
            uploadError instanceof
            multer.MulterError
          ) {
            message =
              "Upload one resume file using the resume field.";
          }

          res.status(400).json({
            message,
          });

          return;
        }

        if (!req.file) {
          res.status(400).json({
            message:
              "Choose a resume file.",
          });

          return;
        }

        const extension = path
          .extname(req.file.originalname)
          .toLowerCase();

        const text =
          await extractResume(
            req.file.buffer,
            extension,
          );

        const name =
          req.file.originalname
            .replace(
              /[\x00-\x1f\x7f]/g,
              "",
            )
            .slice(0, 200);

        res.json({
          name,
          text,
          characters: text.length,
        });
      } catch (error) {
        console.error(
          "Resume extraction failed:",
          error.message,
        );

        res.status(422).json({
          message: error.message,
        });
      } finally {
        req.file = undefined;
        res.locals.releaseParser();
      }
    });
  },
);