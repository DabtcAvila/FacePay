import { NextRequest, NextResponse } from 'next/server';
import { monitoring } from '@/lib/monitoring';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/admin/reconciliation/download
 * Download reconciliation report files
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({
        success: false,
        error: 'Missing file path parameter'
      }, { status: 400 });
    }

    // Security: Ensure the file path is within the reports directory
    const reportsDir = path.join(process.cwd(), 'reports', 'reconciliation');
    const absolutePath = path.resolve(filePath);
    const absoluteReportsDir = path.resolve(reportsDir);

    if (!absolutePath.startsWith(absoluteReportsDir)) {
      monitoring.captureMessage(
        'Attempted access to file outside reports directory',
        'warning',
        { attemptedPath: filePath, reportsDir: absoluteReportsDir }
      );
      
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }

    // Read file content
    const fileContent = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);
    const fileExtension = path.extname(fileName).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (fileExtension === '.json') {
      contentType = 'application/json';
    } else if (fileExtension === '.csv') {
      contentType = 'text/csv';
    }

    monitoring.addBreadcrumb('Reconciliation report downloaded', 'api', 'info', {
      fileName,
      fileSize: fileContent.length,
      contentType
    });

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileContent.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    monitoring.captureException(error as Error, {
      context: 'reconciliation_download_api',
      extra: { url: request.url }
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}