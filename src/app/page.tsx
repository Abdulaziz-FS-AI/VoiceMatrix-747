'use client';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PricingSection from "@/components/landing/PricingSection";

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const router = useRouter();

  const featureSlides = [
    {
      title: "Intelligent Call Handling",
      description: "Our AI receptionist handles complex conversations, understands context, and maintains natural dialogue flow just like your best human receptionist.",
      icon: "🤖"
    },
    {
      title: "Instant Customer Support", 
      description: "Provide immediate assistance to callers 24/7. Answer questions, schedule appointments, and resolve issues without any wait time.",
      icon: "⚡"
    },
    {
      title: "Seamless Integration",
      description: "Integrate seamlessly with your existing business tools, CRM systems, and workflows. No disruption to your current processes.",
      icon: "🔗"
    }
  ];

  const testimonials = [
    {
      company: "TechCorp Inc.",
      quote: "Voice Matrix increased our lead capture by 340% in just 3 months.",
      logo: "🏢"
    },
    {
      company: "HealthCare Plus",
      quote: "Never missed an appointment booking since implementing Voice Matrix.",
      logo: "🏥"
    },
    {
      company: "Legal Associates",
      quote: "Our clients love the professional, responsive service 24/7.",
      logo: "⚖️"
    }
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featureSlides.length);
    }, 4000);

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      clearInterval(slideInterval);
      clearInterval(testimonialInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Navigation */}
      <nav className="border-b border-border-subtle bg-bg-dark/90 backdrop-blur-sm sticky top-0 z-50 slide-in-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/voice-matrix-logo.png"
                alt="Voice Matrix"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-h3 font-bold text-text-primary">Voice Matrix</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-text-secondary hover:text-text-primary micro-transition">Features</a>
              <a href="#pricing" className="text-text-secondary hover:text-text-primary micro-transition">Pricing</a>
              <a href="#contact" className="text-text-secondary hover:text-text-primary micro-transition">Contact</a>
              <button 
                onClick={() => router.push('/auth/signin')}
                className="btn-secondary"
              >
                Sign In
              </button>
              <a 
                href="#pricing"
                className="btn-primary"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-32dp px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-text-primary mb-6 leading-tight fade-in-up">
              Transform Your Communications with{" "}
              <span className="text-transparent bg-gradient-to-r from-primary-blue to-accent-teal bg-clip-text">
                Intelligent Voice AI
              </span>
            </h1>
            <p className="text-body-large text-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed fade-in-up-delay">
              Experience seamless call management with AI-powered voice automation. Handle unlimited calls, 
              capture every lead, and provide instant customer support while you focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16 fade-in-up-delay-2">
              <a 
                href="#pricing"
                className="btn-primary text-lg px-8 py-4 w-full sm:w-auto pulse-glow"
              >
                📞 Get Started Today
              </a>
              <button className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                🎥 Watch Demo
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 text-text-secondary fade-in-up-delay-2">
              <div className="flex items-center space-x-2">
                <span className="text-warning-yellow">⭐</span>
                <span className="text-sm">99.9% Uptime</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>👥</span>
                <span className="text-sm">10,000+ Businesses</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success-green">✅</span>
                <span className="text-sm">SOC2 Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Slideshow Section */}
      <section id="features" className="py-32dp px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-bg-surface via-bg-dark/50 to-bg-dark relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-blue/5 via-transparent to-accent-teal/5 pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-blue/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-teal/10 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 slide-in-left">
            <span className="text-label text-accent-teal mb-4 block font-semibold tracking-wider">INTELLIGENT FEATURES</span>
            <h2 className="mb-6 text-h1 bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text text-transparent">
              Everything you need for perfect customer service
            </h2>
          </div>

          {/* Feature Slideshow */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="slideshow-container min-h-[400px] flex items-center justify-center">
              {featureSlides.map((slide, index) => (
                <div 
                  key={index}
                  className={`slide text-center px-8 ${
                    index === currentSlide ? 'active' : ''
                  }`}
                >
                  <div className="bg-gradient-to-br from-primary-blue/20 to-accent-teal/20 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-10 text-5xl shadow-2xl backdrop-blur-sm border border-primary-blue/20 transform hover:scale-110 transition-transform">
                    {slide.icon}
                  </div>
                  <h3 className="text-h1 mb-8 bg-gradient-to-r from-text-primary via-primary-blue to-accent-teal bg-clip-text text-transparent font-bold">
                    {slide.title}
                  </h3>
                  <p className="text-xl text-text-primary/90 leading-relaxed max-w-3xl mx-auto font-light">
                    {slide.description}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Slideshow Navigation */}
            <div className="slideshow-dots">
              {featureSlides.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 slide-in-right">
            {/* Feature 1 */}
            <div className="group card hover:border-primary-blue/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-primary-blue/20 to-purple-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                🤖
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text text-transparent font-semibold">
                Natural Conversations
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Advanced AI that understands context, handles interruptions, and maintains 
                natural conversation flow just like a human receptionist.
              </p>
              <a href="#" className="text-primary-blue hover:text-accent-teal micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Feature 2 */}
            <div className="group card hover:border-accent-teal/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-accent-teal/20 to-green-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                🕐
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-accent-teal bg-clip-text text-transparent font-semibold">
                24/7 Availability
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Never miss a call again. Your AI receptionist works around the clock, 
                handling calls during holidays, nights, and weekends.
              </p>
              <a href="#" className="text-accent-teal hover:text-teal-400 micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Feature 3 */}
            <div className="group card hover:border-accent-pink/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-accent-pink/20 to-purple-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                ⚡
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-accent-pink bg-clip-text text-transparent font-semibold">
                Instant Setup
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Get started in minutes. Upload your business info, customize responses, 
                and your AI receptionist is ready to take calls.
              </p>
              <a href="#" className="text-accent-pink hover:text-pink-400 micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Feature 4 */}
            <div className="group card hover:border-success-green/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-success-green/20 to-emerald-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                🎯
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-success-green bg-clip-text text-transparent font-semibold">
                Lead Capture
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Automatically collect caller information, qualify leads, and route them 
                to your CRM or sales team for immediate follow-up.
              </p>
              <a href="#" className="text-success-green hover:text-green-400 micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Feature 5 */}
            <div className="group card hover:border-warning-yellow/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-warning-yellow/20 to-orange-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                🔀
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-warning-yellow bg-clip-text text-transparent font-semibold">
                Smart Routing
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Intelligently transfer calls to the right person or department based 
                on caller intent and your business rules.
              </p>
              <a href="#" className="text-warning-yellow hover:text-yellow-300 micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            {/* Feature 6 */}
            <div className="group card hover:border-indigo-light/50 emphasis-transition bg-gradient-to-br from-bg-surface/80 to-bg-dark/80 backdrop-blur-sm hover:scale-105 hover:shadow-2xl border-bg-dark/20">
              <div className="bg-gradient-to-br from-indigo-light/20 to-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform shadow-lg">
                🎤
              </div>
              <h3 className="mb-4 text-h3 bg-gradient-to-r from-text-primary to-indigo-light bg-clip-text text-transparent font-semibold">
                Custom Voice
              </h3>
              <p className="text-text-primary/80 mb-6 leading-relaxed">
                Choose from professional voices or clone your own. Your AI receptionist 
                will sound exactly how you want to represent your brand.
              </p>
              <a href="#" className="text-indigo-light hover:text-indigo-300 micro-transition flex items-center font-medium group">
                Learn more <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonials Section */}
      <section className="py-32dp px-4 sm:px-6 lg:px-8 bg-bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 fade-in-up">
            <span className="text-label text-accent-pink mb-4 block">TRUSTED BY LEADERS</span>
            <h2 className="mb-6">See why 10,000+ businesses choose Voice Matrix</h2>
          </div>
          
          <div className="slideshow-container min-h-[200px] flex items-center justify-center">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className={`slide text-center px-8 ${
                  index === currentTestimonial ? 'active' : ''
                }`}
              >
                <div className="max-w-3xl mx-auto">
                  <div className="text-6xl mb-6">{testimonial.logo}</div>
                  <blockquote className="text-h3 text-text-primary mb-6 italic font-light">
                    "{testimonial.quote}"
                  </blockquote>
                  <cite className="text-body text-accent-teal font-semibold">
                    {testimonial.company}
                  </cite>
                </div>
              </div>
            ))}
          </div>
          
          <div className="slideshow-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32dp px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center fade-in-up">
          <h2 className="mb-6">Ready to Transform Your Business?</h2>
          <p className="text-body-large text-text-secondary mb-12 max-w-2xl mx-auto">
            Join thousands of businesses already using Voice Matrix to capture more leads, 
            improve customer service, and never miss another important call.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="#pricing"
              className="btn-primary text-lg px-8 py-4 pulse-glow"
            >
              📞 Choose Your Plan
            </a>
            <button className="btn-secondary text-lg px-8 py-4">
              📅 Schedule Demo
            </button>
          </div>
          <p className="text-sm text-text-disabled mt-6">
            7-day free trial included • Cancel anytime • Setup in under 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-bg-surface py-16dp px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto slide-in-left">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-8 md:mb-0">
              <Image
                src="/voice-matrix-logo.png"
                alt="Voice Matrix"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="font-semibold text-text-primary">Voice Matrix</span>
            </div>
            <div className="flex space-x-8 text-text-secondary">
              <a href="#" className="hover:text-text-primary micro-transition">Privacy</a>
              <a href="#" className="hover:text-text-primary micro-transition">Terms</a>
              <a href="#" className="hover:text-text-primary micro-transition">Support</a>
            </div>
          </div>
          <div className="border-t border-border-subtle mt-8 pt-8 text-center text-text-disabled">
            <p>&copy; 2025 Voice Matrix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}