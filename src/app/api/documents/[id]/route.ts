import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canReadDocument, Forbidden } from "@/lib/access";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const { id } = params;
    const doc = await canReadDocument(session, id);

    let buffer: Buffer;
    let contentType = "application/octet-stream";
    let filename = `document-${id}.pdf`;

    if (doc.path.startsWith("data:")) {
      const match = doc.path.match(/^data:([^;]+);(?:name=([^;]+);)?base64,(.+)$/);
      if (match) {
        contentType = match[1];
        if (match[2]) filename = decodeURIComponent(match[2]);
        buffer = Buffer.from(match[3], "base64");
      } else {
        const commaIdx = doc.path.indexOf(",");
        const mime = doc.path.slice(5, doc.path.indexOf(";"));
        contentType = mime || "application/octet-stream";
        buffer = Buffer.from(doc.path.slice(commaIdx + 1), "base64");
      }
    } else {
      const ext = path.extname(doc.path).toLowerCase();
      if (ext === ".pdf") contentType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";

      buffer = await readFile(doc.path);
      filename = path.basename(doc.path);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof Forbidden) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
