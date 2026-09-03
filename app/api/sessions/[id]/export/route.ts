import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const printUrl = `${baseUrl}/print/${params.id}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: "1300px",
      height: "930px",
      printBackground: true,
      pageRanges: "",
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="celebrants-${params.id}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
