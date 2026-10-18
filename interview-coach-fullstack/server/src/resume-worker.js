import { TextDecoder } from "node:util";

async function extract(data) {
  const extension = data.extension;

  const buffer = Buffer.from(
    data.buffer,
    "base64",
  );

  if (extension === ".txt") {
    const decoder = new TextDecoder(
      "utf-8",
      {
        fatal: true,
      },
    );

    return decoder.decode(buffer);
  }

  if (extension === ".pdf") {
    const hasPdfHeader = buffer
      .subarray(0, 1024)
      .includes(
        Buffer.from("%PDF-"),
      );

    if (!hasPdfHeader) {
      throw new Error(
        "Invalid PDF file.",
      );
    }

    const { PDFParse } =
      await import("pdf-parse");

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    try {
      const info =
        await parser.getInfo();

      if (info.total > 30) {
        throw new Error(
          "Resume PDF must contain 30 pages or fewer.",
        );
      }

      const result =
        await parser.getText();

      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (extension === ".docx") {
    const hasZipHeader =
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b;

    if (!hasZipHeader) {
      throw new Error(
        "Invalid DOCX file.",
      );
    }

    const {
      default: WordExtractor,
    } = await import(
      "word-extractor"
    );

    const extractor =
      new WordExtractor();

    const document =
      await extractor.extract(buffer);

    return document.getBody();
  }

  if (extension === ".doc") {
    const expectedHeader =
      Buffer.from(
        "d0cf11e0a1b11ae1",
        "hex",
      );

    const actualHeader =
      buffer.subarray(0, 8);

    if (
      !actualHeader.equals(
        expectedHeader,
      )
    ) {
      throw new Error(
        "Invalid DOC file. Save it as DOCX or PDF.",
      );
    }

    const {
      default: WordExtractor,
    } = await import(
      "word-extractor"
    );

    const extractor =
      new WordExtractor();

    const document =
      await extractor.extract(buffer);

    return document.getBody();
  }

  throw new Error(
    "Unsupported file format.",
  );
}

process.once(
  "message",
  async (data) => {
    try {
      const raw =
        await extract(data);

      const text = String(raw || "")
        .replace(/\u0000/g, "")
        .replace(/\r\n?/g, "\n")
        .trim();

      if (!text) {
        throw new Error(
          "No readable text found. Scanned PDFs need OCR. Try a text-based PDF or paste the resume text.",
        );
      }

      if (text.length > 20000) {
        throw new Error(
          "Resume text exceeds 20,000 characters. Use a shorter resume.",
        );
      }

      process.send?.({
        type: "resume-result",
        text,
      });
    } catch (error) {
      const knownErrors = [
        "Invalid PDF",
        "Invalid DOCX",
        "Invalid DOC",
        "Resume PDF",
        "No readable text",
        "Resume text exceeds",
        "Unsupported file",
      ];

      const message = String(
        error?.message || "",
      );

      const isKnown =
        knownErrors.some(
          (prefix) => {
            return message.startsWith(
              prefix,
            );
          },
        );

      process.send?.({
        type: "resume-result",

        error: isKnown
          ? message
          : "Unable to read this file. Try another PDF/DOCX file or paste the resume text.",
      });
    }
  },
);