import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing video ID", { status: 400 });
  }

  // Extract clean ID to prevent path traversal
  const cleanId = id.replace(/^local-/, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const filePath = path.join(process.cwd(), "uploads", `${cleanId}.mp4`);

  if (!existsSync(filePath)) {
    return new Response("Video file not found", { status: 404 });
  }

  const stat = statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    
    const fileStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": "video/mp4",
      },
    });
  } else {
    const fileStream = createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      },
    });
  }
}
