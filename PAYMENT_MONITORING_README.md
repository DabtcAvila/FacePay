# Payment Monitoring System

Sistema completo de monitoreo y alertas en tiempo real para transacciones de pago en FacePay.

## Características Principales

### 🔍 Monitoreo en Tiempo Real
- Tasa de éxito/fallo de transacciones
- Volumen de transacciones
- Tiempos de respuesta
- Detección de patrones sospechosos

### 🚨 Alertas Automáticas
- Tasa de fallo > 10%
- Transacciones > $10,000
- Múltiples fallos del mismo usuario
- Picos de volumen anormales
- Tiempos de respuesta lentos

### 🤖 Detección de Anomalías
- ML básico para detectar patrones inusuales
- Análisis de montos de transacción
- Patrones de tiempo sospechosos
- Detección de usuarios con alta actividad

### 📊 Dashboard y Métricas
- Interface web para visualización
- APIs REST para integración
- WebSocket para actualizaciones en tiempo real

## Arquitectura

```
src/
├── services/
│   └── payment-monitoring.ts       # Servicio principal de monitoreo
├── hooks/
│   └── usePaymentMonitoring.ts     # Hook React para frontend
├── components/
│   └── PaymentMonitoringDashboard.tsx  # Dashboard UI
├── app/api/monitoring/
│   ├── metrics/route.ts            # API de métricas
│   ├── alerts/route.ts             # API de alertas
│   ├── anomalies/route.ts          # API de detección de anomalías
│   ├── realtime/route.ts           # API de tiempo real
│   └── test/route.ts               # API de pruebas
├── app/admin/monitoring/
│   └── page.tsx                    # Página del dashboard
└── lib/
    └── websocket-server.ts         # Servidor WebSocket
```

## Uso del Sistema

### 1. Rastrear Transacciones

```typescript
import { paymentMonitor } from '@/services/payment-monitoring';

// Rastrear una transacción exitosa
await paymentMonitor.trackTransaction({
  id: 'tx_12345',
  userId: 'user_123',
  amount: 100.50,
  currency: 'USD',
  status: 'completed',
  paymentMethod: 'stripe',
  timestamp: new Date(),
  responseTime: 1200
});

// Rastrear una transacción fallida
await paymentMonitor.trackTransaction({
  id: 'tx_12346',
  userId: 'user_124',
  amount: 250.00,
  currency: 'USD',
  status: 'failed',
  paymentMethod: 'paypal',
  timestamp: new Date(),
  errorCode: 'insufficient_funds',
  errorMessage: 'Insufficient funds in account'
});
```

### 2. Obtener Métricas

```typescript
// Obtener métricas de las últimas 24 horas
const metrics = await paymentMonitor.getMetrics('24h');

console.log(metrics);
// {
//   period: '24h',
//   totalTransactions: 1542,
//   successfulTransactions: 1465,
//   failedTransactions: 77,
//   successRate: 95.01,
//   failureRate: 4.99,
//   totalVolume: 124500.00,
//   averageAmount: 80.77,
//   averageResponseTime: 1850,
//   topFailureReasons: [...]
// }
```

### 3. Gestionar Alertas

```typescript
// Obtener alertas activas
const alerts = paymentMonitor.getActiveAlerts();

// Reconocer una alerta
const success = paymentMonitor.acknowledgeAlert('alert_id');
```

### 4. Detección de Anomalías

```typescript
// Ejecutar detección de anomalías
const anomalies = await paymentMonitor.detectAnomalies();

if (anomalies.isAnomaly) {
  console.log(`Anomalía detectada con ${anomalies.confidence * 100}% de confianza:`);
  console.log(anomalies.reasons);
}
```

### 5. Usar el Hook React

```tsx
import { usePaymentMonitoring } from '@/hooks/usePaymentMonitoring';

function MonitoringComponent() {
  const {
    metrics,
    alerts,
    anomalies,
    loading,
    errors,
    acknowledgeAlert,
    refreshMetrics
  } = usePaymentMonitoring({
    autoRefresh: true,
    refreshInterval: 30000,
    realtime: true
  });

  return (
    <div>
      {metrics && (
        <div>
          <h2>Métricas</h2>
          <p>Tasa de éxito: {metrics.successRate}%</p>
          <p>Total de transacciones: {metrics.totalTransactions}</p>
        </div>
      )}
      
      {alerts.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.message}</p>
          <button onClick={() => acknowledgeAlert(alert.id)}>
            Reconocer
          </button>
        </div>
      ))}
    </div>
  );
}
```

## APIs REST

### Métricas
- `GET /api/monitoring/metrics?period=24h` - Obtener métricas
- `POST /api/monitoring/metrics` - Rastrear transacción

### Alertas
- `GET /api/monitoring/alerts?active=true` - Obtener alertas
- `POST /api/monitoring/alerts` - Gestionar alertas

### Anomalías
- `GET /api/monitoring/anomalies` - Detectar anomalías
- `POST /api/monitoring/anomalies` - Ejecutar detección

### Tiempo Real
- `GET /api/monitoring/realtime` - Info de eventos en tiempo real
- `POST /api/monitoring/realtime` - Suscribirse a eventos

### Testing
- `GET /api/monitoring/test` - Info de API de pruebas
- `POST /api/monitoring/test` - Generar datos de prueba

## Configuración de Umbrales

```typescript
const customConfig = {
  failureRateThreshold: 15,      // 15% en lugar de 10%
  largeTransactionThreshold: 5000, // $5,000 en lugar de $10,000
  multipleFailuresThreshold: 5,   // 5 fallos en lugar de 3
  volumeSpikeThreshold: 300,      // 300% en lugar de 200%
  responseTimeThreshold: 3000,    // 3s en lugar de 5s
  monitoringWindowMinutes: 30,    // 30 min en lugar de 15
  alertCooldownMinutes: 10        // 10 min en lugar de 5
};

const customMonitor = new PaymentMonitoringService(customConfig);
```

## Eventos WebSocket

El sistema emite los siguientes eventos en tiempo real:

```typescript
// Transacción rastreada
{
  type: 'transaction_update',
  data: TransactionData,
  timestamp: '2024-01-15T10:30:00.000Z'
}

// Alerta creada
{
  type: 'alert_created',
  data: AlertData,
  timestamp: '2024-01-15T10:30:00.000Z'
}

// Métricas actualizadas
{
  type: 'metrics_update',
  data: MetricsData,
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## Pruebas del Sistema

Para probar el sistema, use la API de pruebas:

```bash
# Generar 20 transacciones exitosas
curl -X POST http://localhost:3000/api/monitoring/test \
  -H "Content-Type: application/json" \
  -d '{"type": "success", "count": 20}'

# Generar 5 transacciones fallidas
curl -X POST http://localhost:3000/api/monitoring/test \
  -H "Content-Type: application/json" \
  -d '{"type": "failures", "count": 5}'

# Generar 3 transacciones grandes (>$10K)
curl -X POST http://localhost:3000/api/monitoring/test \
  -H "Content-Type: application/json" \
  -d '{"type": "large", "count": 3}'

# Generar 50 transacciones rápidas (puede activar alertas)
curl -X POST http://localhost:3000/api/monitoring/test \
  -H "Content-Type: application/json" \
  -d '{"type": "rapid", "count": 50}'
```

## Dashboard de Administración

Acceda al dashboard completo en: `/admin/monitoring`

El dashboard incluye:
- Métricas en tiempo real
- Alertas activas
- Detección de anomalías
- Gráficos de tendencias
- Controles de reconocimiento de alertas

## Integración Automática

El sistema se integra automáticamente con el `PaymentService` existente:

- Todas las transacciones exitosas se rastrean automáticamente
- Todas las transacciones fallidas se rastrean con códigos de error
- Los webhooks de Stripe activan el monitoreo automáticamente

## Características Avanzadas

### Limpieza Automática de Datos
- Los datos de transacciones se mantienen por 24 horas
- Los datos de volumen por hora se mantienen por 24 horas  
- Las alertas reconocidas se mantienen por 7 días

### Verificaciones Periódicas
- Verificación de umbrales cada 2 minutos
- Actualización de métricas cada 5 minutos
- Limpieza de datos cada hora

### Prevención de Spam de Alertas
- Cooldown de 5 minutos entre alertas similares
- Las alertas reconocidas no se duplican

## Próximas Mejoras

- [ ] Integración con servicios de notificación externos (email, SMS, Slack)
- [ ] Dashboard más avanzado con gráficos interactivos
- [ ] Configuración de umbrales por usuario/admin
- [ ] Exportación de reportes en PDF/CSV
- [ ] Integración con sistemas de logging externos
- [ ] Mejoras en ML para detección de fraude
- [ ] Soporte para múltiples monedas en alertas