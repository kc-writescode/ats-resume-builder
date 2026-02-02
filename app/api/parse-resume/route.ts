import { NextRequest, NextResponse } from 'next/server';
const pdf = require('pdf-parse/lib/pdf-parse.js');
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload PDF or DOCX.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ text });
    } catch (error) {
        console.error('File Parsing Error:', error);
        return NextResponse.json(
            { error: 'Failed to parse file' },
            { status: 500 }
        );
    }
}
