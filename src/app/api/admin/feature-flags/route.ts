import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-feature-flags-api');

// GET /api/admin/feature-flags - List all feature flags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const environment = searchParams.get('environment') || '';
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};
    
    if (status) where.isEnabled = status === 'enabled';
    if (environment) where.environment = environment;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get feature flags
    const featureFlags = await prisma.featureFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            userFlags: true
          }
        }
      }
    });

    // Get usage statistics
    const totalFlags = await prisma.featureFlag.count();
    const enabledFlags = await prisma.featureFlag.count({
      where: { isEnabled: true }
    });
    const disabledFlags = totalFlags - enabledFlags;

    // Get environment breakdown
    const environments = await prisma.featureFlag.groupBy({
      by: ['environment'],
      _count: { environment: true }
    });

    await securityLogger.log('feature_flags_listed', 'admin', {
      total: featureFlags.length,
      filters: { status, environment, search: !!search }
    });

    return NextResponse.json({
      success: true,
      data: {
        featureFlags: featureFlags.map(flag => ({
          ...flag,
          userCount: flag._count.userFlags
        })),
        stats: {
          total: totalFlags,
          enabled: enabledFlags,
          disabled: disabledFlags,
          environments: environments.map(env => ({
            name: env.environment,
            count: env._count.environment
          }))
        }
      }
    });

  } catch (error) {
    await securityLogger.log('feature_flags_list_error', 'admin', { error: error.message });
    console.error('Feature flags list error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch feature flags' 
    }, { status: 500 });
  }
}

// POST /api/admin/feature-flags - Create new feature flag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      key,
      name, 
      description, 
      environment = 'production',
      isEnabled = false,
      rolloutPercentage = 0,
      conditions = {},
      metadata = {}
    } = body;

    // Validation
    if (!key || !name || !description) {
      return NextResponse.json({
        success: false,
        error: 'Key, name, and description are required'
      }, { status: 400 });
    }

    // Check if key already exists in this environment
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { 
        key_environment: {
          key,
          environment
        }
      }
    });

    if (existingFlag) {
      return NextResponse.json({
        success: false,
        error: `Feature flag with key '${key}' already exists in ${environment} environment`
      }, { status: 400 });
    }

    // Create feature flag
    const featureFlag = await prisma.featureFlag.create({
      data: {
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        key,
        name,
        description,
        environment,
        isEnabled,
        rolloutPercentage,
        conditions,
        metadata,
        createdBy: 'admin' // In real app, get from session
      }
    });

    await securityLogger.log('feature_flag_created', 'admin', {
      flagId: featureFlag.id,
      key,
      environment,
      isEnabled
    });

    return NextResponse.json({
      success: true,
      data: { featureFlag },
      message: 'Feature flag created successfully'
    }, { status: 201 });

  } catch (error) {
    await securityLogger.log('feature_flag_creation_error', 'admin', { error: error.message });
    console.error('Feature flag creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create feature flag' 
    }, { status: 500 });
  }
}

// PUT /api/admin/feature-flags - Bulk update feature flags
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Updates array is required'
      }, { status: 400 });
    }

    const results = [];

    // Process each update
    for (const update of updates) {
      try {
        const { id, isEnabled, rolloutPercentage, conditions, metadata } = update;
        
        const updateData: any = { updatedAt: new Date() };
        if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
        if (rolloutPercentage !== undefined) updateData.rolloutPercentage = rolloutPercentage;
        if (conditions !== undefined) updateData.conditions = conditions;
        if (metadata !== undefined) updateData.metadata = metadata;

        const updatedFlag = await prisma.featureFlag.update({
          where: { id },
          data: updateData
        });

        results.push({
          id,
          success: true,
          flag: updatedFlag
        });

        await securityLogger.log('feature_flag_updated', 'admin', {
          flagId: id,
          updatedFields: Object.keys(updateData)
        });

      } catch (error) {
        results.push({
          id: update.id,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { results },
      message: `Updated ${results.filter(r => r.success).length} of ${updates.length} feature flags`
    });

  } catch (error) {
    await securityLogger.log('feature_flag_bulk_update_error', 'admin', { error: error.message });
    console.error('Feature flag bulk update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update feature flags' 
    }, { status: 500 });
  }
}