# FacePay CI/CD Pipeline

This directory contains the complete CI/CD pipeline configuration for the FacePay project, implementing a comprehensive DevOps workflow with automated testing, security analysis, deployment, and maintenance.

## Quick Start

### 1. Set up Required Secrets

Navigate to your repository **Settings** → **Secrets and variables** → **Actions** and add:

#### Essential Secrets
```bash
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=your-application-url
DATABASE_URL=your-database-connection
VERCEL_TOKEN=your-vercel-token
```

#### Optional Enhancement Secrets
```bash
CODECOV_TOKEN=your-codecov-token
SLACK_WEBHOOK_URL=your-slack-webhook
SNYK_TOKEN=your-snyk-token
```

### 2. Configure Branch Protection

Run the branch protection setup workflow:
1. Go to **Actions** → **Setup Branch Protection Rules**
2. Click **Run workflow**
3. Set `apply_changes` to `true`
4. Execute the workflow

### 3. Verify Pipeline

1. Create a test branch and push changes
2. Open a Pull Request
3. Verify all CI checks pass
4. Merge to see CD pipeline in action

## Pipeline Overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Developer │───▶│  CI Pipeline │───▶│ Quality Gates   │
│    Push/PR  │    │ (Tests, Lint)│    │ (Security, Cov) │
└─────────────┘    └──────────────┘    └─────────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Emergency  │───▶│   Rollback   │    │   CD Pipeline   │
│   Rollback  │    │   Workflow   │    │   (Deploy)      │
└─────────────┘    └──────────────┘    └─────────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Scheduled  │───▶│  Maintenance │    │   Production    │
│   Tasks     │    │  (Backup,Sec)│    │   Environment   │
└─────────────┘    └──────────────┘    └─────────────────┘
```

## Workflow Files

| File | Purpose | Trigger |
|------|---------|---------|
| [`ci.yml`](workflows/ci.yml) | Continuous Integration | Push, PR |
| [`cd.yml`](workflows/cd.yml) | Continuous Deployment | Main branch, Release |
| [`security.yml`](workflows/security.yml) | Security Analysis | Push, PR, Daily |
| [`release.yml`](workflows/release.yml) | Semantic Release | Main branch |
| [`dependency-analysis.yml`](workflows/dependency-analysis.yml) | Dependency Management | Weekly |
| [`database-backup.yml`](workflows/database-backup.yml) | Database Backup | Daily |
| [`coverage.yml`](workflows/coverage.yml) | Code Coverage | Push, PR, Weekly |
| [`rollback.yml`](workflows/rollback.yml) | Emergency Rollback | Manual |
| [`setup-branch-protection.yml`](workflows/setup-branch-protection.yml) | Branch Rules Setup | Manual |

## Configuration Files

| File | Purpose |
|------|---------|
| [`dependabot.yml`](dependabot.yml) | Automated dependency updates |
| [`CODEOWNERS`](CODEOWNERS) | Code review assignments |

## Features

### 🔄 **Continuous Integration**
- Automated testing on every push/PR
- Code quality checks (ESLint, Prettier)
- TypeScript type checking
- Build verification
- Parallel job execution for speed

### 🚀 **Continuous Deployment**
- Automatic staging deployment from `develop`
- Production deployment from `main`
- Database migrations
- Smoke tests
- Rollback preparation

### 🔒 **Security First**
- CodeQL security analysis
- Dependency vulnerability scanning
- Secrets detection
- License compliance checking
- Daily security scans

### 📊 **Quality Metrics**
- Code coverage reporting
- Coverage trend analysis
- Quality gates enforcement
- Performance monitoring
- Comprehensive reporting

### 🛠️ **Maintenance Automation**
- Daily database backups
- Weekly dependency analysis
- Automated security updates
- Performance baselines
- Cleanup tasks

### 🚨 **Emergency Response**
- One-click rollback capability
- Emergency deployment bypass
- Incident documentation
- Team notifications
- Audit trails

## Usage Examples

### Creating a Feature
```bash
# Create feature branch
git checkout -b feature/new-payment-method

# Make changes and commit
git add .
git commit -m "feat: add PayPal payment integration"

# Push and create PR
git push -u origin feature/new-payment-method
# Create PR through GitHub UI
```

### Emergency Rollback
1. Go to **Actions** → **Emergency Rollback**
2. Click **Run workflow**
3. Select rollback target (previous release/specific commit/last known good)
4. Provide rollback reason
5. Execute workflow

### Viewing Reports
- **Coverage**: Check Codecov dashboard or workflow artifacts
- **Security**: Review Security tab and workflow artifacts
- **Dependencies**: Check weekly dependency analysis artifacts
- **Backups**: Review database backup workflow artifacts

## Branch Strategy

```
main ────────●─────────●─────────●
            /         /         /
develop ───●─────●───●─────●───●
          /     /         /
feature/x ────●         /
                       /
hotfix/y ─────────────●
```

- **`main`**: Production-ready code
- **`develop`**: Integration branch
- **`feature/*`**: New features
- **`hotfix/*`**: Emergency fixes
- **`agent/*`**: Agent-specific branches

## Quality Gates

### CI Pipeline
- ✅ All tests pass
- ✅ No linting errors
- ✅ TypeScript compiles
- ✅ Build succeeds
- ✅ Security scans pass

### Coverage Requirements
- **Overall**: ≥70% minimum
- **Critical paths**: ≥85% required
- **Trend**: No significant decreases

### Security Standards
- **Vulnerabilities**: 0 critical/high allowed
- **Secrets**: No exposed credentials
- **License**: Only approved licenses

## Monitoring

### Key Metrics
- **Build Success Rate**: Target >95%
- **Deployment Frequency**: Daily capability
- **Lead Time**: <1 hour commit to production
- **Recovery Time**: <15 minutes with rollback

### Dashboards
- **GitHub Actions**: Real-time pipeline status
- **Codecov**: Code coverage trends
- **Security Alerts**: Vulnerability notifications
- **Dependabot**: Dependency update status

## Notification Channels

Configure these for comprehensive monitoring:

### Slack Channels
- `#ci-cd`: General CI/CD notifications
- `#deployments`: Production deployment alerts  
- `#security-alerts`: Critical security issues
- `#emergencies`: Rollback and incident notifications

### GitHub Integrations
- **Pull Request checks**: Automated status updates
- **Security alerts**: Vulnerability notifications  
- **Dependabot**: Automated dependency PRs
- **Release notifications**: Automated release notes

## Troubleshooting

### Common CI Failures

**Build Failure**
```bash
# Check logs in GitHub Actions
# Common fixes:
npm install          # Dependency issues
npm run lint:fix     # Linting errors
npm run type-check   # TypeScript errors
```

**Test Failures**
```bash
# Run tests locally
npm test
npm run test:critical
npm run test:coverage
```

**Security Scan Issues**
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Check for secrets
git secrets --scan
```

### Deployment Issues

**Vercel Deployment Fails**
- Verify `VERCEL_TOKEN` is valid
- Check project configuration
- Review build logs in Vercel dashboard

**Database Migration Fails**
- Verify `DATABASE_URL` is correct
- Check migration files for errors
- Review database connectivity

### Getting Help

1. **Check Documentation**: [CI/CD_DOCUMENTATION.md](../CI_CD_DOCUMENTATION.md)
2. **Review Logs**: GitHub Actions workflow runs
3. **Create Issue**: Use repository issue tracker
4. **Contact Team**: Through configured notification channels

## Maintenance

### Weekly Checklist
- [ ] Review and merge Dependabot PRs
- [ ] Check pipeline success rates
- [ ] Review security alerts
- [ ] Monitor code coverage trends

### Monthly Tasks
- [ ] Rotate authentication tokens
- [ ] Review branch protection rules
- [ ] Update workflow dependencies
- [ ] Analyze performance metrics

## Contributing to CI/CD

### Making Changes
1. Create branch for CI/CD changes
2. Test workflows in your branch
3. Document changes thoroughly
4. Get review from DevOps team
5. Test in staging environment first

### Best Practices
- **Test First**: Always test workflow changes
- **Document Changes**: Update this README and documentation
- **Security Review**: Have security implications reviewed
- **Gradual Rollout**: Test changes in non-critical workflows first

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-XX | Initial CI/CD pipeline implementation |

## Support

For CI/CD pipeline issues:
- **Documentation**: [Complete CI/CD Guide](../CI_CD_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](../../issues)
- **Emergency**: Use configured emergency notification channels

---

**Pipeline Status**: [![CI](../../workflows/CI%20-%20Tests,%20Lint%20&%20Type%20Check/badge.svg)](../../actions/workflows/ci.yml) [![CD](../../workflows/CD%20-%20Deployment%20Pipeline/badge.svg)](../../actions/workflows/cd.yml) [![Security](../../workflows/Security%20Analysis%20(SAST)/badge.svg)](../../actions/workflows/security.yml)

*Automated with ❤️ for FacePay*