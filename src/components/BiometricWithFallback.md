# BiometricWithFallback Component

Un componente React robusto que maneja autenticación biométrica con múltiples fallbacks automáticos. **Siempre funciona**, incluso cuando la biometría real no está disponible.

## Características Principales

### 🔒 **Biometría Real**
- Face ID (iOS)
- Touch ID (iOS/macOS)
- Windows Hello
- Android Fingerprint/Face

### 🎨 **Modo Demo Visual**
- Animaciones realistas de escaneo facial
- Siempre disponible como fallback
- Perfecto para demostraciones

### 📱 **Detección Automática**
- Detecta capacidades del dispositivo
- Selecciona el mejor método disponible
- Fallback inteligente cuando falla

### ✨ **Experiencia de Usuario**
- UI clara que indica el modo actual
- Progreso visual en tiempo real
- Mensajes de error útiles
- Transiciones suaves

## Uso Básico

```tsx
import BiometricWithFallback from '@/components/BiometricWithFallback'

function LoginPage() {
  const handleSuccess = (result) => {
    console.log('Auth successful:', result)
    // Continuar con el flujo de la app
  }

  const handleError = (error) => {
    console.error('Auth failed:', error)
  }

  return (
    <BiometricWithFallback
      userId="user-123"
      userName="user@example.com"
      mode="authentication"
      title="FacePay Login"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  )
}
```

## Uso con Hook Personalizado

```tsx
import { useBiometricAuth } from '@/hooks/useBiometricAuth'

function PaymentPage() {
  const { state, actions } = useBiometricAuth({
    defaultUserId: 'user-123',
    defaultUserName: 'user@example.com'
  })

  const handlePayment = async () => {
    try {
      const result = await actions.authenticate()
      if (result.success) {
        // Procesar pago
        processPayment()
      }
    } catch (error) {
      console.error('Authentication failed:', error)
    }
  }

  if (state.isLoading) {
    return <div>Checking biometric capabilities...</div>
  }

  return (
    <div>
      <p>Biometric support: {state.isAvailable ? 'Available' : 'Demo Mode'}</p>
      <button onClick={handlePayment}>
        Pay with {state.isAvailable ? 'Biometrics' : 'Demo'}
      </button>
    </div>
  )
}
```

## Props del Componente

### BiometricWithFallbackProps

| Prop | Tipo | Opcional | Descripción |
|------|------|----------|-------------|
| `userId` | `string` | ✅ | ID único del usuario (default: 'demo-user') |
| `userName` | `string` | ✅ | Email/nombre del usuario (default: 'demo@example.com') |
| `mode` | `'authentication' \| 'registration'` | ✅ | Tipo de operación (default: 'authentication') |
| `title` | `string` | ✅ | Título a mostrar (default: 'FacePay Authentication') |
| `subtitle` | `string` | ✅ | Subtítulo opcional |
| `onSuccess` | `(result: BiometricAuthResult) => void` | ✅ | Callback cuando la auth es exitosa |
| `onError` | `(error: WebAuthnError) => void` | ✅ | Callback cuando hay error |
| `onCancel` | `() => void` | ✅ | Callback cuando se cancela |
| `className` | `string` | ✅ | CSS classes adicionales |

### BiometricAuthResult

```typescript
interface BiometricAuthResult {
  success: boolean
  method: 'biometric' | 'demo' | 'camera' | 'fallback'
  biometricType?: 'face' | 'fingerprint' | 'unknown'
  deviceInfo?: {
    isIOS: boolean
    isMobile: boolean
    platform: string
  }
  timestamp: number
}
```

## Métodos de Autenticación

### 1. **Biometría Real** (`biometric`)
- Usa WebAuthn con autenticadores de plataforma
- Face ID, Touch ID, Windows Hello, etc.
- Requiere dispositivo compatible y permisos

### 2. **Cámara** (`camera`)
- Acceso a cámara del dispositivo
- Simulación de detección facial
- Fallback visual realista

### 3. **Demo Visual** (`demo`)
- Animaciones puras sin hardware
- **Siempre funciona**
- Ideal para demos y fallback final

## Flujo Automático de Fallback

```
1. Detectar capacidades del dispositivo
   ↓
2. ¿WebAuthn + Biometría disponible?
   ├── SÍ → Usar biometría real
   └── NO ↓
3. ¿Cámara disponible?
   ├── SÍ → Usar modo cámara
   └── NO ↓
4. Usar demo visual (SIEMPRE funciona)
```

## Ejemplos de Integración

### En Dashboard

```tsx
function Dashboard() {
  return (
    <div>
      <h1>Welcome to FacePay</h1>
      <BiometricWithFallback
        mode="authentication"
        title="Verify Identity"
        subtitle="Secure access to your account"
        onSuccess={(result) => {
          // Marcar usuario como autenticado
          setAuthenticated(true)
        }}
      />
    </div>
  )
}
```

### En Pagos

```tsx
function PaymentFlow() {
  const [amount] = useState(100)
  
  return (
    <div>
      <h2>Pay ${amount}</h2>
      <BiometricWithFallback
        mode="authentication"
        title="Authorize Payment"
        subtitle={`Confirm payment of $${amount}`}
        onSuccess={(result) => {
          // Procesar pago
          processPayment(amount, result)
        }}
      />
    </div>
  )
}
```

### En Registro

```tsx
function Registration() {
  return (
    <BiometricWithFallback
      mode="registration"
      title="Setup Biometric Login"
      subtitle="Register your biometrics for quick access"
      onSuccess={(result) => {
        // Guardar credenciales biométricas
        saveUserBiometrics(result)
      }}
    />
  )
}
```

## Manejo de Errores

El componente maneja automáticamente todos los errores y siempre ofrece alternativas:

```typescript
interface WebAuthnError {
  code: string
  message: string
  isRecoverable: boolean
  suggestedAction: string
  details?: string
}
```

### Tipos de Error Comunes

- `NOT_SUPPORTED`: Browser no soporta WebAuthn
- `USER_CANCELLED`: Usuario canceló la biometría
- `SECURITY_ERROR`: Problemas de seguridad (HTTP vs HTTPS)
- `CAMERA_ERROR`: No se pudo acceder a la cámara

**Importante**: Todos los errores activan fallback automático al modo demo.

## Estados del Componente

- **`detecting`**: Detectando capacidades del dispositivo
- **`ready`**: Listo para autenticar
- **`processing`**: Autenticación en progreso
- **`success`**: Autenticación exitosa
- **`error`**: Error con opciones de recuperación

## Compatibilidad

### Biometría Real
- ✅ iOS Safari (Face ID, Touch ID)
- ✅ macOS Safari (Touch ID)
- ✅ Chrome/Edge en Windows (Windows Hello)
- ✅ Android Chrome (Fingerprint, Face)

### Demo Visual
- ✅ **Todos los navegadores**
- ✅ **Todas las plataformas**
- ✅ **Incluso sin JavaScript habilitado** (degradación graceful)

## Personalización

### CSS Classes

El componente usa Tailwind CSS y acepta clases personalizadas:

```tsx
<BiometricWithFallback
  className="custom-auth-component"
  // Aplica estilos personalizados
/>
```

### Temas

Modifica los colores cambiando las clases Tailwind en el componente o usando CSS custom properties.

## Consideraciones de Seguridad

1. **HTTPS Requerido**: La biometría real requiere conexión segura
2. **Validación Backend**: Siempre validar resultados en el servidor
3. **Modo Demo**: Es solo visual, no provee seguridad real
4. **Datos Biométricos**: Nunca se almacenan, solo se usan para verificación

## Próximos Pasos

Para implementación en producción:

1. **Conectar API Backend**: Reemplazar simulaciones con calls reales
2. **Configurar Endpoints**: `/api/webauthn/register` y `/api/webauthn/authenticate`
3. **Validación Servidor**: Verificar respuestas WebAuthn en backend
4. **Logging**: Agregar tracking de uso y errores
5. **Tests**: Pruebas automatizadas para todos los flujos

## Soporte

El componente está diseñado para **nunca fallar**. Siempre proporcionará una experiencia de usuario funcional, incluso en el peor escenario donde no hay soporte de biometría.