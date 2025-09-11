import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-feature-flag-api');

// GET /api/admin/feature-flags/[id] - Get feature flag details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const featureFlag = await prisma.featureFlag.findUnique({
      where: { id },
      include: {
        userFlags: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            userFlags: true
          }
        }
      }
    });

    if (!featureFlag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    // Get usage analytics
    const usageStats = {
      totalUsers: featureFlag._count.userFlags,
      activeUsers: featureFlag.userFlags.filter(uf => uf.isEnabled).length,
      rolloutCoverage: featureFlag.rolloutPercentage,
      lastUpdated: featureFlag.updatedAt
    };

    // Get recent activity (mock data for now)
    const recentActivity = [
      {
        action: 'updated',
        timestamp: featureFlag.updatedAt,
        details: 'Rollout percentage changed'
      }
    ];

    await securityLogger.log('feature_flag_viewed', 'admin', {
      flagId: id,
      key: featureFlag.key
    });

    return NextResponse.json({
      success: true,
      data: {
        featureFlag,
        usageStats,
        recentActivity
      }
    });

  } catch (error) {
    await securityLogger.log('feature_flag_view_error', 'admin', {
      flagId: params.id,
      error: error.message
    });
    console.error('Get feature flag error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch feature flag' 
    }, { status: 500 });
  }
}

// PUT /api/admin/feature-flags/[id] - Update feature flag
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      name,
      description,
      isEnabled, 
      rolloutPercentage,
      conditions,
      metadata
    } = body;

    // Check if flag exists
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existingFlag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (rolloutPercentage !== undefined) {
      if (rolloutPercentage < 0 || rolloutPercentage > 100) {
        return NextResponse.json({
          success: false,
          error: 'Rollout percentage must be between 0 and 100'
        }, { status: 400 });
      }
      updateData.rolloutPercentage = rolloutPercentage;
    }
    if (conditions !== undefined) updateData.conditions = conditions;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update flag
    const updatedFlag = await prisma.featureFlag.update({
      where: { id },
      data: updateData
    });

    await securityLogger.log('feature_flag_updated', 'admin', {
      flagId: id,
      key: existingFlag.key,
      updatedFields: Object.keys(updateData),
      wasEnabled: existingFlag.isEnabled,
      nowEnabled: updatedFlag.isEnabled
    });

    return NextResponse.json({
      success: true,
      data: { featureFlag: updatedFlag },
      message: 'Feature flag updated successfully'
    });

  } catch (error) {
    await securityLogger.log('feature_flag_update_error', 'admin', {
      flagId: params.id,
      error: error.message
    });
    console.error('Update feature flag error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update feature flag' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/feature-flags/[id] - Delete feature flag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const flag = await prisma.featureFlag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userFlags: true
          }
        }
      }
    });

    if (!flag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    // Check if flag is currently enabled and has users
    if (flag.isEnabled && flag._count.userFlags > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete an enabled feature flag with active users. Disable it first.'
      }, { status: 400 });
    }

    // Delete user flag associations first
    await prisma.userFeatureFlag.deleteMany({
      where: { featureFlagId: id }
    });

    // Delete feature flag
    await prisma.featureFlag.delete({
      where: { id }
    });

    await securityLogger.log('feature_flag_deleted', 'admin', {
      flagId: id,
      key: flag.key,
      hadUsers: flag._count.userFlags > 0
    });

    return NextResponse.json({
      success: true,
      message: 'Feature flag deleted successfully'
    });

  } catch (error) {
    await securityLogger.log('feature_flag_deletion_error', 'admin', {
      flagId: params.id,
      error: error.message
    });
    console.error('Delete feature flag error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete feature flag' 
    }, { status: 500 });
  }
}

// PATCH /api/admin/feature-flags/[id] - Toggle feature flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['enable', 'disable', 'toggle'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use enable, disable, or toggle'
      }, { status: 400 });
    }

    const existingFlag = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existingFlag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    let newEnabledState: boolean;
    switch (action) {
      case 'enable':
        newEnabledState = true;
        break;
      case 'disable':
        newEnabledState = false;
        break;
      case 'toggle':
        newEnabledState = !existingFlag.isEnabled;
        break;
    }

    const updatedFlag = await prisma.featureFlag.update({
      where: { id },
      data: { 
        isEnabled: newEnabledState,
        updatedAt: new Date()
      }
    });

    await securityLogger.log('feature_flag_toggled', 'admin', {
      flagId: id,
      key: existingFlag.key,
      action,
      fromState: existingFlag.isEnabled,
      toState: newEnabledState
    });

    return NextResponse.json({
      success: true,
      data: { featureFlag: updatedFlag },
      message: `Feature flag ${action}d successfully`
    });

  } catch (error) {
    await securityLogger.log('feature_flag_toggle_error', 'admin', {
      flagId: params.id,
      error: error.message
    });
    console.error('Toggle feature flag error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to toggle feature flag' 
    }, { status: 500 });
  }
}