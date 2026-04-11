import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const INFO_PATH = join(process.cwd(), 'info.json');
const PUBLIC_DIR = join(process.cwd(), 'public');

function readInfo() {
  return JSON.parse(readFileSync(INFO_PATH, 'utf-8'));
}

function writeInfo(data: Record<string, unknown>) {
  writeFileSync(INFO_PATH, JSON.stringify(data, null, 2) + '\n');
}

export async function GET() {
  try {
    const info = readInfo();
    return NextResponse.json({ coverImage: info.coverImage || '' });
  } catch {
    return NextResponse.json({ coverImage: '' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Remove old cover if it exists
    const info = readInfo();
    if (info.coverImage) {
      const oldPath = join(PUBLIC_DIR, info.coverImage.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    const filename = `cover.${ext}`;
    const filePath = join(PUBLIC_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    info.coverImage = `/${filename}`;
    writeInfo(info);

    return NextResponse.json({ coverImage: info.coverImage });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const info = readInfo();
    if (info.coverImage) {
      const oldPath = join(PUBLIC_DIR, info.coverImage.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }
    info.coverImage = '';
    writeInfo(info);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing cover image:', error);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
