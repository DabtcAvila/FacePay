import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-support-ticket-api');

// GET /api/admin/support/tickets/[id] - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: 'Support ticket not found'
      }, { status: 404 });
    }

    // Get related tickets from the same user
    const relatedTickets = await prisma.supportTicket.findMany({
      where: { 
        userId: ticket.userId,
        id: { not: id }
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true
      }
    });

    await securityLogger.log('support_ticket_viewed', 'admin', {
      ticketId: id,
      userId: ticket.userId
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket,
        relatedTickets
      }
    });

  } catch (error) {
    await securityLogger.log('support_ticket_view_error', 'admin', {
      ticketId: params.id,
      error: error.message
    });
    console.error('Get support ticket error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch support ticket' 
    }, { status: 500 });
  }
}

// PUT /api/admin/support/tickets/[id] - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      status, 
      priority, 
      assignedTo, 
      category,
      adminNote,
      resolution 
    } = body;

    // Check if ticket exists
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!existingTicket) {
      return NextResponse.json({
        success: false,
        error: 'Support ticket not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (category !== undefined) updateData.category = category;
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (resolution !== undefined) updateData.resolution = resolution;

    // If closing or resolving, set resolved date
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    // Update ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    await securityLogger.log('support_ticket_updated', 'admin', {
      ticketId: id,
      updatedFields: Object.keys(updateData),
      newStatus: status,
      newPriority: priority
    });

    return NextResponse.json({
      success: true,
      data: { ticket: updatedTicket },
      message: 'Support ticket updated successfully'
    });

  } catch (error) {
    await securityLogger.log('support_ticket_update_error', 'admin', {
      ticketId: params.id,
      error: error.message
    });
    console.error('Update support ticket error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update support ticket' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/support/tickets/[id] - Delete ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: 'Support ticket not found'
      }, { status: 404 });
    }

    // Delete associated messages first
    await prisma.supportTicketMessage.deleteMany({
      where: { ticketId: id }
    });

    // Delete ticket
    await prisma.supportTicket.delete({
      where: { id }
    });

    await securityLogger.log('support_ticket_deleted', 'admin', {
      ticketId: id,
      userId: ticket.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Support ticket deleted successfully'
    });

  } catch (error) {
    await securityLogger.log('support_ticket_deletion_error', 'admin', {
      ticketId: params.id,
      error: error.message
    });
    console.error('Delete support ticket error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete support ticket' 
    }, { status: 500 });
  }
}