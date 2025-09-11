import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-support-tickets-api');

// GET /api/admin/support/tickets - List support tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const category = searchParams.get('category') || '';
    const assignedTo = searchParams.get('assignedTo') || '';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get tickets and total count
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              isAdmin: true
            }
          }
        }
      }),
      prisma.supportTicket.count({ where })
    ]);

    // Get ticket statistics
    const stats = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
      prisma.supportTicket.count({ where: { priority: 'HIGH' } }),
      prisma.supportTicket.count({ where: { priority: 'URGENT' } }),
    ]);

    // Average response time (mock calculation)
    const avgResponseTime = await prisma.supportTicket.aggregate({
      _avg: {
        createdAt: true // This would be calculated differently in real app
      }
    });

    await securityLogger.log('support_tickets_listed', 'admin', {
      total: tickets.length,
      filters: { status, priority, category, search: !!search }
    });

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          open: stats[0],
          inProgress: stats[1],
          resolved: stats[2],
          closed: stats[3],
          high: stats[4],
          urgent: stats[5],
          avgResponseTime: '2.5 hours' // Mock data
        }
      }
    });

  } catch (error) {
    await securityLogger.log('support_tickets_list_error', 'admin', { error: error.message });
    console.error('Support tickets list error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch support tickets' 
    }, { status: 500 });
  }
}

// POST /api/admin/support/tickets - Create new support ticket (admin initiated)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      title, 
      description, 
      category, 
      priority = 'MEDIUM',
      assignedTo 
    } = body;

    // Validation
    if (!userId || !title || !description || !category) {
      return NextResponse.json({
        success: false,
        error: 'User ID, title, description, and category are required'
      }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title,
        description,
        category,
        priority,
        status: 'OPEN',
        assignedTo,
        createdBy: 'admin' // In real app, get from session
      },
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

    await securityLogger.log('support_ticket_created', 'admin', {
      ticketId: ticket.id,
      userId,
      category,
      priority
    });

    return NextResponse.json({
      success: true,
      data: { ticket },
      message: 'Support ticket created successfully'
    }, { status: 201 });

  } catch (error) {
    await securityLogger.log('support_ticket_creation_error', 'admin', { error: error.message });
    console.error('Support ticket creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create support ticket' 
    }, { status: 500 });
  }
}