import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';

// Security: Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Security: Allowed MIME types
const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

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

        // Security: Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        // Security: Validate file type by MIME and extension
        const isValidMime = ALLOWED_TYPES.includes(file.type);
        const isValidExtension = file.name.toLowerCase().endsWith('.pdf') ||
            file.name.toLowerCase().endsWith('.docx');

        if (!isValidMime && !isValidExtension) {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload PDF or DOCX.' },
                { status: 400 }
            );
        }

        // Security: Sanitize filename (prevent path traversal)
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const pdfParser = new PDFParser(null, true);

            text = await new Promise((resolve, reject) => {
                // Set timeout to prevent hanging
                const timeout = setTimeout(() => {
                    reject(new Error('PDF parsing timeout'));
                }, 30000);

                pdfParser.on("pdfParser_dataError", (errData: any) => {
                    clearTimeout(timeout);
                    reject(errData.parserError);
                });
                pdfParser.on("pdfParser_dataReady", () => {
                    clearTimeout(timeout);
                    resolve(pdfParser.getRawTextContent());
                });
                pdfParser.parseBuffer(buffer);
            });
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx')
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload PDF or DOCX.' },
                { status: 400 }
            );
        }

        // Security: Limit extracted text length to prevent memory issues
        const maxTextLength = 100000; // ~100KB of text
        if (text.length > maxTextLength) {
            text = text.substring(0, maxTextLength);
            console.warn(`Resume text truncated from ${text.length} to ${maxTextLength} characters`);
        }

        return NextResponse.json({
            text,
            fileName: sanitizedName
        });
    } catch (error: any) {
        console.error('File Parsing Error:', {
            message: error.message,
            name: error.name
        });

        // Security: Don't expose internal error details
        return NextResponse.json(
            { error: 'Failed to parse file. Please ensure it is a valid PDF or DOCX.' },
            { status: 500 }
        );
    }
}
