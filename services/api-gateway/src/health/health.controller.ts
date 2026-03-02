import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ROUTE_CONFIGS } from '../proxy/routes.config';

interface ServiceHealth {
  serviceName: string;
  target: string;
  status: 'up' | 'down';
  responseTimeMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  gateway: string;
  services: ServiceHealth[];
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger('HealthController');

  @Get()
  @ApiOperation({ summary: 'Check gateway and downstream service health' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async checkHealth(): Promise<HealthResponse> {
    // Deduplicate targets (some services share the same target)
    const uniqueTargets = new Map<string, string>();
    for (const route of ROUTE_CONFIGS) {
      if (!uniqueTargets.has(route.target)) {
        uniqueTargets.set(route.target, route.serviceName);
      }
    }

    const checks: Promise<ServiceHealth>[] = [];

    for (const [target, serviceName] of uniqueTargets) {
      checks.push(this.checkService(serviceName, target));
    }

    const services = await Promise.all(checks);

    const allUp = services.every((s) => s.status === 'up');
    const allDown = services.every((s) => s.status === 'down');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allUp) {
      status = 'healthy';
    } else if (allDown) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      gateway: 'up',
      services,
    };
  }

  private async checkService(
    serviceName: string,
    target: string,
  ): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${target}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTimeMs = Date.now() - start;

      if (response.ok) {
        return { serviceName, target, status: 'up', responseTimeMs };
      }

      return {
        serviceName,
        target,
        status: 'down',
        responseTimeMs,
        error: `HTTP ${response.status}`,
      };
    } catch (err) {
      const responseTimeMs = Date.now() - start;
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Health check failed for ${serviceName} (${target}): ${error}`);
      return { serviceName, target, status: 'down', responseTimeMs, error };
    }
  }
}
