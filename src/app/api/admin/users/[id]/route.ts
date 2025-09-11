import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-user-api');

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            merchant: {
              select: { name: true, id: true }
            }
          }
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            transactions: true,
            payments: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Calculate user stats
    const totalSpent = await prisma.transaction.aggregate({
      where: { 
        userId: id,
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    const recentActivity = await prisma.transaction.findMany({
      where: { userId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: {
          select: { name: true }
        }
      }
    });

    await securityLogger.log('user_viewed', 'admin', { 
      targetUserId: id,
      userEmail: user.email 
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          password: undefined // Never return password
        },
        stats: {
          totalSpent: totalSpent._sum.amount || 0,
          totalTransactions: user._count.transactions,
          totalPayments: user._count.payments,
          recentActivity
        }
      }
    });

  } catch (error) {
    await securityLogger.log('user_view_error', 'admin', { 
      targetUserId: params.id,
      error: error.message 
    });
    console.error('Get user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user' 
    }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, role, password, action } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Handle different actions
    if (action === 'ban') {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      await securityLogger.log('user_banned', 'admin', { 
        targetUserId: id,
        targetUserEmail: existingUser.email 
      });

      return NextResponse.json({
        success: true,
        data: { user: { ...updatedUser, password: undefined } },
        message: 'User banned successfully'
      });
    }

    if (action === 'unban') {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { deletedAt: null }
      });

      await securityLogger.log('user_unbanned', 'admin', { 
        targetUserId: id,
        targetUserEmail: existingUser.email 
      });

      return NextResponse.json({
        success: true,
        data: { user: { ...updatedUser, password: undefined } },
        message: 'User unbanned successfully'
      });
    }

    // Regular update
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (email && email !== existingUser.email) {
      // Check email uniqueness
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      if (emailExists) {
        return NextResponse.json({
          success: false,
          error: 'Email already exists'
        }, { status: 400 });
      }
      updateData.email = email;
    }
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await securityLogger.log('user_updated', 'admin', { 
      targetUserId: id,
      targetUserEmail: existingUser.email,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      data: { user: { ...updatedUser, password: undefined } },
      message: 'User updated successfully'
    });

  } catch (error) {
    await securityLogger.log('user_update_error', 'admin', { 
      targetUserId: params.id,
      error: error.message 
    });
    console.error('Update user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update user' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check if user has active transactions
    const activeTransactions = await prisma.transaction.count({
      where: { 
        userId: id,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (activeTransactions > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete user with active transactions'
      }, { status: 400 });
    }

    // Delete user permanently
    await prisma.user.delete({
      where: { id }
    });

    await securityLogger.log('user_deleted', 'admin', { 
      targetUserId: id,
      targetUserEmail: user.email 
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted permanently'
    });

  } catch (error) {
    await securityLogger.log('user_deletion_error', 'admin', { 
      targetUserId: params.id,
      error: error.message 
    });
    console.error('Delete user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete user' 
    }, { status: 500 });
  }
}