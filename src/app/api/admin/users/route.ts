import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-users-api');

// GET /api/admin/users - List users with search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      if (status === 'active') {
        where.deletedAt = null;
      } else if (status === 'banned') {
        where.deletedAt = { not: null };
      }
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          emailVerified: true,
          _count: {
            select: {
              transactions: true,
              payments: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Get user stats
    const stats = await prisma.user.aggregate({
      _count: { id: true },
      where: { deletedAt: null }
    });

    const bannedStats = await prisma.user.aggregate({
      _count: { id: true },
      where: { deletedAt: { not: null } }
    });

    await securityLogger.log('users_listed', 'admin', { 
      total: users.length, 
      search: !!search,
      filters: { status, sortBy, sortOrder }
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          total: stats._count.id,
          active: stats._count.id,
          banned: bannedStats._count.id
        }
      }
    });

  } catch (error) {
    await securityLogger.log('users_list_error', 'admin', { error: error.message });
    console.error('Users list error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, role = 'USER' } = body;

    // Validation
    if (!email || !name || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email, name, and password are required'
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        emailVerified: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        emailVerified: true
      }
    });

    await securityLogger.log('user_created', 'admin', { 
      userId: user.id, 
      email: user.email,
      role 
    });

    return NextResponse.json({
      success: true,
      data: { user },
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    await securityLogger.log('user_creation_error', 'admin', { error: error.message });
    console.error('User creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create user' 
    }, { status: 500 });
  }
}