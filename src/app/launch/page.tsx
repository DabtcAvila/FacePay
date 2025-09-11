'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Zap, Shield, Users, TrendingUp, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'

export default function LaunchPage() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, save to database
    localStorage.setItem('facepay_waitlist', email)
    setJoined(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Lanzando el PIX de México 🇲🇽
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Pagos con tu <span className="text-blue-600">Cara</span>
            <br />
            <span className="text-3xl md:text-5xl">0% Comisión. Para Siempre.</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Los bancos te cobran 3.5% por mover TU dinero.
            <br />
            <strong>Nosotros: $0.00</strong> Tu cara es tu cuenta bancaria.
          </p>

          {!joined ? (
            <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700">
                Acceso Anticipado <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          ) : (
            <Card className="max-w-md mx-auto p-6 bg-green-50 border-green-200">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">¡Estás Dentro!</h3>
              <p className="text-green-700">
                Eres de los primeros 100. Tendrás acceso VIP cuando lancemos.
                <br />
                <strong>Bonus: Premium gratis de por vida 🎁</strong>
              </p>
            </Card>
          )}

          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>127 en lista de espera</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>$0 inversión inicial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            La Verdad Sobre las Comisiones 😤
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 border-red-200 bg-red-50">
              <h3 className="text-xl font-semibold text-red-800 mb-4">
                Bancos/MercadoPago 👎
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>3.5% + IVA por transacción</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>María (tamalera) pierde $6,387/año</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Transferencias tardan 1-3 días</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>Necesitas cuenta bancaria + papeles</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 border-green-200 bg-green-50">
              <h3 className="text-xl font-semibold text-green-800 mb-4">
                FacePay 🚀
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span><strong>0% comisión</strong> para siempre</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>María ahorra $6,387/año</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Instantáneo (3 segundos)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Tu cara = tu cuenta (sin papeles)</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Cómo Funciona (Es Mágico ✨)
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Regístrate con tu Cara</h3>
              <p className="text-gray-600">
                10 segundos. Sin papeles. Sin filas. Tu Face ID es tu cuenta.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Carga Una Vez</h3>
              <p className="text-gray-600">
                Carga $500 (pagas 3% SOLO esta vez). Después TODO es gratis.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Paga con tu Cara</h3>
              <p className="text-gray-600">
                Mira la cámara. Pago instantáneo. 0% comisión. Para siempre.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Lo Que Dicen los Early Adopters
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-3">
                "Vendía tamales y perdía $500/mes en comisiones. Con FacePay ahorro TODO. Es un milagro."
              </p>
              <p className="text-sm text-gray-500">— María G., CDMX</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-3">
                "Envío dinero a mi mamá en Oaxaca. Antes: $25 USD fee. Ahora: $0. Increíble."
              </p>
              <p className="text-sm text-gray-500">— Juan P., Los Angeles</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-3">
                "Mi abuela de 75 años lo usa. Solo mira la cámara y paga. Más fácil imposible."
              </p>
              <p className="text-sm text-gray-500">— Ana L., Guadalajara</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sé Parte de la Revolución Financiera 🚀
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Los primeros 1,000 usuarios = Premium GRATIS de por vida
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Empieza Ahora (es gratis)
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Ver Demo en Vivo
              </Button>
            </Link>
          </div>
          
          <p className="mt-8 text-sm opacity-75">
            No pedimos tarjeta de crédito · No spam · 100% mexicano 🇲🇽
          </p>
        </div>
      </div>
    </div>
  )
}