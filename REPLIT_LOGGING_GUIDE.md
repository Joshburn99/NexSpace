# Viewing Logs in Replit - NexSpace Healthcare Platform

## Overview
NexSpace uses structured logging with [pino](https://github.com/pinojs/pino) for comprehensive request tracking, error handling, and system monitoring. This guide explains how to view and analyze logs in the Replit environment.

## Log Levels
- **error** (50): Critical errors that require immediate attention
- **warn** (40): Warnings and potential issues
- **info** (30): General application information and request/response logs
- **debug** (20): Detailed debugging information
- **trace** (10): Very detailed trace information

Set the log level using the `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug
```

## Viewing Logs in Replit

### 1. Console Tab
The primary way to view logs in Replit is through the **Console** tab:

1. **Open Console**: Click the "Console" tab in the bottom panel of your Replit workspace
2. **Live Logs**: All server logs appear in real-time with structured formatting
3. **Scroll History**: Use scroll to view historical log entries
4. **Search**: Use Ctrl+F (Cmd+F on Mac) to search through log output

### 2. Workflow Logs
View detailed application logs through the workflow system:

1. **Click Workflow Tab**: Navigate to the workflow panel
2. **Select "Start application"**: Click on the running workflow
3. **View Output**: See all server output including startup messages and request logs

### 3. Shell Commands
Access logs directly from the shell:

```bash
# View recent logs (if using file logging)
tail -f /tmp/nexspace.log

# Search for specific patterns
grep "ERROR" /tmp/nexspace.log

# View logs with specific request ID
grep "req_abc123" /tmp/nexspace.log
```

## Log Structure and Request Tracing

### Request ID Correlation
Every request gets a unique `requestId` for end-to-end tracing:

```json
{
  "level": 30,
  "time": 1692735600000,
  "pid": 1234,
  "hostname": "replit-server",
  "name": "nexspace-server",
  "requestId": "req_1692735600000_abc123",
  "method": "POST",
  "url": "/api/facilities",
  "msg": "Request received"
}
```

### Error Tracking
Errors include full stack traces with request correlation:

```json
{
  "level": 50,
  "time": 1692735600000,
  "requestId": "req_1692735600000_abc123",
  "err": {
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ...",
    "name": "DatabaseError"
  },
  "msg": "Request error occurred"
}
```

## Health Check Monitoring

### Basic Health Check
Check application status:
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "ok": true,
  "version": "1.0.0",
  "timestamp": "2025-08-12T19:20:00.000Z",
  "environment": "development",
  "uptime": 3600
}
```

### Detailed Health Check
Get comprehensive system status:
```bash
curl http://localhost:5000/health/detailed
```

Response includes:
- Database connectivity status
- Memory usage metrics
- Environment variable validation
- External API configuration status
- Response time measurements

### Health Endpoints
- `GET /health` - Basic health status
- `GET /health/detailed` - Comprehensive system check
- `GET /health/ready` - Readiness probe for deployment
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - System metrics for monitoring

## Log Categories and Components

### Request Logs
Track all HTTP requests with structured data:
- Request method, URL, headers
- User authentication context
- Response status codes and timing
- Request/response body sizes

### Database Logs
Monitor database operations:
- SQL query execution with parameters
- Connection pool status
- Query performance metrics
- Error tracking with rollback information

### External API Logs
Track third-party integrations:
- CMS API calls for facility data
- NPI Registry lookups
- SendGrid email notifications
- Google Calendar synchronization
- Webhook deliveries

### Application Events
Monitor system lifecycle:
- Server startup and shutdown
- Configuration validation
- Background job processing
- Error recovery attempts

## Debugging Techniques

### Find All Requests for a User
```bash
# In Replit Console, search for:
"userId\":123
```

### Track Request Flow
```bash
# Search for specific request ID:
req_1692735600000_abc123
```

### Monitor Performance
```bash
# Look for slow requests:
"Slow request detected"
```

### Database Issues
```bash
# Search for database errors:
"Database query"
"connection failed"
```

## Production Monitoring

### Log Aggregation
For production deployments, consider:
- **Structured JSON output** for log aggregation tools
- **Error alerts** based on log levels
- **Performance monitoring** from response time logs
- **Security monitoring** from authentication logs

### Key Metrics to Monitor
1. **Error Rate**: Count of 5xx responses
2. **Response Time**: 95th percentile request duration
3. **Database Health**: Connection pool status
4. **External API Failures**: Third-party service errors
5. **Authentication Failures**: Failed login attempts

## Environment Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=info
```
- Pretty-printed logs with colors
- Full stack traces in responses
- Detailed request/response logging

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
```
- JSON-structured logs for aggregation
- Error details hidden from responses
- Performance-optimized logging

## Troubleshooting Common Issues

### Server Won't Start
1. Check console for startup errors
2. Verify environment variables in health check
3. Look for database connection failures
4. Check port binding conflicts

### Database Connection Issues
1. Check `/health/detailed` endpoint
2. Look for "Database query" error logs
3. Verify DATABASE_URL environment variable
4. Check connection pool exhaustion

### External API Failures
1. Monitor API client request logs
2. Check retry attempts and backoff
3. Verify API key configuration
4. Look for rate limiting responses

### Performance Issues
1. Watch for "Slow request detected" warnings
2. Monitor memory usage in health metrics
3. Check database query performance
4. Analyze request concurrency patterns

## Log Retention and Cleanup

In Replit development:
- Logs are stored in memory and cleared on restart
- Use browser dev tools for client-side logging
- Download logs before major changes if needed
- Consider external log aggregation for long-term storage

## Security Considerations

### Sensitive Data Handling
- API keys are automatically redacted as `[REDACTED]`
- Password fields are never logged
- PII is filtered from request logs
- Stack traces exclude sensitive environment details

### Access Control
- Log viewing requires shell access to Replit
- Production logs should use secure aggregation
- Implement log-based alerting for security events
- Monitor authentication failures and brute force attempts

This comprehensive logging system ensures full visibility into your NexSpace healthcare platform while maintaining security and performance standards.